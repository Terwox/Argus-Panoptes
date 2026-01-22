#!/usr/bin/env node
/**
 * Mock events for testing Argus
 *
 * Simulates Claude Code hook events to test the server and UI
 */

const ARGUS_URL = 'http://localhost:4242/events';

async function sendEvent(event) {
  try {
    const response = await fetch(ARGUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    console.log(`Sent ${event.type}: ${response.ok ? 'OK' : response.status}`);
  } catch (error) {
    console.error(`Failed to send ${event.type}:`, error.message);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('Sending mock events to Argus...\n');

  // Project 1: DungeonFriends - will be blocked
  await sendEvent({
    type: 'session_start',
    timestamp: Date.now(),
    sessionId: 'session-001',
    projectPath: 'C:/Users/james/projects/DungeonFriends',
    projectName: 'DungeonFriends',
  });

  await sleep(500);

  // Project 2: Skullport28 - working
  await sendEvent({
    type: 'session_start',
    timestamp: Date.now(),
    sessionId: 'session-002',
    projectPath: 'C:/Users/james/projects/Skullport28',
    projectName: 'Skullport28',
  });

  await sleep(500);

  // Project 3: ArgusTest - idle (just started, no activity)
  await sendEvent({
    type: 'session_start',
    timestamp: Date.now(),
    sessionId: 'session-003',
    projectPath: 'C:/Users/james/projects/ArgusTest',
    projectName: 'ArgusTest',
  });

  await sleep(500);

  // DungeonFriends spawns a subagent
  await sendEvent({
    type: 'agent_spawn',
    timestamp: Date.now(),
    sessionId: 'session-001',
    projectPath: 'C:/Users/james/projects/DungeonFriends',
    projectName: 'DungeonFriends',
    agentId: 'sub-001',
    agentName: 'architect',
    agentType: 'subagent',
    task: 'Analyze TTS pipeline architecture',
  });

  await sleep(500);

  // Skullport28 spawns subagents
  await sendEvent({
    type: 'agent_spawn',
    timestamp: Date.now(),
    sessionId: 'session-002',
    projectPath: 'C:/Users/james/projects/Skullport28',
    projectName: 'Skullport28',
    agentId: 'sub-002',
    agentName: 'planner',
    agentType: 'subagent',
    task: 'Plan database migration',
  });

  await sleep(500);

  // DungeonFriends subagent completes
  await sendEvent({
    type: 'agent_complete',
    timestamp: Date.now(),
    sessionId: 'session-001',
    projectPath: 'C:/Users/james/projects/DungeonFriends',
    projectName: 'DungeonFriends',
    agentId: 'sub-001',
    agentName: 'architect',
  });

  await sleep(500);

  // DungeonFriends spawns another subagent
  await sendEvent({
    type: 'agent_spawn',
    timestamp: Date.now(),
    sessionId: 'session-001',
    projectPath: 'C:/Users/james/projects/DungeonFriends',
    projectName: 'DungeonFriends',
    agentId: 'sub-003',
    agentName: 'general-purpose',
    agentType: 'subagent',
    task: 'Implement voice synthesis changes',
  });

  await sleep(500);

  // DungeonFriends gets BLOCKED with a question
  await sendEvent({
    type: 'agent_blocked',
    timestamp: Date.now(),
    sessionId: 'session-001',
    projectPath: 'C:/Users/james/projects/DungeonFriends',
    projectName: 'DungeonFriends',
    question:
      'Should I refactor the TTS pipeline first, or add the new voice model integration? The refactor would make the integration cleaner but takes longer.',
  });

  console.log('\nDone! Open http://localhost:4242 to see the dashboard.');
  console.log('DungeonFriends should be blocked and at the top-left.');
}

main();
