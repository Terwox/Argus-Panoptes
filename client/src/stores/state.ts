/**
 * Svelte store for Argus state
 *
 * Manages WebSocket connection and state updates
 */

import { writable, derived, get } from 'svelte/store';
import type { ArgusState, Project, ProjectStatus, Agent, WSMessage } from '../../../shared/types.js';
import { generateFakeProjects, refreshFakeActivities, fetchGitActivities } from '../lib/fakeProjects.js';
import { requestNotificationPermission, notifyBlockedProject, clearNotificationState } from '../lib/notifications.js';
import { playChime } from '../lib/sounds.js';
import { toasts } from './toast.js';

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

// Demo mode: show demo projects when ≤3 real projects - OFF by default
function getFakeDefault(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  // Default OFF, only enable if explicitly set to true
  return params.get('demo') === 'true' || params.get('fake') === 'true';
}
export const fakeMode = writable<boolean>(getFakeDefault());

// Store for fake projects (refreshed periodically)
export const fakeProjects = writable<Project[]>([]);

// Selection state: currently selected project ID (for keyboard nav)
export const selectedProject = writable<string | null>(null);

// Focus mode: show only this project ID
export const focusedProject = writable<string | null>(null);

// Archived projects: synced with localStorage
function getArchivedFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('argus-archived');
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

export const archivedProjects = writable<Set<string>>(getArchivedFromStorage());

// Sync to localStorage on change
archivedProjects.subscribe($archived => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argus-archived', JSON.stringify([...$archived]));
  }
});

export function archiveProject(id: string) {
  archivedProjects.update(set => { set.add(id); return new Set(set); });
}

export function unarchiveProject(id: string) {
  archivedProjects.update(set => { set.delete(id); return new Set(set); });
}

// Show archived projects toggle
export const showArchived = writable<boolean>(false);

// Track which projects have already triggered notifications (prevent duplicates)
export const notifiedBlocked = writable<Set<string>>(new Set());

// Layout mode: grid (default) or compact
function getLayoutModeFromStorage(): 'grid' | 'compact' {
  if (typeof window === 'undefined') return 'grid';
  const stored = localStorage.getItem('argus-layout-mode');
  return (stored === 'compact' || stored === 'grid') ? stored : 'grid';
}

export const layoutMode = writable<'grid' | 'compact'>(getLayoutModeFromStorage());

// Sync to localStorage on change
layoutMode.subscribe($mode => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argus-layout-mode', $mode);
  }
});

// Sound enabled toggle
function getSoundEnabledFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('argus-sound-enabled');
  return stored === 'true';
}

export const soundEnabled = writable<boolean>(getSoundEnabledFromStorage());

// Sync to localStorage on change
soundEnabled.subscribe($enabled => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argus-sound-enabled', $enabled.toString());
  }
});

// Overload mode: show ALL speech bubbles for ALL bots - chaos mode!
function getOverloadModeFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('argus-overload-mode');
  return stored === 'true';
}

export const overloadMode = writable<boolean>(getOverloadModeFromStorage());

// Sync to localStorage on change
overloadMode.subscribe($enabled => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argus-overload-mode', $enabled.toString());
  }
});

// Theme mode: 'system' | 'dark' | 'light' — defaults to system preference
function getThemeFromStorage(): 'system' | 'dark' | 'light' {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem('argus-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return 'system';
}

export function applyTheme(mode: 'system' | 'dark' | 'light') {
  if (typeof window === 'undefined') return;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effective = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  document.documentElement.setAttribute('data-theme', effective);
}

export const themeMode = writable<'system' | 'dark' | 'light'>(getThemeFromStorage());

themeMode.subscribe($theme => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('argus-theme', $theme);
    applyTheme($theme);
  }
});

// Listen for OS color scheme changes (re-evaluate when in 'system' mode)
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentMode = get(themeMode);
    if (currentMode === 'system') applyTheme('system');
  });
}

// Reduced motion preference (reactive to OS setting)
export const prefersReducedMotion = writable<boolean>(false);

if (typeof window !== 'undefined') {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  prefersReducedMotion.set(mql.matches);
  mql.addEventListener('change', (e) => prefersReducedMotion.set(e.matches));
}

// Track when projects were first seen (for stable ordering)
const projectFirstSeen = new Map<string, number>();

// Derived: sorted projects array (real projects only)
// Stable ordering: blocked first, then focused, then by firstSeen order
export const realProjects = derived(
  [state, focusedProject],
  ([$state, $focusedProject]) => {
    const projects = Object.values($state.projects);

    // Track first-seen time for new projects
    for (const project of projects) {
      if (!projectFirstSeen.has(project.id)) {
        projectFirstSeen.set(project.id, Date.now());
      }
    }

    // Clean up tracking for removed projects
    for (const id of projectFirstSeen.keys()) {
      if (!$state.projects[id]) {
        projectFirstSeen.delete(id);
      }
    }

    // Sort: blocked first (FIFO), then focused, then by firstSeen (stable)
    return projects.sort((a, b) => {
      // 1. Blocked projects always come first (highest priority)
      const aBlocked = a.status === 'blocked';
      const bBlocked = b.status === 'blocked';
      if (aBlocked && !bBlocked) return -1;
      if (!aBlocked && bBlocked) return 1;

      // 2. Among blocked, oldest first (FIFO)
      if (aBlocked && bBlocked) {
        return (a.blockedSince || 0) - (b.blockedSince || 0);
      }

      // 3. Focused project comes next (but after blocked)
      const aFocused = a.id === $focusedProject;
      const bFocused = b.id === $focusedProject;
      if (aFocused && !bFocused) return -1;
      if (!aFocused && bFocused) return 1;

      // 4. Otherwise, stable order by first-seen time
      const aFirstSeen = projectFirstSeen.get(a.id) || 0;
      const bFirstSeen = projectFirstSeen.get(b.id) || 0;
      return aFirstSeen - bFirstSeen;
    });
  }
);

// Derived: sorted projects including fake ones when enabled, filtering archived
export const sortedProjects = derived(
  [realProjects, fakeProjects, fakeMode, archivedProjects, showArchived],
  ([$realProjects, $fakeProjects, $fakeMode, $archivedProjects, $showArchived]) => {
    // Filter out archived projects (unless showArchived is true or they become blocked)
    const filteredReal = $realProjects.filter(p => {
      const isArchived = $archivedProjects.has(p.id);
      if (!isArchived) return true; // Not archived, always show
      if ($showArchived) return true; // Show archived view enabled
      if (p.status === 'blocked') {
        // Auto-unarchive blocked projects
        unarchiveProject(p.id);
        return true;
      }
      return false; // Hidden archived project
    });

    // Only add fakes if <3 filtered real projects and fake mode is enabled
    if (!$fakeMode || filteredReal.length >= 3) {
      return filteredReal;
    }

    // Real projects first, then fake ones
    return [...filteredReal, ...$fakeProjects];
  }
);

// Derived: stats
export const stats = derived(state, ($state) => {
  const projects = Object.values($state.projects);
  return {
    total: projects.length,
    blocked: projects.filter((p) => p.status === 'blocked').length,
    rateLimited: projects.filter((p) => p.status === 'rate_limited').length,
    serverRunning: projects.filter((p) => p.status === 'server_running').length,
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

// Declare the global variables that VS Code extension injects
declare global {
  interface Window {
    ARGUS_VSCODE_WEBVIEW?: boolean;
    ARGUS_SERVER_PORT?: number;
  }
}

// Check if running in VS Code WebView (uses postMessage, not WebSocket)
// Use acquireVsCodeApi presence as the definitive check - it's always available in WebViews
function isVSCodeWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return 'acquireVsCodeApi' in window;
}

// Acquire VS Code API (only available in WebView context)
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

let vscodeApi: VSCodeAPI | null = null;

function getVSCodeAPI(): VSCodeAPI | null {
  if (vscodeApi) return vscodeApi;
  if (typeof window !== 'undefined' && 'acquireVsCodeApi' in window) {
    vscodeApi = (window as any).acquireVsCodeApi();
    return vscodeApi;
  }
  return null;
}

// WebSocket connection (for standalone mode)
let ws: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
}

// Handle incoming messages (works for both WebSocket and postMessage)
function handleMessage(message: WSMessage): void {
  if (message.type === 'state_update' && message.payload) {
    state.set(message.payload as ArgusState);
  }
}

export function connect(): void {
  // VS Code WebView mode: use postMessage instead of WebSocket
  if (isVSCodeWebView()) {
    connected.set(true); // Always "connected" in WebView mode

    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
      const message = event.data as WSMessage;
      handleMessage(message);
    });

    // Tell the extension we're ready to receive state
    const api = getVSCodeAPI();
    if (api) {
      api.postMessage({ type: 'ready' });
    }

    return;
  }

  // Standalone mode: use WebSocket
  if (ws && ws.readyState === WebSocket.OPEN) return;

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    connected.set(true);
  };

  ws.onmessage = (event) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      handleMessage(message);
    } catch (e) {
      console.error('[Argus] Failed to parse message:', e);
    }
  };

  ws.onclose = () => {
    connected.set(false);
    // Reconnect after 3 seconds
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(connect, 3000);
  };

  ws.onerror = (error) => {
    console.error('[Argus] WebSocket error:', error);
  };
}

export function disconnect(): void {
  if (isVSCodeWebView()) {
    // Nothing to disconnect in WebView mode
    return;
  }

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

// Ping to keep WebSocket connection alive (only in standalone mode)
setInterval(() => {
  if (!isVSCodeWebView() && ws && ws.readyState === WebSocket.OPEN) {
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

// Notification system: watch for state changes and emit toasts
let previousProjectStates = new Map<string, ProjectStatus>();
let previousAgentIds = new Map<string, Set<string>>(); // project.id -> set of agent IDs
let hasRequestedPermission = false;
let isInitialLoad = true;

// Helper to clean agent name for display
function cleanAgentName(name: string): string {
  return name.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '');
}

// Format rate limit reset time
function formatResetTime(timestamp: number | undefined): string {
  if (!timestamp) return 'soon';
  const resetDate = new Date(timestamp);
  return resetDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

state.subscribe(async ($state) => {
  const projects = Object.values($state.projects);

  for (const project of projects) {
    const previousStatus = previousProjectStates.get(project.id);
    const currentStatus = project.status;
    const agents = Object.values(project.agents) as Agent[];
    const previousAgents = previousAgentIds.get(project.id) || new Set<string>();
    const currentAgentIds = new Set(agents.map(a => a.id));

    // Skip toasts on initial load (don't spam user with existing state)
    if (!isInitialLoad) {
      // --- Agent spawned ---
      for (const agent of agents) {
        if (!previousAgents.has(agent.id) && agent.type === 'subagent') {
          const name = cleanAgentName(agent.name || agent.id);
          const task = agent.task ? agent.task.slice(0, 100) : 'starting work';
          toasts.addToast(`🤖 ${name} spawned: ${task}`, 'info', 8000, project.name);
        }
      }

      // --- Status changes ---
      if (currentStatus !== previousStatus) {
        // Rate limited
        if (currentStatus === 'rate_limited') {
          const rateLimitedAgent = agents.find(a => a.status === 'rate_limited');
          const resetTime = formatResetTime(rateLimitedAgent?.rateLimitResetAt);
          toasts.addToast(`☕ Rate limited - back at ${resetTime}`, 'info', 10000, project.name);
        }

        // Server running
        if (currentStatus === 'server_running' && previousStatus !== 'server_running') {
          const serverAgent = agents.find(a => a.status === 'server_running');
          const activity = serverAgent?.currentActivity || 'Server running';
          toasts.addToast(`🖥️ ${activity}`, 'info', 8000, project.name);
        }

        // Started working (from idle)
        if (currentStatus === 'working' && previousStatus === 'idle') {
          const workingAgent = agents.find(a => a.status === 'working');
          const activity = workingAgent?.currentActivity || workingAgent?.task;
          if (activity) {
            toasts.addToast(`▶️ Started: ${activity.slice(0, 80)}`, 'info', 6000, project.name);
          }
        }
      }
    }

    // Check if project just became blocked (keep OS notification + sound)
    if (currentStatus === 'blocked' && previousStatus !== 'blocked') {
      // Request permission on first blocked project (if not already done)
      if (!hasRequestedPermission) {
        hasRequestedPermission = true;
        await requestNotificationPermission();
      }

      // Show notification for newly blocked project
      notifyBlockedProject(project);

      // Play sound if enabled
      if (get(soundEnabled)) {
        playChime();
      }
    }

    // Check if project unblocked
    if (currentStatus !== 'blocked' && previousStatus === 'blocked') {
      clearNotificationState(project.id);
    }

    // Update tracked state
    previousProjectStates.set(project.id, currentStatus);
    previousAgentIds.set(project.id, currentAgentIds);
  }

  // Clean up tracking for deleted projects
  const currentProjectIds = new Set(projects.map(p => p.id));
  for (const [id] of previousProjectStates) {
    if (!currentProjectIds.has(id)) {
      previousProjectStates.delete(id);
      previousAgentIds.delete(id);
      clearNotificationState(id);
    }
  }

  // After first update, no longer initial load
  isInitialLoad = false;
});
