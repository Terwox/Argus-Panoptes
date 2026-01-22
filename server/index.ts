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

const PORT = parseInt(process.env.ARGUS_PORT || '4242', 10);

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// CORS for local development
app.use('*', cors());

// Connected WebSocket clients
const clients = new Set<WSContext>();

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

// WebSocket /ws - Real-time updates
app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onOpen: (_event, ws) => {
      clients.add(ws);
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
    },
  }))
);

// Cleanup stale projects every 5 minutes
setInterval(() => {
  state.cleanupStale();
}, 5 * 60 * 1000);

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
