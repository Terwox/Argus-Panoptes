/**
 * Argus Server
 *
 * HTTP server for receiving events + WebSocket for UI updates
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import type { WSContext } from 'hono/ws';
import type { ArgusEvent, WSMessage } from '../shared/types.js';
import { handleEvent } from './events.js';
import * as state from './state.js';
import { discoverExistingSessions, checkPendingQuestions } from './discover.js';
import { getFakeActivitiesFromGit } from './gitScanner.js';

const PORT = parseInt(process.env.ARGUS_PORT || '4242', 10);

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// CORS for local development
app.use('*', cors());

// Connected WebSocket clients
const clients = new Set<WSContext>();

// Auto-shutdown configuration
const AUTO_SHUTDOWN_DELAY = 30 * 1000; // 30 seconds after last client disconnects
let shutdownTimer: ReturnType<typeof setTimeout> | null = null;

function startShutdownTimer(): void {
  if (shutdownTimer) return; // Already running
  console.log(`[Argus] No clients connected. Shutting down in ${AUTO_SHUTDOWN_DELAY / 1000}s...`);
  shutdownTimer = setTimeout(() => {
    console.log('[Argus] Auto-shutdown: No clients for 30s. Goodbye!');
    process.exit(0);
  }, AUTO_SHUTDOWN_DELAY);
}

function cancelShutdownTimer(): void {
  if (shutdownTimer) {
    clearTimeout(shutdownTimer);
    shutdownTimer = null;
    console.log('[Argus] Client connected. Shutdown cancelled.');
  }
}

// Broadcast state to all connected clients
function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(data);
    } catch (e) {
      // Client disconnected
      clients.delete(client);
    }
  }
}

// POST /events - Receive events from hook script
app.post('/events', async (c) => {
  try {
    const event = await c.req.json<ArgusEvent>();

    // Process event
    handleEvent(event);

    // Broadcast updated state to all clients
    broadcast({
      type: 'state_update',
      payload: state.getState(),
    });

    return c.json({ ok: true });
  } catch (error) {
    console.error('Error processing event:', error);
    return c.json({ error: 'Invalid event' }, 400);
  }
});

// GET /state - Get current state
app.get('/state', (c) => {
  return c.json(state.getState());
});

// GET /health - Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', uptime: process.uptime() });
});

// GET /git-activities - Get recent git activities for fake projects
app.get('/git-activities', (c) => {
  // Get paths from current projects
  const currentState = state.getState();
  const projectPaths = Object.values(currentState.projects).map(p => p.path);

  // If no projects, return empty (client will use built-in funny activities)
  if (projectPaths.length === 0) {
    return c.json({ activities: [] });
  }

  // Get activities from git commits
  const activities = getFakeActivitiesFromGit(projectPaths, 20);
  return c.json({ activities });
});

// WebSocket /ws - Real-time updates
app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onOpen: (_event, ws) => {
      clients.add(ws);
      // Cancel any pending shutdown
      cancelShutdownTimer();
      // Send current state on connect
      ws.send(
        JSON.stringify({
          type: 'state_update',
          payload: state.getState(),
        } satisfies WSMessage)
      );
    },
    onMessage: (event, ws) => {
      // Handle ping/pong
      try {
        const msg = JSON.parse(event.data.toString()) as WSMessage;
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', payload: null }));
        }
      } catch (e) {
        // Ignore invalid messages
      }
    },
    onClose: (_event, ws) => {
      clients.delete(ws);
      // Start shutdown timer if no clients remain
      if (clients.size === 0) {
        startShutdownTimer();
      }
    },
  }))
);

// Cleanup stale projects every 5 minutes
setInterval(() => {
  state.cleanupStale();
}, 5 * 60 * 1000);

// Refresh project statuses every 30 seconds for idle detection
// This catches sessions that went silent (e.g., VS Code closed without session_end)
setInterval(() => {
  state.refreshAllProjectStatuses();
  // Broadcast updated state so UI reflects idle status
  broadcast({
    type: 'state_update',
    payload: state.getState(),
  });
}, 30 * 1000);

// Check for pending AskUserQuestion calls every 10 seconds
// This catches cases where the AskUserQuestion tool doesn't trigger hooks
setInterval(() => {
  const updated = checkPendingQuestions();
  if (updated > 0) {
    // Broadcast updated state if any sessions changed to blocked
    broadcast({
      type: 'state_update',
      payload: state.getState(),
    });
  }
}, 10 * 1000);

// Start server
const server = serve({
  fetch: app.fetch,
  port: PORT,
});

injectWebSocket(server);

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ARGUS PANOPTES - Multi-Agent Supervision Dashboard    ║
║                                                           ║
║     Server running at http://localhost:${PORT}              ║
║     WebSocket at ws://localhost:${PORT}/ws                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

// Discover existing Claude sessions on startup
const discovered = discoverExistingSessions();
if (discovered > 0) {
  console.log(`[Argus] Discovered ${discovered} active session(s)`);

  // Broadcast initial state to any connected clients
  broadcast({
    type: 'state_update',
    payload: state.getState(),
  });
}
