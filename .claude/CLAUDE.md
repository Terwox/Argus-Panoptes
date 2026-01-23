# Argus Panoptes - Project Instructions

## Design Principles

1. **NOTHING SHOULD OVERLAP** - Bots, speech bubbles, name tags must never overlap. Use collision detection and staggering.

2. **NO ANXIETY-INDUCING ELEMENTS** - This dashboard helps users calmly switch context and play whack-a-mole with projects. It is NOT a GO-GO-GO urgency dashboard.
   - No timers on blocked items
   - No pulsing/flashing animations on blocked states
   - "Needs input" instead of "BLOCKED"

3. **DON'T DECODE PROJECT PATHS** - Claude's directory encoding (e.g., `d--git-Argus-Panoptes`) is ambiguous (can't distinguish `-` as path separator vs literal hyphen). Always get the actual `cwd` from the transcript file instead of trying to decode directory names.

4. **NO SCROLLING (unless necessary)** - The dashboard should fit in viewport without scrolling when ≤4 projects. Only allow scrolling when >4 projects or at very small resolutions. Cards should shrink to fit, not overflow.

5. **NO DUPLICATE PROJECTS** - Multiple Claude sessions in the same directory should be merged into one project card showing all agents. Never show the same project path twice.

6. **MAX 2 "NEEDS INPUT" NOTIFICATIONS** - When a project is blocked, show the blocked status in max 2 places: the header badge ("Needs input") and the conductor's speech bubble. Don't show redundant overlays or duplicate the question in subagent bubbles.

## Future Ideas

- **Assembly animation**: When conductor spawns a subagent, animate piece-by-piece assembly (body → arms → legs → antenna → mouth → eyes) instead of growing/scaling up.

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
