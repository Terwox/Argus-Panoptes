<p align="center">
  <img src="argus%20panoptes.jpg" alt="Argus Panoptes" width="800">
</p>

# Argus Panoptes

**Multi-Agent Supervision Dashboard**

Argus is a calm, real-time dashboard for monitoring concurrent Claude Code sessions across projects. It receives Claude Code lifecycle events, discovers active transcripts, and parses recent OpenClaw transcripts. Named for Argus Panoptes, the hundred-eyed giant of Greek mythology.

## Purpose

Argus helps a developer running parallel agentic coding sessions decide where attention is needed:

> Which agent needs me? What is the question? Bounce me there.

**Argus is:**

- An attention router
- A current-state view of working, blocked, idle, rate-limited, server, and error states
- A cognitive-load reducer for concurrent agentic work

**Argus is not:**

- A replacement for the terminal or editor
- A transcript, event-log, or performance-debugging interface
- A place to answer agent questions directly

The normal loop is: notice a project that needs input, read the surfaced question, open that project in VS Code, answer there, then return to Argus.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server and client

```bash
npm run dev
```

This starts:

- The Argus server, with Hypertext Transfer Protocol (HTTP) application programming interface (API) endpoints and a WebSocket channel, at <http://localhost:4242>
- The Vite client at <http://localhost:5173>

On Windows, `start.bat` starts the server and client in separate terminals and opens the client in a browser. `npm run dev:all` provides the same combined development flow and opens the browser.

### 3. Install the Claude Code hook

Add the following hooks to `~/.claude/settings.json` and update the script path for your installation:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "SessionEnd": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "Notification": [{
      "matcher": "idle_prompt",
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "PermissionRequest": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "Stop": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "PreToolUse": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "PostToolUse": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "SubagentStart": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "SubagentStop": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }]
  }
}
```

Argus also polls Claude Code transcripts to recover sessions that predate the server and detect pending questions when a hook is insufficient.

### 4. Test with mock events

With the development server running:

```bash
node test/mock-events.mjs
```

Open or refresh <http://localhost:5173> to see the client populate with test data.

## Current Capabilities

- Real-time state updates over WebSocket
- Stable project ordering with blocked work prioritized first
- Simple, detailed, compact, focus, and project-detail views
- One-click VS Code routing with blocked questions copied to the clipboard
- Multiple conductors and subagents per project
- Current activity, task, to-do (TODO), mode, rate-limit, server, fatigue, and completion states
- Transcript discovery and polling for Claude Code
- Core OpenClaw transcript discovery and normalization
- Optional sound and desktop notifications
- Light, dark, system-theme, and reduced-motion support
- Embedded VS Code dashboard and terminal integration

OpenClaw subagent lifecycle parsing and dedicated OpenClaw tests remain deferred because real transcript variants have not been comprehensively verified. See the integration specification for the precise boundary.

## Architecture

```text
Claude Code hooks ───────────────┐
Claude Code transcript polling ──┼─> Argus server (state + HTTP + WebSocket) ─> Browser client
OpenClaw transcript polling ─────┘                                      └─────> VS Code webview
```

Key directories:

- `hooks/` — Claude Code hook adapter
- `server/` — event ingestion, discovery, parsing, state, HTTP, and WebSocket server
- `shared/` — types shared by the server and client
- `client/` — Svelte/Vite dashboard
- `vscode-extension/` — embedded dashboard and terminal integration

## Project Status and Documentation

Argus is an implemented local dashboard with an active roadmap, not an unbuilt minimum viable product (MVP). The current boundaries and historical rationale are documented in:

- [Product specification](argus-spec.md)
- [Design principles and audit framework](specs/design-principles.md)
- [OpenClaw integration](specs/openclaw-integration.md)
- [VS Code extension](vscode-extension/README.md)
