<p align="center">
  <img src="argus%20panoptes.jpg" alt="Argus Panoptes" width="800">
</p>

# Argus Panoptes

**Multi-Agent Supervision Dashboard**

A real-time dashboard for monitoring multiple concurrent Claude Code / Sisyphus sessions across projects. Named for Argus Panoptes, the hundred-eyed giant of Greek mythology.

## What It Does

Help a developer running multiple parallel agentic coding sessions triage their attention.

*"Which blocked agent needs me? What's the question? Bounce me there."*

**This IS:**
- An attention router
- A state-based view (what's blocked NOW, not what happened)
- A cognitive load reducer for concurrent agentic work

**This is NOT:**
- A "do everything from here" dashboard
- An event log / timeline viewer
- A replacement for the terminal

## The Loop

1. See at a glance which projects have blocked agents
2. See the question/blocker for each
3. Click to bounce to the correct VS Code window
4. Answer the question there (not in the dashboard)
5. Return to dashboard to see what's next

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start the server and UI

```bash
npm run dev
```

This starts:
- Server at http://localhost:4242
- UI dev server at http://localhost:5173

### 3. Install the Claude Code hook

Add this to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "Notification": [{
      "matcher": "idle_prompt",
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "UserPromptSubmit": [{
      "hooks": [{ "type": "command", "command": "node D:/git/Argus-Panoptes/hooks/argus-hook.mjs" }]
    }],
    "Stop": [{
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

**Important:** Update the path to match your installation location.

### 4. Test with mock events

```bash
node test/mock-events.mjs
```

Open http://localhost:4242 to see the dashboard populate with test data.

## Features

- **Real-time updates** via WebSocket
- **Priority queue** - blocked projects float to the top
- **Simple/Detailed view toggle** - see just status or full agent tree
- **Bounce to VS Code** - one click to open the project, question copied to clipboard
- **Subagent tracking** - see spawned agents and their status

## Architecture

```
Claude Code Session → Hook Script → Argus Server → WebSocket → Browser UI
```

The hook script intercepts Claude Code lifecycle events and POSTs them to the Argus server, which maintains state and broadcasts updates to connected browsers.

## Status

Early development. See [argus-spec.md](argus-spec.md) for the full specification.
