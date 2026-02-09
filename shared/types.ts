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
  source?: 'claude-code' | 'openclaw';  // Which tool sent this event
  agentId?: string;
  agentName?: string;
  agentType?: 'main' | 'subagent' | 'background';
  parentAgentId?: string; // for subagents
  question?: string; // if blocked
  task?: string; // current task description
  modes?: SessionModes; // active modes (ralph, ultrawork, planning)
  metadata?: Record<string, unknown>;
}

// ============================================
// State (maintained by server, sent to UI)
// ============================================

export type ProjectStatus = 'idle' | 'working' | 'blocked' | 'rate_limited' | 'server_running';
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'complete' | 'rate_limited' | 'server_running';

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
  type: 'main' | 'subagent' | 'background';
  parentId?: string;
  status: AgentStatus;
  source?: 'claude-code' | 'openclaw';  // Which tool generated this agent
  task?: string;  // Initial task/prompt
  currentActivity?: string;  // What they're doing right now (from recent tool calls/todos)
  question?: string;
  spawnedAt: number;
  lastActivityAt: number;
  workingTime?: number; // ms spent working (for "tired" state)
  modes?: SessionModes; // active modes (ralph, ultrawork, planning)
  delegatingTo?: string; // Agent type being delegated to (for "Passing work to..." display)
  transcriptPath?: string; // Path to transcript file for navigation
  transcriptLine?: number; // Line number in transcript for current activity
  rateLimitResetAt?: number; // Timestamp when rate limit resets (if rate limited)
  todos?: {
    items: Array<{ content: string; status: 'pending' | 'in_progress' | 'completed'; activeForm?: string }>;
    counts: { pending: number; inProgress: number; completed: number };
  };
}

export interface Project {
  id: string; // hash of projectPath
  path: string;
  name: string;
  status: ProjectStatus;
  lastActivityAt: number;
  blockedSince?: number;
  agents: Map<string, Agent> | Record<string, Agent>; // Map in server, Record in JSON
  lastUserMessage?: string; // Last message the user sent to Claude (truncated to 100 chars)
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
