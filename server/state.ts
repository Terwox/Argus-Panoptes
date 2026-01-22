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
} from '../shared/types.js';

// In-memory state
const projects = new Map<string, Project>();

// Generate project ID from path
export function projectId(path: string): string {
  return createHash('sha256').update(path).digest('hex').slice(0, 12);
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
  let hasBlocked = false;
  let hasWorking = false;

  for (const agent of agents.values()) {
    if (agent.status === 'blocked') hasBlocked = true;
    if (agent.status === 'working') hasWorking = true;
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
  project.lastActivityAt = Date.now();
}

// Session started
export function onSessionStart(
  sessionId: string,
  projectPath: string,
  projectName: string
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  // Clean up old completed main agents only (keep subagents for history)
  // Only remove if it's a different session's main agent that completed
  for (const [id, agent] of agents) {
    if (agent.type === 'main' && agent.status === 'complete' && id !== sessionId) {
      agents.delete(id);
    }
  }

  // Create or update main agent
  const mainAgent: Agent = {
    id: sessionId,
    name: 'main',
    type: 'main',
    status: 'working',
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

// Agent spawned (subagent)
export function onAgentSpawn(
  sessionId: string,
  projectPath: string,
  projectName: string,
  agentId: string | undefined,
  agentName: string | undefined,
  task: string | undefined
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  const id = agentId || `sub-${Date.now()}`;
  const subagent: Agent = {
    id,
    name: agentName,
    type: 'subagent',
    parentId: sessionId,
    status: 'working',
    task,
    spawnedAt: Date.now(),
    lastActivityAt: Date.now(),
  };
  agents.set(id, subagent);

  updateProjectStatus(project);
  return project;
}

// Agent blocked (waiting for input)
export function onAgentBlocked(
  sessionId: string,
  projectPath: string,
  projectName: string,
  question: string | undefined
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
  projectName: string
): Project {
  const project = getOrCreateProject(projectPath, projectName);
  const agents = project.agents as Map<string, Agent>;

  const agent = agents.get(sessionId);
  if (agent) {
    agent.lastActivityAt = Date.now();
  }

  project.lastActivityAt = Date.now();
  return project;
}

// Get full state for client
export function getState(): ArgusState {
  const projectsObj: Record<string, Project> = {};

  for (const [id, project] of projects) {
    // Convert agents Map to Record for JSON serialization
    const agents = project.agents as Map<string, Agent>;
    const agentsObj: Record<string, Agent> = {};
    let blockedCount = 0;
    let workingCount = 0;

    for (const [agentId, agent] of agents) {
      agentsObj[agentId] = agent;
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
    lastUpdated: Date.now(),
  };
}

// Clean up stale projects (no activity for 30 minutes)
export function cleanupStale(): void {
  const threshold = Date.now() - 30 * 60 * 1000;

  for (const [id, project] of projects) {
    if (project.lastActivityAt < threshold && project.status === 'idle') {
      projects.delete(id);
    }
  }
}
