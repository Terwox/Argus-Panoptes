/**
 * Event handlers for Argus
 *
 * Processes incoming events and updates state
 */

import type { ArgusEvent } from '../shared/types.js';
import * as state from './state.js';

export function handleEvent(event: ArgusEvent): void {
  const { type, sessionId, projectPath, projectName } = event;

  // Debug logging
  console.log(`[EVENT] ${type} | session=${sessionId?.slice(0, 8)} | id=${event.agentId || 'n/a'} | name=${event.agentName || 'n/a'}`);

  // Auto-register session if it doesn't exist (handles pre-existing sessions)
  if (type !== 'session_start' && type !== 'session_end' && !state.getProject(projectPath)) {
    console.log(`[EVENT] Auto-registering unknown session from ${projectName}`);
    state.onSessionStart(sessionId, projectPath, projectName);
  }

  switch (type) {
    case 'session_start':
      state.onSessionStart(sessionId, projectPath, projectName, event.task, event.modes);
      break;

    case 'session_end':
      state.onSessionEnd(sessionId, projectPath);
      break;

    case 'agent_spawn':
      state.onAgentSpawn(
        sessionId,
        projectPath,
        projectName,
        event.agentId,
        event.agentName,
        event.task,
        event.agentType  // 'subagent' or 'background'
      );
      break;

    case 'agent_blocked':
      state.onAgentBlocked(sessionId, projectPath, projectName, event.question);
      break;

    case 'agent_unblocked':
      state.onAgentUnblocked(sessionId, projectPath, projectName);
      break;

    case 'agent_complete':
      state.onAgentComplete(
        sessionId,
        projectPath,
        event.agentId,
        event.agentName,
        event.task
      );
      break;

    case 'activity':
    default:
      // Extract delegation info from metadata if present
      const delegatingTo = event.metadata?.delegatingTo as string | null | undefined;
      state.onActivity(sessionId, projectPath, projectName, event.modes, undefined, delegatingTo);

      // Check for background task completion (TaskOutput read)
      const backgroundTaskComplete = event.metadata?.backgroundTaskComplete as string | undefined;
      if (backgroundTaskComplete) {
        state.onBackgroundTaskComplete(projectPath, backgroundTaskComplete);
      }
      break;
  }
}
