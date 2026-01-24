# Argus Panoptes - Project Instructions

## What Is This?

A **calm, ambient dashboard** for monitoring Claude Code sessions across multiple projects. It shows the conductor (main agent) orchestrating subagents, providing visual feedback without creating anxiety.

**Core Philosophy: Calm Over Complete** - We prioritize a calm, glanceable view over comprehensive information density. The goal is to answer "what's happening across my AI sessions?" at a glance, not to provide a detailed debugger.

## Design Principles

### Visual Clarity

1. **NOTHING SHOULD OVERLAP** - Bots, speech bubbles, name tags, desks must never overlap. Use collision detection, staggering, and smart positioning. Bubbles can overlap bots if necessary to avoid overlapping other bubbles.

2. **BOUNDARY CONTAINMENT** - Everything stays inside container boundaries. Bubbles clamp to edges.

3. **NO SCROLLING (unless necessary)** - The dashboard should fit in viewport without scrolling when ≤4 projects. Only allow scrolling when >4 projects or at very small resolutions. Cards should shrink to fit, not overflow.

### Calm UX (No Anxiety)

4. **NO VISIBLE TIMERS** - No "47s ago" anxiety counters. No elapsed time displays. Just "working" vs "blocked".

5. **NO ANXIETY-INDUCING ELEMENTS** - This dashboard helps users calmly switch context and play whack-a-mole with projects. It is NOT a GO-GO-GO urgency dashboard.
   - No timers on blocked items
   - No pulsing/flashing animations on blocked states
   - "Needs input" instead of "BLOCKED"

6. **MAX 2 "NEEDS INPUT" NOTIFICATIONS** - When a project is blocked, show the blocked status in max 2 places: the header badge ("Needs input") and the conductor's speech bubble. Don't show redundant overlays or duplicate the question in subagent bubbles.

### Visual Hierarchy

7. **CONDUCTOR IS SPECIAL** - Only the conductor (main bot) gets the blue body color, making it easy to identify at a glance. All other bots get role-specific colors.

8. **ROLE-BASED IDENTITY** - Each role has a distinct body color AND held tool that match their personality:
   - Conductor: blue + baton
   - Architect: indigo + compass
   - Executor: slate + pipe wrench
   - Explorer: purple + magnifying glass
   - Designer: pink + paintbrush
   - Writer: orange + pencil
   - Researcher: sky + book
   - Tester: lime + bug net
   - etc.

9. **BUBBLES ALWAYS VISIBLE** - Speech bubbles are always visible. Toggling creates cognitive load.

### Data Integrity

10. **DON'T DECODE PROJECT PATHS** - Claude's directory encoding (e.g., `d--git-Argus-Panoptes`) is ambiguous (can't distinguish `-` as path separator vs literal hyphen). Always get the actual `cwd` from the transcript file instead of trying to decode directory names.

11. **NO DUPLICATE PROJECTS** - Multiple Claude sessions in the same directory should be merged into one project card showing all agents. Never show the same project path twice.

12. **USER QUESTIONS ARE #1 PRIORITY** - The primary purpose of this dashboard is surfacing questions that terminals have for users. Detect ALL blocking tool calls: AskUserQuestion, ExitPlanMode, EnterPlanMode, permission prompts. Show the actual question text, not generic "Waiting...".

## Tradeoffs We Accept

| We Choose | We Lose |
|-----------|---------|
| Spatial clarity | Information density |
| Calm, non-anxious UX | Precise timing data |
| Clear visual hierarchy | Uniform treatment |
| Role identity via color+tool | Simpler rendering |
| Always-visible bubbles | Screen real estate |
| Reduced notification fatigue | Detailed subagent status |

## What This App Is NOT

- A debugger or logging tool
- A performance profiler
- A notification center (use native notifications for that)
- A comprehensive monitoring solution

## Future Ideas

- **Assembly animation**: When conductor spawns a subagent, animate piece-by-piece assembly (body → arms → legs → antenna → mouth → eyes) instead of growing/scaling up.

- **Server/daemon detection**: Background tasks that are servers (Ollama, dev servers, etc.) run indefinitely and will never "complete". Detect these and show them differently - maybe a different status like "running" with a server icon, or allow marking them as "service" type. Currently they show as perpetually "working" which is misleading.

## Visual Testing

**MANDATORY**: Before telling the user the dashboard looks a certain way, use `claude --chrome` to take a screenshot and CONFIRM it actually looks that way. Never claim UI changes are working without visual verification.

The dashboard runs at http://localhost:5173.

## Development

- Server: `npm run dev:server` (runs on port 4242)
- Client: `npm run dev` (runs on port 5173)
- Both: `npm run dev:all`

## Architecture

- **client/**: Svelte frontend with cute robot visualization
- **server/**: Hono server with WebSocket for real-time updates
- **hooks/**: Claude Code hook script that intercepts events
- **shared/**: TypeScript types shared between client/server

## Key Files

- `hooks/argus-hook.mjs` - Intercepts Claude Code events and sends to server
- `server/discover.ts` - Polls transcripts for current activity and blocked status
- `client/src/components/CuteWorld.svelte` - Robot visualization
- `client/src/components/CuteBot.svelte` - Individual robot with role-based tools/pants
