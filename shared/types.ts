// Shared types between server, hook script, and client

// ============================================
// Events (sent from hook script to server)
// ============================================

export type ArgusEventType =
  | 'session_start'
  | 'session_end'
  | 'agent_spawn'
  | 'agent_blocked'
  | 'agent_unblocked'
  | 'agent_complete'
  | 'activity'; // heartbeat / general activity

export interface ArgusEvent {
  type: ArgusEventType;
  timestamp: number;
  sessionId: string;
  projectPath: string;
  projectName: string; // derived from path
  agentId?: string;
  agentName?: string;
  agentType?: 'main' | 'subagent';
  parentAgentId?: string; // for subagents
  question?: string; // if blocked
  task?: string; // current task description
  modes?: SessionModes; // active modes (ralph, ultrawork, planning)
  metadata?: Record<string, unknown>;
}

// ============================================
// State (maintained by server, sent to UI)
// ============================================

export type ProjectStatus = 'idle' | 'working' | 'blocked';
export type AgentStatus = 'working' | 'blocked' | 'complete';

export interface SessionModes {
  ralph?: boolean;
  ralphIteration?: number;
  ralphMaxIterations?: number;
  ultrawork?: boolean;
  planning?: boolean;
}

export interface Agent {
  id: string;
  name?: string;
  type: 'main' | 'subagent';
  parentId?: string;
  status: AgentStatus;
  task?: string;  // Initial task/prompt
  currentActivity?: string;  // What they're doing right now (from recent tool calls/todos)
  question?: string;
  spawnedAt: number;
  lastActivityAt: number;
  workingTime?: number; // ms spent working (for "tired" state)
  modes?: SessionModes; // active modes (ralph, ultrawork, planning)
  delegatingTo?: string; // Agent type being delegated to (for "Passing work to..." display)
}

export interface Project {
  id: string; // hash of projectPath
  path: string;
  name: string;
  status: ProjectStatus;
  lastActivityAt: number;
  blockedSince?: number;
  agents: Map<string, Agent> | Record<string, Agent>; // Map in server, Record in JSON
  // Derived for UI
  blockedAgentCount?: number;
  workingAgentCount?: number;
}

// Completed work item for the inbox
export interface CompletedWorkItem {
  id: string;
  agentName: string;
  task: string;
  completedAt: number;
  projectId: string;
  projectName: string;
}

export interface ArgusState {
  projects: Record<string, Project>;
  completedWork: CompletedWorkItem[];
  lastUpdated: number;
}

// ============================================
// Claude Code Hook Payloads (input to hook script)
// ============================================

export interface ClaudeHookPayload {
  session_id: string;
  transcript_path: string;
  cwd: string;
  permission_mode: string;
  hook_event_name: string;
  // Event-specific fields
  message?: string;
  notification_type?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  source?: string; // for SessionStart
  subagent_type?: string;
  subagent_prompt?: string;
  subagent_result?: string;
}

// ============================================
// WebSocket Messages (server <-> client)
// ============================================

export interface WSMessage {
  type: 'state_update' | 'event' | 'ping' | 'pong';
  payload: ArgusState | ArgusEvent | null;
}
