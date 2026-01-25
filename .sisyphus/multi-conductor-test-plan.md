# Multi-Conductor Testing Plan

## Feature: Multiple Claude Code Sessions Per Project

When a user has multiple Claude Code terminals open in the same project directory, we should show multiple conductors in that project's card.

## Current Behavior

- Multiple sessions in the same `cwd` are merged into one project
- Only one conductor is shown
- The first session's data is used

## Desired Behavior

- Multiple sessions in same `cwd` → multiple conductors in one card
- Each conductor has:
  - Its own speech bubble
  - Its own status (working/blocked/idle)
  - Its own click target → opens that specific terminal
- Decision mode triggers per-conductor (can have multiple blocked)

## Testing Approaches

### Option 1: URL-Based Dev Mode

Add `?dev=multiconductor` to enable multi-conductor simulation:

```typescript
// In state.ts
function getDevMode(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('dev');
}
export const devMode = writable<string | null>(getDevMode());

// When devMode === 'multiconductor', inject extra sessions into projects
```

### Option 2: Fake Projects Extension

Extend `generateFakeProjects()` to create projects with multiple sessions:

```typescript
// In fakeProjects.ts
function generateMultiConductorProject(): Project {
  return {
    id: 'fake-multi-conductor',
    name: 'Multi-Session Test',
    sessions: [
      { id: 'session-1', status: 'working', ... },
      { id: 'session-2', status: 'blocked', question: 'Which approach?', ... },
      { id: 'session-3', status: 'idle', ... },
    ],
    // Multiple agents of type 'main'
    agents: [
      { id: 'conductor-1', type: 'main', status: 'working', ... },
      { id: 'conductor-2', type: 'main', status: 'blocked', ... },
      { id: 'conductor-3', type: 'main', status: 'idle', ... },
    ],
    ...
  };
}
```

### Option 3: Server-Side Test Mode

Add a test endpoint that injects fake sessions:

```
POST /api/test/inject-session
{ projectPath: "/path/to/project", status: "blocked", question: "Test?" }
```

## Recommended Approach

**Option 2 (Fake Projects Extension)** because:
- Already have fake projects infrastructure
- No server changes needed
- Can control exact scenarios
- Easy to toggle on/off

## Test Scenarios

### Scenario 1: Basic Multi-Conductor

- 1 project with 2 conductors
- One working, one blocked
- Verify both render, both have bubbles
- Click each → different behavior expected

### Scenario 2: Decision Mode Conflict

- 1 project with 2 blocked conductors
- Which one gets expanded bubble?
- Answer: Both should show their questions
- Queue indicator: "2 need input"

### Scenario 3: Layout Stress Test

- 1 project with 5 conductors
- Do they fit? Stack vertically?
- Do bubbles collide?

### Scenario 4: Mixed States

- 3 conductors: working, blocked, idle
- Idle one should sleep
- Blocked one should dance
- Working one should bounce

## Implementation Steps

1. Extend `Project` type to support multiple main agents
2. Update `CuteWorld` to detect and render multiple conductors
3. Add dev mode flag to generate test data
4. Update click handlers to route to correct session
5. Handle decision mode with multiple blocked conductors

## Activation

```
# Enable multi-conductor test mode
http://localhost:5173/?demo=true&dev=multiconductor

# Or via console
window.__argusDevMode = 'multiconductor';
```

## Success Criteria

- [ ] Multiple conductors render without overlap
- [ ] Each conductor has independent status/bubble
- [ ] Clicking blocked conductor routes to correct terminal
- [ ] Decision mode handles multiple blocked gracefully
- [ ] No flashing or visual glitches
- [ ] Performance acceptable with 5 conductors
