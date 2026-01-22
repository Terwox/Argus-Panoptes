# Argus Panoptes: Multi-Agent Supervision Dashboard

## Overview

Argus is a real-time supervision dashboard for monitoring multiple concurrent Claude Code / Sisyphus sessions across projects. Named for Argus Panoptes, the hundred-eyed giant of Greek mythology.

**ꙮ** — The multiocular O (U+A66E) from Old Cyrillic, used in a single manuscript passage describing many-eyed seraphim. The official glyph of this project.

**Primary goal:** Help a developer running multiple parallel agentic coding sessions triage their attention. "Which blocked agent needs me? What's the question? Bounce me there."

**This is NOT:**
- A "do everything from here" dashboard
- An event log / timeline viewer
- A replacement for the terminal

**This IS:**
- An attention router
- A state-based view (what's blocked NOW, not what happened)
- A cognitive load reducer for concurrent agentic work

## User Story

I have 2-5 Sisyphus sessions running in parallel across different projects. Each session may spawn subagents. When an agent needs human input, I want to:

1. See at a glance which projects have blocked agents
2. See the question/blocker for each
3. Click to bounce to the correct VS Code window/terminal
4. Answer the question there (not in the dashboard)
5. Return to dashboard to see what's next

## Architecture

### High-Level

```
┌─────────────────────────────────────────────────────────────────┐
│  Sisyphus Sessions (multiple)                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │Project A│ │Project B│ │Project C│                           │
│  │Sisyphus │ │Sisyphus │ │Sisyphus │                           │
│  │ └─sub1  │ │ └─sub1  │ │ └─sub1  │                           │
│  │ └─sub2  │ │         │ │ └─sub2  │                           │
│  └────┬────┘ └────┬────┘ └────┬────┘                           │
│       │           │           │                                 │
│       ▼           ▼           ▼                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Event Emitter (hooks or custom)                        │   │
│  │  - session_start, session_end                           │   │
│  │  - agent_spawn, agent_complete                          │   │
│  │  - agent_blocked (question), agent_unblocked            │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Argus Server   │
                    │  (local, persistent)
                    │  - receives events│
                    │  - maintains state│
                    │  - serves UI      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Argus Web UI   │
                    │  (browser)      │
                    │  - project cards│
                    │  - priority queue│
                    │  - bounce links │
                    └─────────────────┘
```

### Components

1. **Event Source** (investigation needed)
   - Either: Extend Sisyphus to emit structured events
   - Or: Hook into Claude Code's native hook system
   - Or: Both (sisyphus wraps claude code hooks with higher-level semantics)

2. **Argus Server** (Node/Bun, runs locally)
   - HTTP endpoint to receive events
   - WebSocket to push state updates to UI
   - In-memory state (SQLite optional for history, not MVP)
   - Polls less aggressively when browser tab unfocused

3. **Argus UI** (Web, opens in browser)
   - Shows project cards in priority-queue layout
   - Blocked projects float to upper-left
   - Click to bounce to VS Code

## Investigation Required: Event Source

Before building, Claude Code needs to investigate:

### Questions about oh-my-claude-sisyphus:

1. **Does sisyphus currently emit events?** 
   - Check for any logging, webhook, or file-based event system
   - Look for hooks configuration

2. **How does sisyphus track sessions?**
   - Is there a session ID?
   - Is the project path stored?
   - Is the original task/goal stored anywhere?

3. **How does sisyphus spawn subagents?**
   - Does it use Claude Code's native subagent system?
   - Can we intercept subagent creation?

4. **What does a "blocked" state look like?**
   - Is there a `Notification` hook firing?
   - Is there a prompt waiting for user input?
   - How do we detect "agent is waiting for human"?

### Questions about Claude Code hooks:

1. **Which hooks fire when an agent needs user input?**
   - `Notification`? `Stop`? Something else?

2. **What data is available in hook payloads?**
   - Session ID, project path, question text?

3. **Can we get the current task description from hooks?**
   - Or do we need sisyphus to emit that separately?

### Investigation output:

After investigation, document:
- Event schema (what events, what fields)
- Where events come from (sisyphus? claude code? both?)
- What modifications to sisyphus are needed (if any)

## Data Model

### Project

```typescript
interface Project {
  id: string;                    // hash of project_path
  path: string;                  // absolute path to project folder
  name: string;                  // folder name (display)
  status: 'idle' | 'working' | 'blocked';
  lastActivity: timestamp;
  agents: Agent[];
  blockedSince?: timestamp;      // when it entered blocked state
}
```

### Agent

```typescript
interface Agent {
  id: string;                    // session_id from claude code
  type: 'main' | 'subagent';
  name?: string;                 // subagent type: 'architect', 'planner', 'executor', etc.
  task?: string;                 // subagent prompt / task description (truncated for display)
  status: 'working' | 'blocked' | 'complete';
  question?: string;             // if blocked, the question
  spawnedAt: timestamp;
  workingTime: number;           // ms spent working (for "tired" state later)
}
```

### Session Modes

```typescript
interface SessionModes {
  ralph: boolean;                // Ralph loop active (persistent until completion)
  ultrawork: boolean;            // Ultrawork mode (max parallelism)
  planning: boolean;             // In planning/interview mode
}
```

**Note**: Mode detection comes from skill invocation events or session metadata. Display as badges on the main agent.

### Subagent Naming

Subagents should display their **type** (from `subagent_type` parameter) and **task** (from prompt):

| Display | Source |
|---------|--------|
| `architect` | `subagent_type` from Task tool call |
| `planner` | `subagent_type` from Task tool call |
| `executor` | `subagent_type` from Task tool call |
| "Analyze TTS pipeline..." | First ~40 chars of prompt, truncated |

If `subagent_type` is not available, fall back to extracting from prompt or showing "subagent".
```

### Event (inbound)

```typescript
interface ArgusEvent {
  type: 'session_start' | 'session_end' | 'agent_spawn' | 
        'agent_blocked' | 'agent_unblocked' | 'agent_complete';
  timestamp: timestamp;
  projectPath: string;
  sessionId: string;
  agentId?: string;
  agentName?: string;
  task?: string;
  question?: string;
  metadata?: Record<string, any>;
}
```

## API Surface

### Argus Server

**POST /events**
- Receives events from sisyphus/hooks
- Updates internal state
- Broadcasts to WebSocket clients

**GET /state**
- Returns current state of all projects/agents
- Used for initial load

**WebSocket /ws**
- Pushes state updates to UI
- Clients subscribe on connect

### Event Emission (from sisyphus side)

Sisyphus (or hooks) should POST to Argus server:

```bash
# Example: agent blocked
curl -X POST http://localhost:ARGUS_PORT/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent_blocked",
    "timestamp": 1706000000000,
    "projectPath": "C:/Users/james/projects/DungeonFriends",
    "sessionId": "abc123",
    "agentId": "subagent-xyz",
    "agentName": "general-purpose",
    "question": "Should I refactor the TTS pipeline or add the new voice first?"
  }'
```

## UI Structure

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ARGUS                                        [settings] 👁️  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ DungeonFriends  │  │ Skullport28     │  │ Project C   │ │
│  │ ⚠️ BLOCKED      │  │ 🔄 Working...   │  │ 💤 Idle     │ │
│  │                 │  │                 │  │             │ │
│  │ sisyphus        │  │ sisyphus        │  │             │ │
│  │  └─ general 💬  │  │  └─ plan ⏳     │  │             │ │
│  │                 │  │                 │  │             │ │
│  │ "Should I..."   │  │                 │  │             │ │
│  │                 │  │                 │  │             │ │
│  │ [→ Go to VS Code]│ │                 │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Project D       │  │ Project E       │                  │
│  │ 💤 Idle         │  │ 💤 Idle         │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Priority Queue Logic

Projects are sorted by:
1. **Status**: blocked > working > idle
2. **Within blocked**: oldest blockedSince first (FIFO)
3. **Within working**: most recent activity first
4. **Within idle**: alphabetical

Grid layout: 2-3 columns depending on viewport. Blocked projects get larger cards.

### Card States

**Idle card:**
- Muted colors
- Just project name
- Small

**Working card:**
- Normal colors
- Project name + agent tree
- Agents show spinner or progress indication
- Medium size

**Blocked card:**
- Highlighted border (yellow/orange)
- Project name + agent tree
- Blocked agent shows question prominently
- "Go to VS Code" button
- Large size, floats to top-left

### Project Card Detail

```
┌─────────────────────────────────────┐
│ DungeonFriends            ⚠️ BLOCKED │
│ C:/Users/james/projects/...         │
├─────────────────────────────────────┤
│                                     │
│ 🏛️ sisyphus (main)                  │
│    ├─ 🔍 explore    ✅ done         │
│    └─ ⚙️ general    💬 blocked      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ "Should I refactor the TTS     │ │
│ │  pipeline or add the new voice │ │
│ │  first?"                       │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [→ Open in VS Code]         │
│                                     │
└─────────────────────────────────────┘
```

## Bounce Mechanism (Windows)

### MVP: "Good Enough" Bounce

When user clicks "Open in VS Code":

```javascript
// Option 1: Just open the folder
exec(`code "${projectPath}"`);

// Option 2: Open folder AND copy question to clipboard
clipboard.writeText(question);
exec(`code "${projectPath}"`);
// Show toast: "Question copied to clipboard"
```

This will:
- Focus VS Code if it's open with that folder
- Or open a new window if not
- User finds the right terminal manually

### Future: Smart Bounce

Would require:
- Sisyphus registering terminal PID on startup
- Writing session file: `{project}/.argus-session.json`
- Using Windows APIs to activate specific terminal

Not MVP.

## Tech Stack

### Server
- **Runtime**: Node.js or Bun
- **Framework**: Express or Hono (lightweight)
- **State**: In-memory Map (SQLite later for persistence)
- **WebSocket**: ws or built-in

### Client
- **Framework**: Svelte or React (dealer's choice)
- **Styling**: Tailwind CSS
- **Build**: Vite
- **State**: Simple reactive store

### Deployment
- Runs locally
- Server starts on `localhost:ARGUS_PORT` (pick a port, e.g., 4242)
- UI served by same server or separate Vite dev server
- User opens `http://localhost:4242` in browser

## File Structure

```
argus/
├── README.md
├── package.json
├── server/
│   ├── index.ts          # entry point
│   ├── state.ts          # in-memory state management
│   ├── events.ts         # event handlers
│   └── types.ts          # TypeScript interfaces
├── client/
│   ├── index.html
│   ├── src/
│   │   ├── App.svelte    # or App.tsx
│   │   ├── components/
│   │   │   ├── ProjectCard.svelte
│   │   │   ├── AgentTree.svelte
│   │   │   └── BlockedQuestion.svelte
│   │   ├── stores/
│   │   │   └── state.ts
│   │   └── lib/
│   │       └── bounce.ts # VS Code launch logic
│   └── vite.config.ts
├── hooks/                 # Hook scripts for sisyphus integration
│   └── send-to-argus.py  # or .js
└── docs/
    └── integration.md    # How to connect sisyphus
```

## MVP Scope

### In Scope (v0.1)
- [ ] Server receives events, maintains state
- [ ] UI shows project cards
- [ ] Priority queue layout (blocked → top-left)
- [ ] Card shows agent tree with status
- [ ] Blocked agents show question
- [ ] Click to open project in VS Code
- [ ] Copy question to clipboard on bounce
- [ ] WebSocket for real-time updates
- [ ] Works on Windows

### Out of Scope (Future)
- [ ] Cute animated bots walking around (flag: `--cute`)
- [ ] "Tired" state based on work time
- [ ] User-defined priority pinning
- [ ] Uptime / scoreboard metrics
- [ ] Hover for expanded context
- [ ] Mac support
- [ ] Persistent history / SQLite
- [ ] Smart terminal bounce (activate specific terminal)
- [ ] Authentication (not needed for local)
- [ ] **Claude Desktop monitoring** — show if Claude Desktop is running and if it's "thinking" (spinner active)
- [ ] **Discover running sessions** — poll for or detect sessions that started before Argus was running

## Implementation Order

### Phase 1: Investigation
1. Clone oh-my-claude / sisyphus
2. Investigate event emission capabilities
3. Document findings
4. Decide: modify sisyphus or hook into claude code directly

### Phase 2: Server
1. Set up Node/Bun project
2. Implement event ingestion endpoint
3. Implement in-memory state
4. Implement WebSocket broadcast
5. Test with curl / mock events

### Phase 3: Client
1. Set up Vite + Svelte/React
2. Implement project card component
3. Implement priority queue layout
4. Implement WebSocket connection
5. Implement bounce (open in VS Code)

### Phase 4: Integration
1. Create hook script that POSTs to Argus
2. Integrate with sisyphus (however investigation suggests)
3. Test end-to-end with real sisyphus session

### Phase 5: Polish
1. Better error handling
2. Reconnection logic for WebSocket
3. Loading states
4. Toast notifications on bounce
5. README with setup instructions

## Open Questions

1. **Port selection**: Fixed port? Auto-discover? Config file?
2. **Multiple users**: Does this need to handle multiple developers? (Probably not for MVP - single user, local only)
3. **Session recovery**: If Argus server restarts, how do we know about running sessions? (Probably: we don't, they re-register on next event)
4. **Sisyphus modification**: How willing is the oh-my-claude team to accept PRs? Or should Argus work independently via hooks?

## Success Criteria

MVP is successful when:
1. I can run 3 sisyphus sessions on 3 projects
2. Argus shows all 3 projects
3. When one blocks with a question, it floats to top-left
4. I click, VS Code opens to that project
5. Question is in my clipboard
6. I answer in terminal, agent unblocks
7. Argus updates to show it's working again

That's the loop.

---

## Notes for Claude Code

When implementing this:

1. **Start with investigation** - don't build until you understand the event source
2. **Mock events first** - get the server + UI working with fake data
3. **Keep it simple** - no premature optimization, no over-engineering
4. **Windows-first** - test on Windows, don't assume Mac patterns
5. **Ask me** - if something is ambiguous, ask rather than guess

The cute bots can wait. The data pipeline cannot.
