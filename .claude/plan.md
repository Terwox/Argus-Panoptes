# Argus Panoptes Fix Plan

## Summary

Fix completion detection, improve subagent display, add mode indicators, and enable VS Code linking.

---

## Issues to Fix

### 1. Completion Detection Broken
**Symptom**: Subagents show hourglass forever after completing
**Root cause**: `SubagentStop` event not being matched correctly, or agent ID mismatch between start/stop

**Files**:
- `hooks/argus-hook.mjs` — event mapping
- `server/state.ts` — `onAgentComplete()` logic

**Fix approach**:
- Add logging to trace SubagentStop events
- Verify agentId matches between SubagentStart and SubagentStop
- Check if `agent_complete` event is being dispatched correctly

### 2. Stale Sessions Accumulating
**Symptom**: Multiple "main" entries per project (see claude-config with 4 "main" rows)
**Root cause**: SessionEnd not marking main agent complete, or cleanup not working

**Files**:
- `hooks/argus-hook.mjs` — SessionEnd mapping
- `server/state.ts` — `onSessionEnd()` logic, `cleanupStale()`

**Fix approach**:
- Ensure SessionEnd marks main agent as 'complete'
- Add explicit cleanup when new session starts for same project
- Consider: should new SessionStart clear old agents?

### 3. Subagent Names/Tasks Missing
**Symptom**: Some subagents show as "subagent" instead of "architect", "planner", etc.
**Root cause**: `subagent_type` field not being captured from SubagentStart hook

**Files**:
- `hooks/argus-hook.mjs` — SubagentStart event extraction
- `shared/types.ts` — Agent interface
- `server/state.ts` — `onAgentSpawn()` storing the name

**Fix approach**:
- Log the full SubagentStart payload to see available fields
- Extract `subagent_type` or similar field for agent name
- Extract `prompt` or `task` field for the task description

### 4. VS Code Linking
**Goal**: "Open in VS Code" button should work correctly
**Current**: Button appears on blocked projects

**Files**:
- `client/src/components/ProjectCard.svelte` — button logic

**Fix approach**:
- Verify the `vscode://` URI scheme is correct
- Test with `code --goto` CLI as fallback
- Consider: link to specific file if blocked question mentions one?

### 5. Clear Test Data

**Goal**: Remove stale test sessions from dashboard

**Approach**:
- Option A: Add "clear project" button to UI
- Option B: Restart server (clears in-memory state)
- Option C: Add admin endpoint to clear specific projects

### 6. Ralph/Mode Indicators

**Goal**: Show when Ralph, Ultrawork, or Planning mode is active

**Display**: Badge on main agent (e.g., "🔄 ralph", "⚡ ultrawork")

**Files**:
- `hooks/argus-hook.mjs` — detect skill invocation
- `shared/types.ts` — add `modes` field to Agent/Project
- `client/src/components/AgentTree.svelte` — render mode badges

**Detection approach**:
- Hook into skill invocation events (if available)
- Or: parse session metadata for mode flags
- Or: look for ralph/ultrawork in prompt/task text as fallback

---

## Implementation Order

1. **Add debug logging** — understand what events are actually firing
2. **Fix completion detection** — most critical, blocks everything else
3. **Fix stale session cleanup** — prevents accumulation
4. **Improve subagent naming** — show type + task description
5. **Add Ralph/mode indicators** — badges for active modes
6. **VS Code linking** — verify URI scheme works
7. **Clear test data mechanism** — admin feature or UI button

---

## Debug Plan

Before fixing, need to capture actual event data:

```javascript
// In argus-hook.mjs, add at top of createEvent():
console.error('[ARGUS DEBUG]', JSON.stringify({ hook: hookName, data }, null, 2));
```

Then run a test:
1. Start a session
2. Spawn a subagent (Task tool)
3. Let subagent complete
4. Check server logs for event flow

This will reveal:
- What fields are available in SubagentStart/SubagentStop
- Whether agentIds match
- What's missing from completion flow
