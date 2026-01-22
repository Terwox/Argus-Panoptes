#!/usr/bin/env node
/**
 * Argus Hook Script
 *
 * Intercepts Claude Code hook events and forwards them to the Argus server.
 * Installed as a hook in ~/.claude/settings.json
 *
 * Receives JSON on stdin, POSTs to http://localhost:4242/events
 */

import { createHash } from 'crypto';
import { readFileSync, existsSync, appendFileSync } from 'fs';
import { basename, join } from 'path';

// Debug log file
const DEBUG_LOG = 'd:/git/Argus-Panoptes/hook-debug.log';

const ARGUS_PORT = process.env.ARGUS_PORT || 4242;
const ARGUS_URL = `http://localhost:${ARGUS_PORT}/events`;

// Read JSON from stdin
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Generate project ID from path
function projectId(path) {
  return createHash('sha256').update(path).digest('hex').slice(0, 12);
}

// Extract project name from path
function projectName(path) {
  return basename(path);
}

// Try to extract task from subagent transcript (first user message)
function extractTaskFromTranscript(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return undefined;

  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Look for the first user message which contains the task
    for (const line of lines.slice(0, 5)) { // Check first 5 lines
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'user' && entry.message?.content) {
          // Extract first ~100 chars of the task
          const task = entry.message.content.slice(0, 100);
          return task.length < entry.message.content.length ? task + '...' : task;
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return undefined;
}

// Try to read .omc state for richer context
function readOmcState(cwd) {
  const state = {};

  try {
    const ralphPath = join(cwd, '.omc', 'ralph-state.json');
    if (existsSync(ralphPath)) {
      const ralph = JSON.parse(readFileSync(ralphPath, 'utf8'));
      if (ralph.active) {
        state.ralphIteration = ralph.iteration;
        state.ralphMaxIterations = ralph.max_iterations;
        state.originalTask = ralph.original_prompt;
      }
    }
  } catch (e) {
    // Ignore errors reading state
  }

  try {
    const ultraworkPath = join(cwd, '.omc', 'ultrawork-state.json');
    if (existsSync(ultraworkPath)) {
      const ultrawork = JSON.parse(readFileSync(ultraworkPath, 'utf8'));
      if (ultrawork.active) {
        state.ultraworkActive = true;
      }
    }
  } catch (e) {
    // Ignore errors reading state
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

// Map Claude Code hook to Argus event
function mapHookToEvent(hookPayload) {
  // Debug: log the full payload for subagent events to a file
  if (hookPayload.hook_event_name?.includes('Subagent')) {
    try {
      const debugLine = `[${new Date().toISOString()}] ${hookPayload.hook_event_name}: ${JSON.stringify(hookPayload, null, 2)}\n\n`;
      appendFileSync(DEBUG_LOG, debugLine);
    } catch (e) {
      // Ignore write errors
    }
  }

  const {
    session_id,
    cwd,
    hook_event_name,
    message,
    notification_type,
    source,
    // Subagent fields (actual names from Claude Code)
    agent_id,
    agent_type,
    agent_transcript_path,
    // Legacy names (keep for backwards compatibility)
    subagent_type,
    subagent_prompt,
  } = hookPayload;

  const base = {
    timestamp: Date.now(),
    sessionId: session_id,
    projectPath: cwd,
    projectName: projectName(cwd),
  };

  // Read optional .omc state
  const omcState = readOmcState(cwd);
  if (omcState) {
    base.metadata = { ...base.metadata, ...omcState };
  }

  switch (hook_event_name) {
    case 'SessionStart':
      return {
        ...base,
        type: 'session_start',
        metadata: { ...base.metadata, source },
      };

    case 'SessionEnd':
      return {
        ...base,
        type: 'session_end',
      };

    case 'Notification':
      // Only care about idle_prompt (blocked state)
      if (notification_type === 'idle_prompt') {
        return {
          ...base,
          type: 'agent_blocked',
          question: message,
        };
      }
      // Other notifications = activity
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, notification_type, message },
      };

    case 'UserPromptSubmit':
      return {
        ...base,
        type: 'agent_unblocked',
      };

    case 'Stop':
      // Could be completion or just a pause
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, stopped: true },
      };

    case 'SubagentStart':
      return {
        ...base,
        type: 'agent_spawn',
        agentType: 'subagent',
        agentId: agent_id,
        agentName: agent_type || subagent_type, // agent_type is the actual field name
        task: subagent_prompt?.slice(0, 200), // Not always sent by Claude Code
      };

    case 'SubagentStop':
      // Try to extract the task from the subagent transcript
      const task = extractTaskFromTranscript(agent_transcript_path);
      return {
        ...base,
        type: 'agent_complete',
        agentType: 'subagent',
        agentId: agent_id,
        agentName: agent_type || subagent_type,
        task: task,
      };

    default:
      // Unknown hook, send as activity
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, hook_event_name },
      };
  }
}

// Send event to Argus server
async function sendToArgus(event) {
  try {
    const response = await fetch(ARGUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(`Argus server returned ${response.status}`);
    }
  } catch (error) {
    // Silently fail if Argus isn't running
    // Don't want to break Claude Code sessions
    if (process.env.ARGUS_DEBUG) {
      console.error('Failed to send to Argus:', error.message);
    }
  }
}

// Main
async function main() {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      process.exit(0);
    }

    const hookPayload = JSON.parse(input);
    const event = mapHookToEvent(hookPayload);

    if (event) {
      await sendToArgus(event);
    }

    // Output nothing (success, no modifications to Claude behavior)
    process.exit(0);
  } catch (error) {
    if (process.env.ARGUS_DEBUG) {
      console.error('Argus hook error:', error);
    }
    // Don't fail the hook - exit cleanly
    process.exit(0);
  }
}

main();
