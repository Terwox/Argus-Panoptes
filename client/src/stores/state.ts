/**
 * Svelte store for Argus state
 *
 * Manages WebSocket connection and state updates
 */

import { writable, derived, get } from 'svelte/store';
import type { ArgusState, Project, WSMessage } from '../../../shared/types.js';
import { generateFakeProjects, refreshFakeActivities, fetchGitActivities } from '../lib/fakeProjects.js';

// WebSocket connection state
export const connected = writable(false);

// Main state store
export const state = writable<ArgusState>({
  projects: {},
  completedWork: [],
  lastUpdated: 0,
});

// Derived: completed work items for inbox
export const completedWork = derived(state, ($state) => $state.completedWork || []);

// View mode: 'simple' or 'detailed' - default to detailed for full bot visualization
export const viewMode = writable<'simple' | 'detailed'>('detailed');

// Cute mode: enables animated bot characters - ON by default, can disable with ?cute=false
function getCuteDefault(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  // Default ON, only disable if explicitly set to false
  return params.get('cute') !== 'false';
}
export const cuteMode = writable<boolean>(getCuteDefault());

// Demo mode: show demo projects when ≤3 real projects - ON by default
function getFakeDefault(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  // Default ON, only disable if explicitly set to false
  return params.get('demo') !== 'false' && params.get('fake') !== 'false';
}
export const fakeMode = writable<boolean>(getFakeDefault());

// Store for fake projects (refreshed periodically)
export const fakeProjects = writable<Project[]>([]);

// Derived: sorted projects array (real projects only)
export const realProjects = derived(state, ($state) => {
  const projects = Object.values($state.projects);

  // Sort by: blocked > working > idle, then by blockedSince (oldest first) or lastActivity
  return projects.sort((a, b) => {
    const statusOrder = { blocked: 0, working: 1, idle: 2 };
    const aOrder = statusOrder[a.status];
    const bOrder = statusOrder[b.status];

    if (aOrder !== bOrder) return aOrder - bOrder;

    // Within same status
    if (a.status === 'blocked' && b.status === 'blocked') {
      // Oldest blocked first (FIFO)
      return (a.blockedSince || 0) - (b.blockedSince || 0);
    }

    if (a.status === 'working' && b.status === 'working') {
      // Most recent activity first
      return b.lastActivityAt - a.lastActivityAt;
    }

    // Idle: alphabetical
    return a.name.localeCompare(b.name);
  });
});

// Derived: sorted projects including fake ones when enabled
export const sortedProjects = derived(
  [realProjects, fakeProjects, fakeMode],
  ([$realProjects, $fakeProjects, $fakeMode]) => {
    // Only add fakes if <3 real projects and fake mode is enabled (fill to 3 total)
    if (!$fakeMode || $realProjects.length >= 3) {
      return $realProjects;
    }

    // Real projects first, then fake ones
    return [...$realProjects, ...$fakeProjects];
  }
);

// Derived: stats
export const stats = derived(state, ($state) => {
  const projects = Object.values($state.projects);
  return {
    total: projects.length,
    blocked: projects.filter((p) => p.status === 'blocked').length,
    working: projects.filter((p) => p.status === 'working').length,
    idle: projects.filter((p) => p.status === 'idle').length,
  };
});

// Derived: detailed metrics (scoreboard)
export const metrics = derived(state, ($state) => {
  const projects = Object.values($state.projects);
  let totalAgents = 0;
  let workingAgents = 0;
  let blockedAgents = 0;
  let completedAgents = 0;
  let totalWorkingTimeMs = 0;
  let longestWorkingTimeMs = 0;
  let longestWorkingAgent: string | null = null;

  for (const project of projects) {
    const agents = Object.values(project.agents);
    for (const agent of agents) {
      totalAgents++;
      if (agent.status === 'working') workingAgents++;
      if (agent.status === 'blocked') blockedAgents++;
      if (agent.status === 'complete') completedAgents++;

      if (agent.workingTime) {
        totalWorkingTimeMs += agent.workingTime;
        if (agent.workingTime > longestWorkingTimeMs) {
          longestWorkingTimeMs = agent.workingTime;
          longestWorkingAgent = agent.name || agent.type;
        }
      }
    }
  }

  return {
    totalAgents,
    workingAgents,
    blockedAgents,
    completedAgents,
    totalWorkingTimeMs,
    longestWorkingTimeMs,
    longestWorkingAgent,
  };
});

// WebSocket connection
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

export function connect(): void {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    connected.set(true);
    console.log('[Argus] Connected to server');
  };

  ws.onmessage = (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);

      if (message.type === 'state_update' && message.payload) {
        state.set(message.payload as ArgusState);
      }
    } catch (e) {
      console.error('[Argus] Failed to parse message:', e);
    }
  };

  ws.onclose = () => {
    connected.set(false);
    console.log('[Argus] Disconnected, reconnecting in 3s...');

    // Reconnect after 3 seconds
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, 3000);
  };

  ws.onerror = (error) => {
    console.error('[Argus] WebSocket error:', error);
  };
}

export function disconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  connected.set(false);
}

// Ping to keep connection alive
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', payload: null }));
  }
}, 30000);

// Fake project generation and refresh
let fakeRefreshInterval: ReturnType<typeof setInterval> | null = null;

// Generate or refresh fake projects when state changes
state.subscribe(($state) => {
  const realCount = Object.keys($state.projects).length;
  const isFakeEnabled = get(fakeMode);

  if (isFakeEnabled && realCount < 3) {
    // Generate fake projects to fill up to 3 total
    const currentFakes = get(fakeProjects);
    const targetFakeCount = 3 - realCount;
    if (currentFakes.length !== targetFakeCount) {
      fakeProjects.set(generateFakeProjects(realCount));
    }
  } else {
    // Clear fake projects if we have 3+ real ones or demo mode is off
    fakeProjects.set([]);
  }
});

// Subscribe to fakeMode changes
fakeMode.subscribe(async ($fakeMode) => {
  if ($fakeMode) {
    // Fetch git activities for more realistic fake tasks
    await fetchGitActivities();

    // Generate initial fakes (fill to 3 total)
    const realCount = Object.keys(get(state).projects).length;
    if (realCount < 3) {
      fakeProjects.set(generateFakeProjects(realCount));
    }

    // Start refresh interval for fake activity updates
    if (!fakeRefreshInterval) {
      fakeRefreshInterval = setInterval(() => {
        const currentFakes = get(fakeProjects);
        if (currentFakes.length > 0) {
          fakeProjects.set(refreshFakeActivities(currentFakes));
        }
      }, 5000); // Refresh every 5 seconds
    }
  } else {
    // Clear fakes and stop refresh
    fakeProjects.set([]);
    if (fakeRefreshInterval) {
      clearInterval(fakeRefreshInterval);
      fakeRefreshInterval = null;
    }
  }
});
