/**
 * In-memory state management for Argus
 *
 * Maintains project and agent state, handles state transitions
 */

import { createHash } from 'crypto';
import type {
  ArgusState,
  Project,
  Agent,
  ProjectStatus,
  AgentStatus,
  SessionModes,
  CompletedWorkItem,
} from '../shared/types.js';

// In-memory state
const projects = new Map<string, Project>();
const completedWork: CompletedWorkItem[] = [];
const MAX_COMPLETED_ITEMS = 20;
const COMPLETED_WORK_TTL = 5 * 60 * 1000; // 5 minutes

// Idle detection - if no activity for this long, consider the session idle
const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Track background task IDs to their shell IDs for completion detection
const backgroundTaskShellIds = new Map<string, string>(); // agentId -> shellId

// DESIGN PRINCIPLE: NO DUPLICATE PROJECTS
// Normalize path for consistent project IDs (case-insensitive on Windows)
function normalizePath(path: string): string {
  // Convert to lowercase for case-insensitive comparison (Windows paths)
  // Also normalize slashes and remove trailing slashes
  return path
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/\/+$/, '');
}

// Generate project ID from path (normalized for deduplication)
export function projectId(path: string): string {
  return createHash('sha256').update(normalizePath(path)).digest('hex').slice(0, 12);
}

// Get or create a project
export function getOrCreateProject(
  path: string,
  name: string
): Project {
  const id = projectId(path);
  let project = projects.get(id);

  if (!project) {
    project = {
      id,
      path,
      name,
      status: 'idle',
      lastActivityAt: Date.now(),
      agents: new Map(),
    };
    projects.set(id, project);
  }

  return project;
}

// Get a project by path
export function getProject(path: string): Project | undefined {
  return projects.get(projectId(path));
}

// Update project status based on agent states
function updateProjectStatus(project: Project): void {
  const agents = project.agents as Map<string, Agent>;
  const now = Date.now();
  let hasBlocked = false;
  let hasWorking = false;

  for (const agent of agents.values()) {
    // Check if agent is actively working or just stale
    const isStale = now - agent.lastActivityAt > IDLE_TIMEOUT;

    if (agent.status === 'blocked') hasBlocked = true;
    // Only count as "working" if we've heard from them recently
    if (agent.status === 'working' && !isStale) hasWorking = true;
  }

  const newStatus: ProjectStatus = hasBlocked
    ? 'blocked'
    : hasWorking
      ? 'working'
      : 'idle';

  if (newStatus === 'blocked' && project.status !== 'blocked') {
    project.blockedSince = Date.now();
  } else if (newStatus !== 'blocked') {
    project.blockedSince = undefined;
  }

  project.status = newStatus;
  // Only update lastActivityAt if we're not going idle due to staleness
  if (newStatus !== 'idle') {
    project.lastActivityAt = Date.now();
  }
}

// Session started
export function onSessionStart(
  sessionId: string,
  projectPath: string,
  projectName: string,
  task?: string,
  modes?: SessionModes
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  // IMPORTANT: Only ONE main agent per project at a time
  // Remove ALL other main agents when a new session starts
  for (const [id, agent] of agents) {
    if (agent.type === 'main' && id !== sessionId) {
      agents.delete(id);
    }
  }

  // Create or update main agent
  const mainAgent: Agent = {
    id: sessionId,
    name: 'main',
    type: 'main',
    status: 'working',
    task,
    modes,
    spawnedAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  agents.set(sessionId, mainAgent);

  updateProjectStatus(project);
  return project;
}

// Session ended
export function onSessionEnd(
  sessionId: string,
  projectPath: string
): Project | undefined {
  const project = getProject(projectPath);
  if (!project) return undefined;

  const agents = project.agents as Map<string, Agent>;
  const agent = agents.get(sessionId);

  if (agent) {
    agent.status = 'complete';
    agent.lastActivityAt = Date.now();
  }

  updateProjectStatus(project);
  return project;
}

// Agent spawned (subagent or background task)
export function onAgentSpawn(
  sessionId: string,
  projectPath: string,
  projectName: string,
  agentId: string | undefined,
  agentName: string | undefined,
  task: string | undefined,
  agentType?: string,  // 'subagent' or 'background'
  shellId?: string     // For background tasks, the shell ID to track completion
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  const id = agentId || `sub-${Date.now()}`;
  const type = agentType === 'background' ? 'background' : 'subagent';
  const subagent: Agent = {
    id,
    name: agentName || (type === 'background' ? 'background-task' : undefined),
    type: type as 'main' | 'subagent' | 'background',
    parentId: sessionId,
    status: 'working',
    task,
    spawnedAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  agents.set(id, subagent);

  // Track shell ID for background task completion detection
  if (type === 'background' && shellId) {
    backgroundTaskShellIds.set(id, shellId);
  }

  updateProjectStatus(project);
  return project;
}

// Agent blocked (waiting for input)
export function onAgentBlocked(
  sessionId: string,
  projectPath: string,
  projectName: string,
  question: string | undefined,
  currentActivity?: string  // What they were doing when blocked
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  // Find the agent (main session or most recent subagent)
  let agent = agents.get(sessionId);
  if (!agent) {
    // If no agent exists, create main
    agent = {
      id: sessionId,
      name: 'main',
      type: 'main',
      status: 'working',
      spawnedAt: Date.now(),
      lastActivityAt: Date.now(),
    };
    agents.set(sessionId, agent);
  }

  agent.status = 'blocked';
  agent.question = question;
  // Preserve what they were doing when they got blocked
  if (currentActivity) {
    agent.currentActivity = currentActivity;
  }
  agent.lastActivityAt = Date.now();

  updateProjectStatus(project);
  return project;
}

// Agent unblocked (user responded)
export function onAgentUnblocked(
  sessionId: string,
  projectPath: string,
  projectName: string
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  // Only unblock the specific session that received input
  const agent = agents.get(sessionId);
  if (agent && agent.status === 'blocked') {
    agent.status = 'working';
    agent.question = undefined;
    agent.lastActivityAt = Date.now();
  }

  updateProjectStatus(project);
  return project;
}

// Add completed work item to inbox
function addCompletedWorkItem(
  agentName: string | undefined,
  task: string | undefined,
  projectId: string,
  projectName: string
): void {
  if (!task && !agentName) return; // Nothing meaningful to show

  const item: CompletedWorkItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    agentName: agentName || 'agent',
    task: task || 'Task completed',
    completedAt: Date.now(),
    projectId,
    projectName,
  };

  completedWork.unshift(item); // Add to front

  // Keep max items
  if (completedWork.length > MAX_COMPLETED_ITEMS) {
    completedWork.length = MAX_COMPLETED_ITEMS;
  }
}

// Agent completed
export function onAgentComplete(
  sessionId: string,
  projectPath: string,
  agentId: string | undefined,
  agentName: string | undefined,
  task: string | undefined
): Project | undefined {
  const project = getProject(projectPath);
  if (!project) return undefined;

  const agents = project.agents as Map<string, Agent>;

  // Try to find the agent by ID first
  if (agentId) {
    const agent = agents.get(agentId);
    if (agent) {
      agent.status = 'complete';
      agent.lastActivityAt = Date.now();
      // Update task if provided (extracted from transcript on completion)
      if (task) agent.task = task;
      // Add to completed work inbox (only subagents)
      if (agent.type === 'subagent') {
        addCompletedWorkItem(agent.name, task || agent.task, project.id, project.name);
      }
      updateProjectStatus(project);
      return project;
    }
  }

  // If no agentId, find by agentName (subagent_type) - complete the most recent working one
  if (agentName) {
    let matchingAgent: Agent | undefined;
    let latestSpawn = 0;

    for (const agent of agents.values()) {
      if (
        agent.name === agentName &&
        agent.type === 'subagent' &&
        agent.status === 'working' &&
        agent.spawnedAt > latestSpawn
      ) {
        matchingAgent = agent;
        latestSpawn = agent.spawnedAt;
      }
    }

    if (matchingAgent) {
      matchingAgent.status = 'complete';
      matchingAgent.lastActivityAt = Date.now();
      // Add to completed work inbox
      addCompletedWorkItem(matchingAgent.name, task || matchingAgent.task, project.id, project.name);
      updateProjectStatus(project);
      return project;
    }
  }

  // Fallback: mark main session complete (for SessionEnd events)
  const mainAgent = agents.get(sessionId);
  if (mainAgent) {
    mainAgent.status = 'complete';
    mainAgent.lastActivityAt = Date.now();
  }

  updateProjectStatus(project);
  return project;
}

// General activity (heartbeat)
export function onActivity(
  sessionId: string,
  projectPath: string,
  projectName: string,
  modes?: SessionModes,
  task?: string,
  delegatingTo?: string | null
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  const agent = agents.get(sessionId);
  if (agent) {
    agent.lastActivityAt = Date.now();
    // Update modes if provided (e.g., ralph activated mid-session)
    if (modes) {
      agent.modes = modes;
    }
    // Update task if provided and we don't have one yet
    if (task && !agent.task) {
      agent.task = task;
    }
    // Update delegation status
    if (delegatingTo !== undefined) {
      agent.delegatingTo = delegatingTo || undefined;
    }
  }

  project.lastActivityAt = Date.now();
  return project;
}

// Update task for an existing session (for late task discovery)
export function updateSessionTask(
  sessionId: string,
  projectPath: string,
  task: string
): void {
  const project = getProject(projectPath);
  if (!project) return;

  const agents = project.agents as Map<string, Agent>;
  const agent = agents.get(sessionId);
  if (agent && !agent.task) {
    agent.task = task;
    agent.lastActivityAt = Date.now();
  }
}

// Update current activity for a session (what they're doing right now)
// NOTE: Only updates lastActivityAt when activity actually changes
// This prevents polling from keeping "stale" sessions artificially alive
export function updateCurrentActivity(
  sessionId: string,
  projectPath: string,
  activity: string
): boolean {
  const project = getProject(projectPath);
  if (!project) return false;

  const agents = project.agents as Map<string, Agent>;
  const agent = agents.get(sessionId);
  if (agent && agent.status === 'working') {
    const changed = agent.currentActivity !== activity;
    agent.currentActivity = activity;
    // Only update lastActivityAt if activity actually changed
    // This allows idle detection to work for sessions that stopped working
    if (changed) {
      agent.lastActivityAt = Date.now();
    }
    return changed;
  }
  return false;
}

// Update last user message for a project
export function updateLastUserMessage(
  projectPath: string,
  message: string
): boolean {
  const project = getProject(projectPath);
  if (!project) return false;

  const changed = project.lastUserMessage !== message;
  project.lastUserMessage = message;
  return changed;
}

// Background task completion - triggered when TaskOutput is read
export function onBackgroundTaskComplete(
  projectPath: string,
  taskId: string  // The shell ID from TaskOutput tool
): Project | undefined {
  const project = getProject(projectPath);
  if (!project) return undefined;

  const agents = project.agents as Map<string, Agent>;

  // Find the background agent by shell ID
  for (const [agentId, shellId] of backgroundTaskShellIds) {
    if (shellId === taskId) {
      const agent = agents.get(agentId);
      if (agent && agent.type === 'background' && agent.status === 'working') {
        agent.status = 'complete';
        agent.lastActivityAt = Date.now();
        // Add to completed work inbox
        addCompletedWorkItem(agent.name, agent.task, project.id, project.name);
        backgroundTaskShellIds.delete(agentId);
        updateProjectStatus(project);
        return project;
      }
    }
  }

  return undefined;
}

// Force refresh of project statuses (for periodic idle detection)
export function refreshAllProjectStatuses(): void {
  for (const project of projects.values()) {
    updateProjectStatus(project);
  }
}

// Get full state for client
export function getState(): ArgusState {
  const projectsObj: Record<string, Project> = {};
  const now = Date.now();

  for (const [id, project] of projects) {
    // Convert agents Map to Record for JSON serialization
    const agents = project.agents as Map<string, Agent>;
    const agentsObj: Record<string, Agent> = {};
    let blockedCount = 0;
    let workingCount = 0;

    for (const [agentId, agent] of agents) {
      // Calculate working time for active agents (time since spawn)
      const workingTime = agent.status !== 'complete'
        ? now - agent.spawnedAt
        : agent.lastActivityAt - agent.spawnedAt;

      agentsObj[agentId] = {
        ...agent,
        workingTime,
      };
      if (agent.status === 'blocked') blockedCount++;
      if (agent.status === 'working') workingCount++;
    }

    projectsObj[id] = {
      ...project,
      agents: agentsObj,
      blockedAgentCount: blockedCount,
      workingAgentCount: workingCount,
    };
  }

  return {
    projects: projectsObj,
    completedWork: [...completedWork], // Copy array
    lastUpdated: Date.now(),
  };
}

// Clean up stale projects, agents, and completed work
export function cleanupStale(): void {
  const projectThreshold = Date.now() - 30 * 60 * 1000; // 30 min for idle projects
  const agentThreshold = Date.now() - 5 * 60 * 1000; // 5 min for blocked agents
  const completedThreshold = Date.now() - COMPLETED_WORK_TTL; // 5 min for completed items

  for (const [id, project] of projects) {
    // Clean up stale idle projects
    if (project.lastActivityAt < projectThreshold && project.status === 'idle') {
      projects.delete(id);
      continue;
    }

    // Clean up stale blocked main agents within active projects
    const agents = project.agents as Map<string, Agent>;
    for (const [agentId, agent] of agents) {
      if (agent.type === 'main' &&
          agent.status === 'blocked' &&
          agent.lastActivityAt < agentThreshold) {
        agents.delete(agentId);
      }
    }

    // Update project status after cleanup
    updateProjectStatus(project);
  }

  // Clean up old completed work items (older than 5 minutes)
  for (let i = completedWork.length - 1; i >= 0; i--) {
    if (completedWork[i].completedAt < completedThreshold) {
      completedWork.splice(i, 1);
    }
  }
}
