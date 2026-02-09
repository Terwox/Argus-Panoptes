# OpenClaw Integration Spec

**Status:** Ready to implement (needs a machine with OpenClaw running to verify JSONL parsing)
**Date:** 2026-02-08
**Prereq:** OpenClaw agent configured and generating transcripts

## Goal

Detect running OpenClaw sessions alongside Claude Code sessions so they appear as project cards on the Argus dashboard. OpenClaw agents and their sub-agents should render like any other bot — with role-appropriate colors and tools.

## Background Research

| Aspect | Claude Code | OpenClaw |
|--------|------------|----------|
| **Transcript dir** | `~/.claude/projects/{encodedDir}/*.jsonl` | `~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl` |
| **Sub-agents** | Subdirectory under session | Session key `agent:<id>:subagent:<uuid>` |
| **Hooks (real-time)** | Rich: SessionStart, SubagentStart, PreToolUse, etc. | `session:start`/`session:end` **planned but not yet shipped** |
| **Outbound hooks** | POSTs to HTTP endpoint (our hook script) | Not supported yet (hooks run inside gateway only) |
| **Session store** | None (transcripts only) | `sessions.json` map per agent |
| **JSONL format** | Anthropic API message format (type/message/content blocks) | **Undocumented — must verify from real transcripts** |

Key docs:
- [Session Management](https://docs.openclaw.ai/concepts/session)
- [Sub-Agents](https://docs.openclaw.ai/tools/subagents.md)
- [Hooks](https://docs.openclaw.ai/automation/hooks.md)

## Architecture Decision

**Polling only.** OpenClaw's hook system can't POST to external endpoints and the relevant lifecycle events aren't shipped yet. We reuse the same polling pattern Argus already uses for Claude Code: scan transcript directories for recently-modified `.jsonl` files.

Trade-off: No real-time events means up to 10s latency on state changes (matches existing Claude Code polling interval). This is fine for a calm dashboard. When OpenClaw ships `session:start`/`session:end` hooks with outbound HTTP, we can add a hook script for real-time updates.

## Implementation Plan

### Step 0: Verify JSONL format (manual, before coding)

On a machine with OpenClaw running:

```bash
# Find transcript files
ls ~/.openclaw/agents/*/sessions/*.jsonl

# Inspect a recent one
tail -20 ~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl | head -5
```

**Questions to answer from real transcripts:**

1. Does each line have a `type` field? What values? (`user`, `assistant`, `system`, `tool_result`?)
2. Is there a `cwd` or `workspaceDir` field? Where does it appear?
3. What do tool_use blocks look like? Same `{type: "tool_use", name: "...", input: {...}}` structure?
4. How are sub-agent transcripts stored? Separate files or inline?
5. Does `sessions.json` contain the workspace/cwd mapping we need?

Record findings in `specs/openclaw-jsonl-format.md` before proceeding.

### Step 1: Add OpenClaw discovery path to `server/discover.ts`

**New constant:**
```typescript
const OPENCLAW_AGENTS_DIR = join(homedir(), '.openclaw', 'agents');
```

**New function: `findActiveOpenClawTranscripts()`**

Mirrors `findActiveTranscripts()` but walks the different directory structure:

```
~/.openclaw/agents/
  ├── agent-abc/
  │   └── sessions/
  │       ├── sessions.json          ← agent metadata, workspace mapping
  │       ├── sess-001.jsonl         ← main session transcript
  │       └── sess-001-subagent-*.jsonl  ← sub-agent transcripts (if separate)
  └── agent-def/
      └── sessions/
          └── ...
```

Logic:
1. Iterate `~/.openclaw/agents/*/sessions/`
2. Find `.jsonl` files modified within `RECENT_THRESHOLD` (5 min)
3. Skip archived files (`*.deleted.*` suffix)
4. Return list of active transcript paths

**New function: `parseOpenClawTranscript(path)`**

Returns `{ sessionId, cwd, source: 'openclaw' }` or null.

- `sessionId`: filename without `.jsonl`
- `cwd`: Try extracting from transcript entries first (look for `cwd`, `workspaceDir`, or similar field). Fallback: read `sessions.json` in same directory for workspace mapping. Last resort: use the agent directory name.

### Step 2: Add `source` field to Agent type

In `shared/types.ts`, add to the `Agent` interface:

```typescript
source?: 'claude-code' | 'openclaw';
```

This lets the UI render OpenClaw bots differently if we want (e.g., claw icon, different antenna style). It also helps the server route to the correct parser.

In `ArgusEvent`:

```typescript
source?: 'claude-code' | 'openclaw';
```

### Step 3: Create `server/openclaw-parser.ts`

Adapter that normalizes OpenClaw JSONL entries into the same internal format the existing code expects. This isolates all OpenClaw-specific parsing so `discover.ts` stays clean.

```typescript
// Adapts OpenClaw transcript entries to the shape discover.ts expects
export interface NormalizedEntry {
  type: 'user' | 'assistant' | 'system';
  message?: {
    content?: string | ContentBlock[];
  };
  cwd?: string;
}

export function normalizeOpenClawEntry(raw: unknown): NormalizedEntry | null {
  // Map OpenClaw fields to Claude Code transcript shape
  // IMPLEMENTATION DEPENDS ON STEP 0 FINDINGS
}
```

**Why a separate file?** The OpenClaw JSONL format is undocumented and may change. Isolating the adapter means format changes only touch one file.

### Step 4: Wire into discovery loop

In `discoverExistingSessions()` (discover.ts:893), add a second scan after the Claude Code scan:

```typescript
// Existing: scan ~/.claude/projects/
// ...existing code...

// NEW: scan ~/.openclaw/agents/
if (existsSync(OPENCLAW_AGENTS_DIR)) {
  // iterate agents, find active transcripts, parse, register
  // Use source: 'openclaw' when calling state.onSessionStart()
}
```

In `checkPendingQuestions()` (the 10s polling loop), add OpenClaw transcripts to the scan list. The existing polling already iterates all registered sessions — we just need to make sure OpenClaw sessions get registered on startup and their transcripts get checked.

### Step 5: Sub-agent detection

OpenClaw sub-agents either:
- (a) Get their own transcript files with a naming convention like `{sessionId}-subagent-{uuid}.jsonl`, or
- (b) Are tracked inline in the main transcript via tool calls

**If (a):** Scan for files matching the sub-agent pattern, register as `type: 'subagent'` with `parentId` set to the main session.

**If (b):** Look for sub-agent spawn/complete patterns in the main transcript (similar to how we detect `Task` tool calls for Claude Code subagents in `extractCurrentActivity`).

**Determine which by inspecting real transcripts in Step 0.**

### Step 6: UI differentiation (optional, low priority)

In `CuteBot.svelte`, optionally render OpenClaw bots with a visual distinction:
- Different antenna style (claw-shaped?)
- Small "OC" badge or different eye shape
- Keep the same role-based color system — roles are universal

This is cosmetic and can ship later.

## What We're NOT Doing

- **No OpenClaw hook script.** Their hooks can't POST externally yet. When they can, we'll add `hooks/openclaw-hook.ts`.
- **No gateway WebSocket tap.** OpenClaw's gateway WS is for its own clients. Tapping it would be fragile and undocumented.
- **No `sessions.json` watching.** The store file is for OpenClaw's internal session management. We only read it as a fallback for `cwd` extraction.

## Testing Plan

1. **Unit: JSONL parsing** — Capture 2-3 real OpenClaw transcript snippets, write parsing tests
2. **Integration: Discovery** — Verify `discoverExistingSessions()` finds OpenClaw sessions alongside Claude Code sessions
3. **Visual: Dashboard** — Confirm OpenClaw project cards render correctly with agents, speech bubbles, and status
4. **Edge cases:**
   - No `~/.openclaw` directory (graceful skip)
   - OpenClaw installed but no active sessions
   - Mixed: Claude Code and OpenClaw both working on the same project directory (should merge into one card via `projectId` hash)
   - Sub-agent lifecycle (spawn → work → complete)
   - Stale/archived transcripts (`.deleted.*` suffix) should be ignored

## File Changes Summary

| File | Change |
|------|--------|
| `shared/types.ts` | Add `source?: 'claude-code' \| 'openclaw'` to Agent and ArgusEvent |
| `server/openclaw-parser.ts` | **New file** — JSONL entry normalization adapter |
| `server/discover.ts` | Add `OPENCLAW_AGENTS_DIR`, `findActiveOpenClawTranscripts()`, wire into `discoverExistingSessions()` and polling |
| `server/state.ts` | Pass `source` through `onSessionStart()` to Agent records |
| `client/src/components/CuteBot.svelte` | (Optional) Visual distinction for OpenClaw bots |

## Open Questions

1. **JSONL schema** — Blocked until we see real transcripts. The format is undocumented.
2. **`cwd` extraction** — Where does OpenClaw store the working directory? Transcript field? `sessions.json`? Agent config?
3. **Sub-agent transcript layout** — Separate files or inline in main transcript?
4. **Agent ID stability** — Is `agentId` in the directory path stable across restarts, or does it rotate?
5. **Multi-model** — OpenClaw is model-agnostic. Should we show which model an OpenClaw agent is using? (Nice-to-have, not MVP.)
