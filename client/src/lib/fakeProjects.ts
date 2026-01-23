/**
 * Fake project generator for demo/ambient visualization
 *
 * When there are ≤3 real projects, we generate fake projects with
 * agents doing "Very Important Things" to fill the dashboard.
 * Can optionally use real git commits for more realistic activities.
 */

import type { Project, Agent, AgentStatus } from '../../../shared/types';

// Git activity type from server
export interface GitActivity {
  activity: string;
  suggestedRole: string;
}

// Store for git-based activities (populated from server)
let gitActivities: GitActivity[] = [];

/**
 * Fetch git activities from server
 */
export async function fetchGitActivities(): Promise<void> {
  try {
    const response = await fetch('/git-activities');
    if (response.ok) {
      const data = await response.json();
      gitActivities = data.activities || [];
    }
  } catch (e) {
    // Failed to fetch, will use built-in activities
    gitActivities = [];
  }
}

// Fake project names (tech/dev themed)
const FAKE_PROJECT_NAMES = [
  'quantum-flux-capacitor',
  'neural-pancake-stack',
  'distributed-coffee-maker',
  'async-sandwich-builder',
  'parallel-nap-scheduler',
  'recursive-snack-finder',
  'microservice-pet-feeder',
  'blockchain-weather-guesser',
];

// Fake agent roles and their "Very Important" activities
const FAKE_ACTIVITIES: Record<string, string[]> = {
  architect: [
    'Contemplating the architecture of architectures',
    'Drawing boxes inside boxes inside boxes',
    'Debating microservices vs monolith (again)',
    'Optimizing the optimization optimizer',
    'Sketching diagrams that require 4 monitors',
  ],
  executor: [
    'Implementing a feature that was specced 5 minutes ago',
    'Refactoring the refactored refactor',
    'Adding TODO comments for future TODOs',
    'Writing code that writes code',
    'Fixing the bug that fixes the other bug',
  ],
  explorer: [
    'Searching for the missing semicolon',
    'Exploring the depths of node_modules',
    'Mapping the uncharted regions of legacy code',
    'Following the call stack into the void',
    'Discovering ancient code from 2019',
  ],
  designer: [
    'Adjusting padding by 1 pixel',
    'Debating 47 shades of blue',
    'Making the button more buttony',
    'Centering the div (attempt #47)',
    'Adding subtle drop shadows to everything',
  ],
  researcher: [
    'Reading documentation that may or may not exist',
    'Googling the error message (professionally)',
    'Comparing 12 npm packages that do the same thing',
    'Investigating why it works on their machine',
    'Researching best practices from 2015',
  ],
  writer: [
    'Writing docs that nobody will read',
    'Crafting the perfect README intro',
    'Explaining why the code is self-documenting',
    'Adding JSDoc to a function called "doThing"',
    'Writing a comment longer than the code',
  ],
  tester: [
    'Testing if tests are testing the right tests',
    'Writing edge cases for edge cases',
    'Achieving 100% coverage of trivial getters',
    'Mocking the mocks that mock other mocks',
    'Finding the one bug that passed all tests',
  ],
  planner: [
    'Planning the plan for planning',
    'Creating tickets about creating tickets',
    'Estimating that estimates are always wrong',
    'Scheduling meetings about the meeting schedule',
    'Prioritizing the priority prioritization',
  ],
};

const ROLES = Object.keys(FAKE_ACTIVITIES);

// Get an activity for an agent (prefers git activities if available)
function getActivity(role: string): string {
  // Try to use git activities first (they have suggested roles)
  if (gitActivities.length > 0) {
    // Find activities that match this role
    const matchingActivities = gitActivities.filter(
      a => a.suggestedRole === role
    );

    if (matchingActivities.length > 0) {
      return matchingActivities[Math.floor(Math.random() * matchingActivities.length)].activity;
    }

    // No matching role, use any git activity
    const randomGit = gitActivities[Math.floor(Math.random() * gitActivities.length)];
    return randomGit.activity;
  }

  // Fall back to built-in funny activities
  const activities = FAKE_ACTIVITIES[role] || FAKE_ACTIVITIES.executor;
  return activities[Math.floor(Math.random() * activities.length)];
}

// Generate a random fake agent
function generateFakeAgent(
  projectId: string,
  index: number,
  now: number
): Agent {
  const role = ROLES[index % ROLES.length];
  const activity = getActivity(role);

  // Random status weighted towards working (NEVER blocked - fake projects shouldn't distract)
  const statusRoll = Math.random();
  let status: AgentStatus;
  if (statusRoll < 0.75) {
    status = 'working';
  } else {
    status = 'complete';
  }

  // Stagger spawn times for visual variety
  const spawnedAt = now - Math.floor(Math.random() * 300000); // 0-5 min ago
  const lastActivityAt = now - Math.floor(Math.random() * 30000); // 0-30s ago

  return {
    id: `${projectId}-fake-agent-${index}`,
    name: role,
    type: index === 0 ? 'main' : 'subagent',
    parentId: index === 0 ? undefined : `${projectId}-fake-agent-0`,
    status,
    task: activity,
    currentActivity: activity,
    // No question field - fake projects should never be blocked
    spawnedAt,
    lastActivityAt,
    workingTime: now - spawnedAt,
  };
}

// Generate a fake project
function generateFakeProject(index: number, now: number): Project {
  const name = FAKE_PROJECT_NAMES[index % FAKE_PROJECT_NAMES.length];
  const id = `fake-${name}-${index}`;

  // Generate 2-4 agents per project
  const agentCount = 2 + Math.floor(Math.random() * 3);
  const agents: Record<string, Agent> = {};

  for (let i = 0; i < agentCount; i++) {
    const agent = generateFakeAgent(id, i, now);
    agents[agent.id] = agent;
  }

  // Determine project status from agents
  const agentList = Object.values(agents);
  const hasBlocked = agentList.some(a => a.status === 'blocked');
  const hasWorking = agentList.some(a => a.status === 'working');

  return {
    id,
    path: `/fake/${name}`,
    name: `Fake: ${name}`,
    status: hasBlocked ? 'blocked' : hasWorking ? 'working' : 'idle',
    lastActivityAt: now - Math.floor(Math.random() * 60000),
    blockedSince: hasBlocked ? now - Math.floor(Math.random() * 120000) : undefined,
    agents,
    blockedAgentCount: agentList.filter(a => a.status === 'blocked').length,
    workingAgentCount: agentList.filter(a => a.status === 'working').length,
  };
}

/**
 * Generate fake projects to fill dashboard up to 3 total projects
 * @param realProjectCount Number of actual projects
 * @returns Array of fake projects (fills up to 3 total)
 */
export function generateFakeProjects(realProjectCount: number): Project[] {
  // Only generate fake projects if <3 real ones (fill to 3 total)
  if (realProjectCount >= 3) {
    return [];
  }

  const now = Date.now();
  const fakeCount = 3 - realProjectCount; // Fill up to exactly 3 total
  const fakeProjects: Project[] = [];

  for (let i = 0; i < fakeCount; i++) {
    fakeProjects.push(generateFakeProject(i, now));
  }

  return fakeProjects;
}

/**
 * Periodically update fake project activities for animation
 * Call this every few seconds to make fake agents look alive
 */
export function refreshFakeActivities(projects: Project[]): Project[] {
  const now = Date.now();

  return projects.map(project => {
    if (!project.id.startsWith('fake-')) {
      return project;
    }

    // Update agent activities randomly
    const updatedAgents: Record<string, Agent> = {};

    for (const [id, agent] of Object.entries(project.agents)) {
      const role = agent.name || 'executor';

      // 20% chance to change activity (uses git activities if available)
      const newActivity = Math.random() < 0.2
        ? getActivity(role)
        : agent.currentActivity;

      // Small chance to change status (NEVER blocked - fake projects shouldn't distract)
      let newStatus = agent.status;
      if (Math.random() < 0.05) {
        newStatus = Math.random() < 0.75 ? 'working' : 'complete';
      }

      updatedAgents[id] = {
        ...agent,
        currentActivity: newActivity,
        task: newActivity,
        status: newStatus,
        lastActivityAt: now,
        // No question field - fake projects should never be blocked
      };
    }

    // Recalculate project status
    const agentList = Object.values(updatedAgents);
    const hasBlocked = agentList.some(a => a.status === 'blocked');
    const hasWorking = agentList.some(a => a.status === 'working');

    return {
      ...project,
      agents: updatedAgents,
      status: hasBlocked ? 'blocked' : hasWorking ? 'working' : 'idle',
      lastActivityAt: now,
      blockedSince: hasBlocked && !project.blockedSince ? now : project.blockedSince,
      blockedAgentCount: agentList.filter(a => a.status === 'blocked').length,
      workingAgentCount: agentList.filter(a => a.status === 'working').length,
    };
  });
}
