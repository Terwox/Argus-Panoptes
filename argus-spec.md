# Argus Panoptes: Multi-Agent Supervision Dashboard

## Overview

Argus is a calm, real-time supervision dashboard for concurrent agentic coding sessions. It integrates with Claude Code through hooks and transcript polling, and with OpenClaw through transcript discovery and normalization.

**ꙮ** — The multiocular O (U+A66E) from Old Cyrillic, used in a manuscript passage describing many-eyed seraphim, is the project's official glyph.

**Primary goal:** Help a developer triage attention across parallel sessions: "Which agent needs me? What's the question? Bounce me there."

**Argus is:**

- An attention router
- A state-based view of what is happening now
- A cognitive-load reducer for concurrent agentic work

**Argus is not:**

- A replacement for the terminal or editor
- An event log, transcript browser, or performance profiler
- A place to answer an agent directly

## User Loop

A developer may have several sessions running across different projects, with multiple conductors or subagents in each project. The intended loop is:

1. See which projects are working, idle, blocked, rate-limited, running a server, or in error.
2. Read the question or activity that matters.
3. Open the corresponding project in VS Code.
4. Answer or intervene in the original terminal.
5. Return to Argus and continue triage.

This loop remains the product contract. Argus deliberately routes attention instead of absorbing the work surface.

## Current Architecture

The server exposes Hypertext Transfer Protocol (HTTP) state endpoints and a WebSocket update channel.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Event and discovery sources                                        │
│                                                                    │
│ Claude Code hooks ───────────────┐                                 │
│ Claude Code transcript polling ──┼──────┐                          │
│ OpenClaw transcript polling ─────┘      │                          │
└─────────────────────────────────────────┼──────────────────────────┘
                                          ▼
                              ┌────────────────────────┐
                              │ Argus server           │
                              │                        │
                              │ event normalization    │
                              │ in-memory state        │
                              │ activity discovery     │
                              │ HTTP + WebSocket       │
                              └───────────┬────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         ▼                                 ▼
              ┌─────────────────────┐          ┌─────────────────────┐
              │ Browser client      │          │ VS Code extension   │
              │ Svelte + Vite       │          │ bundled webview     │
              └─────────────────────┘          └─────────────────────┘
```

### Components

1. **Claude Code hook adapter**
   - `hooks/argus-hook.mjs` maps lifecycle hooks to Argus events.
   - Hooks provide prompt, notification, stop, and subagent lifecycle signals.

2. **Transcript discovery and polling**
   - `server/discover.ts` discovers active Claude Code and OpenClaw transcripts.
   - Fast activity polling refreshes recent work; a slower pass detects pending questions and other state.
   - Project paths come from transcript data rather than decoding ambiguous Claude directory names.

3. **OpenClaw adapter**
   - `server/openclaw-parser.ts` normalizes known OpenClaw message and tool-call shapes.
   - Recent OpenClaw session transcripts are registered with `source: 'openclaw'`.
   - Subagent lifecycle parsing and dedicated OpenClaw test coverage remain deferred and unverified; see [OpenClaw integration](specs/openclaw-integration.md).

4. **Argus server**
   - Receives events at `POST /events`.
   - Exposes current state at `GET /state` and health at `GET /health`.
   - Broadcasts state changes at `WebSocket /ws`.
   - Maintains local in-memory state and cleans up stale activity.

5. **Dashboard clients**
   - The browser client runs at port 5173 in development and connects to the server on port 4242.
   - The VS Code extension embeds a built copy of the webview and provides terminal integration.

## State and Event Model

The original design intentionally used a small normalized event schema so hooks and transcript adapters could feed the same state engine. That decision remains in effect.

### Projects

A project is keyed by its real filesystem path and contains one or more agents. Its derived status is one of:

- `idle`
- `working`
- `blocked`
- `error`
- `rate_limited`
- `server_running`

Projects record last activity and, when applicable, when blocking began. Multiple sessions in the same directory are merged into one project card rather than duplicating the project.

### Agents

An agent records:

- Identity and type: main, subagent, or background
- Source: Claude Code or OpenClaw when known
- Parent relationship for subagents
- Status and current activity
- Initial task, surfaced question, and to-do (TODO) progress
- Spawn and activity timestamps plus derived working time
- Session modes such as Ralph, Ultrawork, and planning
- Transcript path and current line when available
- Rate-limit reset metadata when detected

Agent roles use the originating type/name when available and fall back conservatively when the event or transcript does not expose it.

### Inbound events

The normalized event vocabulary is:

- `session_start`
- `session_end`
- `agent_spawn`
- `agent_blocked`
- `agent_unblocked`
- `agent_complete`
- `activity`

The server accepts partial source data and degrades to a calm, partial display rather than fabricating state.

## Dashboard Behavior

### Priority and layout

Blocked and error states receive the strongest placement and visual treatment. Blocked projects use first-in, first-out (FIFO) ordering, while non-blocked projects retain stable ordering to avoid a constantly rearranging dashboard. Cards can expand for blocked or focused work, and compact mode provides a denser layout.

### Agent visualization

The cute bot view is not merely decoration: it is the data visualization.

- Bot count represents agent count.
- Role color and held tool represent agent identity.
- Expression, posture, and motion represent status.
- Conductors remain visually distinct from delegated agents.
- Speech bubbles present current activity or the blocking question.
- Decision mode suppresses nonessential bubbles when input is needed.
- Truncated bubbles can expand on hover; a project detail panel provides deeper current-state context.

The original agent-tree view remains available for direct textual inspection alongside the glanceable character visualization.

### Calm interaction rules

- Use "Needs input" rather than alarm language.
- Do not show blocked-state waiting timers, countdowns, or other anxiety-inducing elapsed timers; the shared low-salience fatigue duration may appear after 30 minutes for non-complete agents.
- Keep audio optional and preserve complete visual operation when muted.
- Use pointer cursors for exit actions, not routine in-dashboard selection.
- Keep bots, bubbles, labels, and desks contained and legible.
- Respect light/dark system themes and reduced-motion preferences.

The full rationale and audit history live in [Design principles](specs/design-principles.md).

## VS Code Bounce and Navigation

The implemented bounce uses a `vscode://file/` uniform resource identifier (URI) for the project path. The project-card VS Code button uses the shared bounce helper to copy a surfaced blocked question or error before opening the project. The detail-panel button uses the same helper but supplies only a blocked question; it does not select an error message for copying.

Bot and keyboard behavior is deliberately more direct. Clicking any bot triggers its in-dashboard bobble and reaction; clicking a blocked bot additionally opens the project in VS Code without copying the question. Number keys select a project, Tab cycles through blocked projects, and Enter opens the selected project directly without copying text. Clicking a non-blocked bot remains in the dashboard and may temporarily reveal its suppressed bubble.

This is intentionally a project-level bounce. Activating a precise terminal or transcript position would require stable terminal/session registration and editor application programming interface (API) capabilities that are not currently available to Argus.

Transcript navigation remains future work. The active source note is intentionally preserved in `client/src/components/CuteWorld.svelte`:

> FUTURE: Bubble click → transcript navigation (not yet working, needs VS Code terminal scrollback API)

## Current Capability Summary

| Capability | Status | Notes |
|---|---|---|
| Event ingestion and in-memory state | Implemented | Shared normalized event model |
| HTTP state and WebSocket updates | Implemented | Server defaults to port 4242 |
| Browser dashboard | Implemented | Vite development server uses port 5173 |
| Project prioritization and stable ordering | Implemented | Blocked projects first; blocked FIFO |
| Multiple conductors and subagents | Implemented | Same-path sessions merge into one project |
| Questions, activity, TODOs, and modes | Implemented | Hook and transcript evidence is combined |
| VS Code project bounce and clipboard copy | Implemented | Project-card button copies a blocked question or error; detail panel copies a blocked question |
| Cute bot and textual agent views | Implemented | Includes fatigue, completion, error, rate-limit, and server states |
| Session recovery by transcript discovery | Implemented | Claude Code and core OpenClaw discovery |
| OpenClaw main-session discovery and parsing | Implemented, verification limited | Known JSON Lines (JSONL) shapes are normalized |
| OpenClaw subagent lifecycle | Deferred/unverified | Transcript layout and lifecycle patterns need real samples |
| Dedicated OpenClaw parser/discovery tests | Deferred | Requires sanitized representative fixtures |
| Transcript-position navigation | Future | Source FUTURE note remains active |
| Persistent history/database | Future | Current product intentionally shows live state |

## Historical Design Decisions

The repository began as a minimum viable product (MVP) specification with several unresolved implementation choices. Those questions produced the following durable decisions:

### Hooks plus discovery, not a Sisyphus fork

The early design considered modifying Sisyphus to emit events. Argus instead uses Claude Code's native hooks and transcript discovery so it can operate independently. Polling is also important for recovery when Argus starts after a session and for signals not reliably represented by a hook.

### Current state over history

The original data model used an in-memory map, with SQLite deferred. That choice supports the product's role as a calm attention router rather than an audit log. Persistent history remains possible future work, but it must not displace live triage.

### Windows-first project routing

The initial goal was a practical, local Windows workflow. Opening the project in VS Code and copying the question was chosen as the reliable "good enough" bounce. Precise terminal activation was explicitly deferred.

### Data pipeline before visual polish

The original implementation guidance was "the cute bots can wait; the data pipeline cannot." The bot view later became the product's distinctive visualization, but the principle remains: visual confidence must be grounded in real event/transcript state.

### Calm over complete

The dashboard intentionally trades information density for spatial clarity and low anxiety. Always-visible but intelligently suppressed speech bubbles, stable project ordering, non-alarming language, and role-specific bot identity all follow from that decision.

## Remaining Roadmap

The following items are not represented as completed work:

### Integration and navigation

- Verify OpenClaw parsing against sanitized transcripts from multiple real installations.
- Define and implement OpenClaw subagent spawn/work/complete mapping.
- Add dedicated OpenClaw parser, discovery, mixed-source, and lifecycle tests.
- Investigate transcript-position navigation if VS Code exposes a stable terminal or scrollback API.
- Investigate smart terminal bounce only if sessions can register a reliable terminal identity.

### Product scope

- Optional user-defined priority pinning
- Optional persistent history without turning the dashboard into a log viewer
- Claude Desktop activity monitoring
- Platform-specific verification beyond the Windows-first workflow

### Explicit non-goals unless requirements change

- Authentication for the local single-user workflow
- OpenClaw gateway WebSocket interception
- Answering questions inside the dashboard
- Bot clustering that sacrifices separation and legibility

## Success Criteria

Argus succeeds when a developer can run several sessions across projects, immediately see which project needs input, read the actual question, open the correct project, respond in the original terminal, and see the dashboard return to an active state without visual urgency or ambiguity.

## Related Documents

- [README and operating commands](README.md)
- [Design principles and audit framework](specs/design-principles.md)
- [OpenClaw integration boundary](specs/openclaw-integration.md)
- [VS Code extension workflow](vscode-extension/README.md)
