/**
 * Embedded Argus Server
 *
 * Runs the Argus HTTP + WebSocket server within VS Code.
 * Reuses the existing server logic from ../server/
 */

import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Server } from 'http';
import type { WSContext } from 'hono/ws';

// Import types from shared
interface ArgusState {
  projects: Record<string, Project>;
  completedWork: CompletedWorkItem[];
  lastUpdated: number;
}

interface Project {
  id: string;
  path: string;
  name: string;
  status: 'idle' | 'working' | 'blocked' | 'rate_limited' | 'server_running';
  lastActivityAt: number;
  blockedSince?: number;
  agents: Record<string, Agent>;
  lastUserMessage?: string;
  blockedAgentCount?: number;
  workingAgentCount?: number;
}

interface Agent {
  id: string;
  name?: string;
  type: 'main' | 'subagent' | 'background';
  parentId?: string;
  status: 'idle' | 'working' | 'blocked' | 'complete' | 'rate_limited' | 'server_running';
  task?: string;
  currentActivity?: string;
  question?: string;
  spawnedAt: number;
  lastActivityAt: number;
  workingTime?: number;
  rateLimitResetAt?: number;
}

interface CompletedWorkItem {
  id: string;
  agentName: string;
  task: string;
  completedAt: number;
  projectId: string;
  projectName: string;
}

type StateChangeCallback = (state: ArgusState) => void;

export class ArgusServer {
  private port: number;
  private server: Server | null = null;
  private state: ArgusState = {
    projects: {},
    completedWork: [],
    lastUpdated: 0,
  };
  private wsClients: Set<WSContext> = new Set();
  private stateChangeCallbacks: StateChangeCallback[] = [];

  constructor(port: number = 4242) {
    this.port = port;
  }

  async start(): Promise<void> {
    const app = new Hono();
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

    // CORS for development
    app.use('*', cors());

    // Health check
    app.get('/health', (c) => c.json({ status: 'ok' }));

    // Get current state (both endpoints for compatibility)
    app.get('/state', (c) => c.json(this.state));
    app.get('/api/state', (c) => c.json(this.state));

    // Receive events from hook script (both endpoints for compatibility)
    app.post('/events', async (c) => {
      try {
        const event = await c.req.json();
        this.handleEvent(event);
        return c.json({ ok: true });
      } catch (error) {
        console.error('[Argus Server] Error handling event:', error);
        return c.json({ error: 'Invalid event' }, 400);
      }
    });
    app.post('/api/event', async (c) => {
      try {
        const event = await c.req.json();
        this.handleEvent(event);
        return c.json({ success: true });
      } catch (error) {
        console.error('[Argus Server] Error handling event:', error);
        return c.json({ error: 'Invalid event' }, 400);
      }
    });

    // WebSocket /ws - Real-time updates
    app.get(
      '/ws',
      upgradeWebSocket(() => ({
        onOpen: (_event, ws) => {
          this.wsClients.add(ws);
          // Send current state on connect
          ws.send(JSON.stringify({
            type: 'state_update',
            payload: this.state,
          }));
        },
        onMessage: (event, ws) => {
          // Handle ping/pong
          try {
            const msg = JSON.parse(event.data.toString());
            if (msg.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', payload: null }));
            }
          } catch (e) {
            // Ignore invalid messages
          }
        },
        onClose: (_event, ws) => {
          this.wsClients.delete(ws);
        },
      }))
    );

    // Start server
    this.server = serve({
      fetch: app.fetch,
      port: this.port,
    }) as Server;

    // Inject WebSocket handling
    injectWebSocket(this.server);

    console.log(`[Argus] Server started on port ${this.port}`);
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.wsClients.clear();
  }

  getState(): ArgusState {
    return this.state;
  }

  onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  private handleEvent(event: any): void {
    // Process event and update state
    // This is a simplified version - the full logic is in ../server/state.ts
    const { type, projectPath, projectName, sessionId, agentId } = event;

    if (!projectPath) return;

    const projectId = this.hashPath(projectPath);

    // Ensure project exists
    if (!this.state.projects[projectId]) {
      this.state.projects[projectId] = {
        id: projectId,
        path: projectPath,
        name: projectName || this.extractProjectName(projectPath),
        status: 'idle',
        lastActivityAt: Date.now(),
        agents: {},
      };
    }

    const project = this.state.projects[projectId];
    project.lastActivityAt = Date.now();

    // Handle different event types
    switch (type) {
      case 'session_start':
        // Add main agent
        project.agents[sessionId] = {
          id: sessionId,
          type: 'main',
          status: 'working',
          spawnedAt: Date.now(),
          lastActivityAt: Date.now(),
        };
        project.status = 'working';
        break;

      case 'session_end':
        // Remove agent
        delete project.agents[sessionId];
        this.updateProjectStatus(project);
        break;

      case 'agent_blocked':
        if (project.agents[agentId || sessionId]) {
          project.agents[agentId || sessionId].status = 'blocked';
          project.agents[agentId || sessionId].question = event.question;
        }
        project.status = 'blocked';
        project.blockedSince = Date.now();
        break;

      case 'agent_unblocked':
        if (project.agents[agentId || sessionId]) {
          project.agents[agentId || sessionId].status = 'working';
          project.agents[agentId || sessionId].question = undefined;
        }
        this.updateProjectStatus(project);
        break;

      case 'activity':
        if (project.agents[agentId || sessionId]) {
          project.agents[agentId || sessionId].lastActivityAt = Date.now();
          if (event.task) {
            project.agents[agentId || sessionId].currentActivity = event.task;
          }
        }
        break;
    }

    this.state.lastUpdated = Date.now();
    this.notifyStateChange();
    this.broadcastState();
  }

  private updateProjectStatus(project: Project): void {
    const agents = Object.values(project.agents);
    if (agents.length === 0) {
      project.status = 'idle';
      return;
    }

    if (agents.some((a) => a.status === 'blocked')) {
      project.status = 'blocked';
    } else if (agents.some((a) => a.status === 'rate_limited')) {
      project.status = 'rate_limited';
    } else if (agents.some((a) => a.status === 'server_running')) {
      project.status = 'server_running';
    } else if (agents.some((a) => a.status === 'working')) {
      project.status = 'working';
    } else {
      project.status = 'idle';
    }

    if (project.status !== 'blocked') {
      project.blockedSince = undefined;
    }
  }

  private notifyStateChange(): void {
    for (const callback of this.stateChangeCallbacks) {
      try {
        callback(this.state);
      } catch (error) {
        console.error('[Argus Server] State change callback error:', error);
      }
    }
  }

  private broadcastState(): void {
    const message = JSON.stringify({
      type: 'state_update',
      payload: this.state,
    });

    for (const client of this.wsClients) {
      try {
        client.send(message);
      } catch (error) {
        this.wsClients.delete(client);
      }
    }
  }

  private hashPath(path: string): string {
    // Simple hash for project ID
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
      const char = path.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private extractProjectName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Unknown';
  }

  // Check for rate limit expiry and emit events
  checkRateLimitExpiry(): { projectPath: string; projectName: string }[] {
    const expired: { projectPath: string; projectName: string }[] = [];

    for (const project of Object.values(this.state.projects)) {
      for (const agent of Object.values(project.agents)) {
        if (
          agent.status === 'rate_limited' &&
          agent.rateLimitResetAt &&
          Date.now() > agent.rateLimitResetAt
        ) {
          expired.push({
            projectPath: project.path,
            projectName: project.name,
          });

          // Clear rate limit state
          agent.status = 'idle';
          agent.rateLimitResetAt = undefined;
        }
      }
    }

    if (expired.length > 0) {
      this.notifyStateChange();
      this.broadcastState();
    }

    return expired;
  }
}
