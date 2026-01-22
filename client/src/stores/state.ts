/**
 * Svelte store for Argus state
 *
 * Manages WebSocket connection and state updates
 */

import { writable, derived } from 'svelte/store';
import type { ArgusState, Project, WSMessage } from '../../../shared/types.js';

// WebSocket connection state
export const connected = writable(false);

// Main state store
export const state = writable<ArgusState>({
  projects: {},
  lastUpdated: 0,
});

// View mode: 'simple' or 'detailed'
export const viewMode = writable<'simple' | 'detailed'>('simple');

// Derived: sorted projects array
export const sortedProjects = derived(state, ($state) => {
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
