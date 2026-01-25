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

// Target mode: 'extension' (VS Code) or 'standalone' (browser dashboard)
// Standalone (localhost:5173) is the default - set ARGUS_TARGET=extension for VS Code WebView
const ARGUS_TARGET = process.env.ARGUS_TARGET || 'standalone';

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
          // Extract first ~300 chars of the task (enough for tooltip)
          const task = entry.message.content.slice(0, 300);
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

// Extract task from main transcript by finding the most recent Task tool call
function extractTaskFromMainTranscript(transcriptPath, agentType) {
  if (!transcriptPath || !existsSync(transcriptPath)) return undefined;

  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Search from end to find the most recent Task tool call matching this agent type
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        if (entry.type === 'assistant' && entry.message?.content) {
          const contentBlocks = entry.message.content;
          if (Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
              if (block.type === 'tool_use' && block.name === 'Task') {
                const input = block.input || {};
                // Check if this Task call matches the agent type we're looking for
                if (!agentType || input.subagent_type === agentType) {
                  // Prefer description (short), fall back to prompt (long)
                  const task = input.description || input.prompt;
                  if (task) {
                    const trimmed = task.slice(0, 300);
                    return trimmed.length < task.length ? trimmed + '...' : trimmed;
                  }
                }
              }
            }
          }
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

// Construct subagent transcript path from session info
function getSubagentTranscriptPath(transcriptPath, agentId) {
  if (!transcriptPath || !agentId) return undefined;
  const dir = join(transcriptPath, '..', basename(transcriptPath, '.jsonl'), 'subagents');
  return join(dir, `agent-${agentId}.jsonl`);
}

// Try to read .omc state for richer context
function readOmcState(cwd) {
  const state = {};
  const modes = {};

  try {
    const ralphPath = join(cwd, '.omc', 'ralph-state.json');
    if (existsSync(ralphPath)) {
      const ralph = JSON.parse(readFileSync(ralphPath, 'utf8'));
      if (ralph.active) {
        modes.ralph = true;
        modes.ralphIteration = ralph.iteration;
        modes.ralphMaxIterations = ralph.max_iterations;
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
        modes.ultrawork = true;
      }
    }
  } catch (e) {
    // Ignore errors reading state
  }

  try {
    const planningPath = join(cwd, '.omc', 'planning-state.json');
    if (existsSync(planningPath)) {
      const planning = JSON.parse(readFileSync(planningPath, 'utf8'));
      if (planning.active) {
        modes.planning = true;
      }
    }
  } catch (e) {
    // Ignore errors reading state
  }

  if (Object.keys(modes).length > 0) {
    state.modes = modes;
  }

  return Object.keys(state).length > 0 ? state : undefined;
}

// Extract text from message content (handles both string and array formats)
function extractTextFromContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    // Find the first text block
    for (const block of content) {
      if (block.type === 'text' && block.text) {
        return block.text;
      }
    }
  }
  return '';
}

// Extract main agent task from session transcript (first user message)
function extractMainTask(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return undefined;

  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Look for the first user message which contains the task
    for (const line of lines.slice(0, 15)) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'user' && entry.message?.content) {
          const text = extractTextFromContent(entry.message.content);
          if (text) {
            // Extract first ~100 chars of the task
            const task = text.slice(0, 100);
            return task.length < text.length ? task + '...' : task;
          }
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

// Check if the last assistant message has an unanswered blocking tool call
// (AskUserQuestion or ExitPlanMode)
function hasPendingBlockingToolCall(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return null;

  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Read from end to find the last assistant message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);

        // If we find a user message first, no pending question
        if (entry.type === 'user') return null;

        // Check if this is an assistant message with a blocking tool call
        if (entry.type === 'assistant' && entry.message?.content) {
          const contentBlocks = entry.message.content;
          // Content is an array of blocks
          if (Array.isArray(contentBlocks)) {
            for (const block of contentBlocks) {
              if (block.type === 'tool_use') {
                // AskUserQuestion - waiting for user to answer
                if (block.name === 'AskUserQuestion') {
                  const questions = block.input?.questions;
                  if (questions && questions.length > 0) {
                    return questions[0].question || 'Waiting for your response...';
                  }
                  return 'Waiting for your response...';
                }
                // ExitPlanMode - waiting for plan approval
                if (block.name === 'ExitPlanMode') {
                  return 'Waiting for plan approval...';
                }
              }
            }
          }
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

// Map Claude Code hook to Argus event
function mapHookToEvent(hookPayload) {
  // Debug: log ALL events to understand the hook lifecycle
  try {
    const debugLine = `[${new Date().toISOString()}] ${hookPayload.hook_event_name}: ${JSON.stringify(hookPayload, null, 2)}\n\n`;
    appendFileSync(DEBUG_LOG, debugLine);
  } catch (e) {
    // Ignore write errors
  }

  const {
    session_id,
    transcript_path,
    cwd,
    hook_event_name,
    message,
    notification_type,
    source,
    // Tool fields (for PreToolUse, PostToolUse, PermissionRequest)
    tool_name,
    tool_input,
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

  // Read optional .omc state for modes (ralph, ultrawork, planning)
  const omcState = readOmcState(cwd);
  if (omcState) {
    if (omcState.modes) {
      base.modes = omcState.modes;
    }
    // Pass other metadata (original task, etc)
    const { modes, ...otherMeta } = omcState;
    if (Object.keys(otherMeta).length > 0) {
      base.metadata = { ...base.metadata, ...otherMeta };
    }
  }

  switch (hook_event_name) {
    case 'SessionStart':
      // Try to extract the main agent's task from the transcript
      const mainTask = extractMainTask(transcript_path);
      return {
        ...base,
        type: 'session_start',
        task: mainTask,
        metadata: { ...base.metadata, source },
      };

    case 'SessionEnd':
      return {
        ...base,
        type: 'session_end',
      };

    case 'Notification':
      // These notification types mean the session is waiting for user input
      // idle_prompt: Claude waiting >60s for input
      // permission_prompt: Permission dialog shown
      // elicitation_dialog: MCP tool parameter gathering
      const blockedNotifications = ['idle_prompt', 'permission_prompt', 'elicitation_dialog'];
      if (blockedNotifications.includes(notification_type)) {
        return {
          ...base,
          type: 'agent_blocked',
          question: message || `Waiting (${notification_type})...`,
        };
      }
      // Other notifications = activity
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, notification_type, message },
      };

    case 'PermissionRequest':
      // Permission dialog is shown - session is blocked waiting for approval
      return {
        ...base,
        type: 'agent_blocked',
        question: `Permission needed: ${hookPayload.tool_name || 'tool'}`,
      };

    case 'UserPromptSubmit':
      return {
        ...base,
        type: 'agent_unblocked',
      };

    case 'Stop':
      // Claude stopped and is waiting for user input = blocked
      // Check transcript for pending blocking tools (AskUserQuestion, ExitPlanMode)
      const pendingQuestion = hasPendingBlockingToolCall(transcript_path);
      return {
        ...base,
        type: 'agent_blocked',
        question: pendingQuestion || message || 'Waiting for input...',
      };

    case 'PreToolUse':
      // Capture delegation when Task tool is about to be called
      if (tool_name === 'Task' && tool_input) {
        const delegatingTo = tool_input.subagent_type || 'agent';
        const delegationTask = tool_input.description || tool_input.prompt?.slice(0, 100);
        return {
          ...base,
          type: 'activity',
          metadata: {
            ...base.metadata,
            delegatingTo,
            delegationTask,
          },
        };
      }
      // Background Bash commands spawn as "subprocess" bots
      if (tool_name === 'Bash' && tool_input?.run_in_background) {
        const taskDesc = tool_input.description || tool_input.command?.slice(0, 80) || 'Background task';
        return {
          ...base,
          type: 'agent_spawn',
          agentType: 'background',
          agentId: `bg-${Date.now()}`,
          agentName: 'background-task',
          task: taskDesc,
        };
      }
      // Other tool uses are just activity
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, tool_name },
      };

    case 'PostToolUse':
      // Clear delegation status when Task tool completes
      if (tool_name === 'Task') {
        return {
          ...base,
          type: 'activity',
          metadata: {
            ...base.metadata,
            delegatingTo: null, // Clear delegation
          },
        };
      }
      // Detect TaskOutput completion for background tasks
      if (tool_name === 'TaskOutput' && tool_input?.task_id) {
        return {
          ...base,
          type: 'activity',
          metadata: {
            ...base.metadata,
            tool_name,
            backgroundTaskComplete: tool_input.task_id,
          },
        };
      }
      return {
        ...base,
        type: 'activity',
        metadata: { ...base.metadata, tool_name },
      };

    case 'SubagentStart':
      // Try multiple sources for the task:
      // 1. Subagent transcript (if it exists already)
      // 2. Main transcript (find the Task tool call that spawned this agent)
      // 3. Legacy subagent_prompt field
      const subagentPath = getSubagentTranscriptPath(transcript_path, agent_id);
      const agentTypeName = agent_type || subagent_type;
      const startTask = extractTaskFromTranscript(subagentPath)
        || extractTaskFromMainTranscript(transcript_path, agentTypeName)
        || subagent_prompt?.slice(0, 300);
      return {
        ...base,
        type: 'agent_spawn',
        agentType: 'subagent',
        agentId: agent_id,
        agentName: agentTypeName,
        task: startTask,
      };

    case 'SubagentStop':
      // Try to extract the task from the subagent transcript
      const stopTask = extractTaskFromTranscript(agent_transcript_path);
      return {
        ...base,
        type: 'agent_complete',
        agentType: 'subagent',
        agentId: agent_id,
        agentName: agent_type || subagent_type,
        task: stopTask,
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
