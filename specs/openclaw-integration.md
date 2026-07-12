# OpenClaw Integration

**Status:** Core main-session discovery, JSON Lines (JSONL) normalization, and activity/to-do (TODO) polling are implemented. Question and inferred-status extraction, real-world format coverage, subagent lifecycle handling, and dedicated OpenClaw tests remain deferred/unverified.

**Original research date:** 2026-02-08

## Goal

Detect recent OpenClaw sessions alongside Claude Code sessions so they appear as project cards in Argus and reuse the same calm role and activity presentation where the available transcript data supports it.

This document distinguishes repository-proven behavior from historical research and deferred work. It does not guarantee OpenClaw hook, gateway WebSocket, model, transcript, or subagent lifecycle behavior.

## Implemented Boundary

The repository currently includes:

- `server/discover.ts`
  - Scans `~/.openclaw/agents/{agentId}/sessions/` for recent `.jsonl` files.
  - Runs that scan from `discoverExistingSessions()` only after the Claude Code projects directory check; if `~/.claude/projects` is absent, the function returns before reaching OpenClaw discovery.
  - Ignores filenames containing `.deleted.`.
  - Uses a 30-minute modification threshold for OpenClaw sessions.
  - Reads normalized entries near the start of a transcript to obtain `cwd`.
  - Uses `IDENTITY.md` in the workspace for an agent name when available, otherwise the OpenClaw agent directory name.
  - Registers the session in shared state with `source: 'openclaw'` and records the transcript path for polling.
- `server/openclaw-parser.ts`
  - Recognizes session entries with a `cwd`.
  - Maps known `message` roles to the normalized Claude Code-like shape used by discovery.
  - Maps OpenClaw `toolCall` blocks to normalized `tool_use` blocks.
  - Preserves text and thinking blocks and ignores unsupported top-level entry kinds.
- `shared/types.ts` and `server/state.ts`
  - Carry the optional `openclaw` source on events and agents.
- Existing fast transcript polling
  - Includes registered OpenClaw transcript paths in `state.getActiveAgentTranscripts()`.
  - Reuses normalized entries for current-activity and TODO extraction in `fastActivityCheck()`.
  - Does not include OpenClaw transcripts in the pending-question and inferred-status polling performed by `checkPendingQuestions()`.

Core OpenClaw support is no longer wholly unimplemented, but the implemented claim is limited to discovery, normalization of the shapes encoded in the current parser, and activity/TODO polling for registered sessions.

## Current Data Flow

```text
~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl
                         │
                         ▼
             recent-transcript discovery
                         │
                         ▼
              OpenClaw entry normalizer
                         │
                         ▼
           shared activity/TODO extraction
                         │
                         ▼
          Argus project + main agent state
                         │
                         ▼
               browser / VS Code user interface (UI)
```

### Discovery behavior

Startup OpenClaw discovery is not standalone on OpenClaw-only installations. `discoverExistingSessions()` currently returns before the OpenClaw scan when `~/.claude/projects` is absent, even if `~/.openclaw/agents` exists.

1. If `~/.openclaw/agents` does not exist, discovery returns no OpenClaw sessions.
2. Each agent's `sessions` directory is scanned for recent JSONL transcripts.
3. Archived names containing `.deleted.` and inaccessible paths are skipped.
4. A transcript is treated as OpenClaw when its first entry has `type: "session"`.
5. The first few entries are normalized until a `cwd` is found.
6. The session is merged into the project derived from that real working directory.

There is no implemented `sessions.json` fallback. A transcript without a usable `cwd` is not registered by the current OpenClaw path.

### Normalized entry behavior

The adapter currently understands the following repository-defined shapes:

| OpenClaw entry/block | Normalized result |
|---|---|
| `session` with `cwd` | `system` entry with `cwd` |
| `message.role: user` | `user` message |
| `message.role: assistant` | `assistant` message |
| `message.role: toolResult` | `system` message |
| `content.type: toolCall` | `tool_use` with name and arguments |
| `content.type: text` | Text block |
| `content.type: thinking` | Thinking block |
| `model_change`, `thinking_level_change`, `custom` | Ignored by the normalizer |

These mappings are implementation facts, not proof that every OpenClaw version or provider emits the same shape.

## Architecture Decision: Polling

Argus uses transcript polling for OpenClaw. It does not install an OpenClaw hook, tap the gateway WebSocket, or claim real-time OpenClaw lifecycle events. Polling keeps the integration isolated from undocumented gateway behavior and matches the recovery path already used for Claude Code transcripts.

For registered OpenClaw sessions, the implemented polling boundary is current activity and TODO extraction through `fastActivityCheck()`. The heavier `checkPendingQuestions()` path enumerates only `~/.claude/projects` and Claude Code transcripts returned by `findActiveTranscripts()`, so it does not currently infer OpenClaw pending questions, blocked state, system errors, rate limits, or running-server state.

Historical research suggested that outbound lifecycle hooks were unavailable or incomplete at the time of the original design. That external claim was not revalidated during this documentation cleanup, so the repository implementation—not the old research note—is authoritative.

## Deferred and Unverified Work

### Startup discovery coupling

Decoupling OpenClaw startup discovery from the existence of `~/.claude/projects` is a known limitation and a deferred runtime fix. This document records the current control flow only; no runtime code was changed or behavior verified as part of this documentation work.

### Question and blocked-state extraction

OpenClaw pending-question and inferred blocked-state extraction are not implemented by the current polling path. The same boundary also leaves OpenClaw system-error, rate-limit, and running-server inference unimplemented. Future work must first verify representative OpenClaw question, permission, error, rate-limit, and long-running-process transcript shapes, then either extend `checkPendingQuestions()` to enumerate registered OpenClaw transcripts safely or add an equivalent source-aware polling path.

### Subagent lifecycle

OpenClaw-specific subagent handling is not implemented or verified. In particular, the repository does not yet establish whether a supported installation stores subagents in separate transcripts, encodes them inline through tool calls, or uses another relationship model.

Before implementation, representative sanitized transcripts must answer:

1. How a subagent is identified and linked to a parent session.
2. Whether spawn, work, completion, and failure are explicit events or inferred states.
3. Whether subagent transcripts have stable filenames or session keys.
4. Whether agent IDs are stable across restarts.
5. How multiple OpenClaw agents working in one directory should merge without collisions.

Only after those facts are established should Argus register OpenClaw agents as `type: 'subagent'` with a `parentId`.

### Dedicated tests

There are no dedicated OpenClaw parser, discovery, or lifecycle tests in the current test inventory. TypeScript compilation checks the code shape but does not validate real transcript behavior.

Required future coverage:

1. **Parser fixtures** — Sanitized session, user, assistant, thinking, tool call, tool result, malformed, and unsupported entries.
2. **Discovery fixtures** — Recent/stale transcripts, `.deleted.` archives, missing directories, missing `cwd`, and inaccessible paths.
3. **Mixed-source integration** — Claude Code and OpenClaw sessions in the same project merge without losing source identity.
4. **Activity/TODO extraction** — Registered OpenClaw transcripts produce the intended current activity and TODO state through the fast polling path.
5. **Question and inferred-status extraction** — Verified OpenClaw fixtures produce pending-question, blocked, system-error, rate-limit, and running-server state after that polling path is implemented.
6. **Subagent lifecycle** — Spawn, work, completion, failure, parent linkage, and stale cleanup, once the source format is verified.

Dedicated tests remain a required follow-up; this document must not imply that the current parser has fixture-backed OpenClaw coverage.

### Live transcript verification

The current parser encodes a known schema, but this cleanup did not use a live OpenClaw installation or capture new transcript samples. The following remain unverified across installations and versions:

- Top-level JSONL entry variants
- The availability and location of `cwd`
- Tool-call argument shapes
- Question/permission patterns
- Subagent storage and lifecycle
- Model metadata and whether it is useful to display

## Optional UI Differentiation

Agents retain the shared role-based visual system. A source badge, antenna variation, or other OpenClaw distinction may be added later, but it is cosmetic and lower priority than correct discovery, lifecycle semantics, and test coverage.

## Explicit Non-Goals

- No OpenClaw hook script without a verified supported outbound mechanism
- No gateway WebSocket interception
- No claims about OpenClaw model/provider behavior
- No `sessions.json` watcher
- No fabricated subagent state from filenames alone
- No source-specific visual treatment that breaks the universal role/color mapping

## Historical Research References

These links informed the original design but are not treated as freshly verified implementation evidence:

- [Session Management](https://docs.openclaw.ai/concepts/session)
- [Sub-Agents](https://docs.openclaw.ai/tools/subagents.md)
- [Hooks](https://docs.openclaw.ai/automation/hooks.md)

## Completion Criteria for the Deferred Work

OpenClaw integration should be described as fully verified only when:

1. Main-session parsing is validated against representative sanitized fixtures.
2. Discovery and mixed-source behavior have dedicated automated coverage.
3. Pending-question, blocked, system-error, rate-limit, and running-server extraction is implemented and tested against verified transcript shapes.
4. Subagent transcript layout and parent relationships are established from real evidence.
5. Subagent spawn-to-completion behavior is implemented and tested.
6. Documentation records the supported schema/version boundary without inventing hook, WebSocket, model, or lifecycle guarantees.
