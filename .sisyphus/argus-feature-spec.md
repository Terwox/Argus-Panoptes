# Argus Panoptes Feature Specification

*Version 1.0 - 2026-01-24*
*Author: oh-my-claudecode:designer (Opus)*

---

## Executive Summary

This specification defines the next phase of features for Argus Panoptes, a calm ambient dashboard for monitoring Claude Code sessions. Based on research into context-switching friction, calm technology principles, and competitive analysis, we propose 7 priority features that enhance the core value proposition: **reducing context-switching overhead while maintaining a calm, non-anxious UX**.

---

## Phase 1: Feature Ideation

### Features Extracted from Research

| # | Feature | Source |
|---|---------|--------|
| 1 | Named session badges (user-defined names) | GitHub Issue #4707, tmux |
| 2 | Project grouping by tags/categories | VSCode Project Manager |
| 3 | Session previews on hover | tmux, IDE workspace managers |
| 4 | "Pick up where you left off" indicators | Context switching research |
| 5 | Quick context notes (last user message) | Zeigarnik Effect mitigation |
| 6 | Cross-session awareness (related projects) | Multi-project workflows |
| 7 | One-click jump to blocked terminal | Existing requirement |
| 8 | Status lights (green/orange/red) | Calm technology principles |
| 9 | Aggregate health indicator | Glanceable dashboard design |
| 10 | Session timeline (activity over time) | Langfuse, observability tools |
| 11 | Workspace definitions (saveable configs) | JetBrains, tmux |
| 12 | Selective attention mode (focus one, dim others) | Calm tech "peripheral awareness" |

### Additional Features (Based on Research Themes)

| # | Feature | Rationale |
|---|---------|-----------|
| 13 | **Native OS notifications for blocked state** | Calm tech: "use periphery" when not looking at dashboard |
| 14 | **Keyboard shortcuts for quick project switching** | Reduce 23-minute context switch penalty |
| 15 | **Project archiving / hiding** | Reduce clutter, only show active work |
| 16 | **Persistent session notes** | Offload Zeigarnik Effect memory burden |
| 17 | **Audio cues for state changes** | Calm tech: non-visual notification channel |
| 18 | **Session forking visualization** | Address "no session forking" pain point |
| 19 | **Cost/token usage summary** | Langfuse/Helicone feature, but NOT calm-aligned |
| 20 | **Activity heatmap (when was I busy?)** | Time-boxing awareness without anxiety timers |

---

## Phase 2: Prioritization Matrix

### Scoring Criteria

- **User Value (1-5)**: How much does this reduce context-switching friction?
- **Calm Alignment (1-5)**: Does it align with "calm over complete" philosophy? (5 = perfectly calm, 1 = anxiety-inducing)
- **Implementation Complexity (1-3)**: 1 = simple (<1 day), 2 = medium (1-3 days), 3 = complex (>3 days)
- **Uniqueness (1-3)**: 1 = table stakes, 2 = nice-to-have, 3 = differentiator

### Prioritized Feature List

| Rank | Feature | User Value | Calm | Complexity | Unique | Score* | Include? |
|------|---------|:----------:|:----:|:----------:|:------:|:------:|:--------:|
| 1 | **One-click VS Code jump** | 5 | 5 | 1 | 2 | 17 | YES (exists) |
| 2 | **Native OS notifications** | 5 | 5 | 2 | 2 | 15 | YES |
| 3 | **Aggregate health indicator** | 4 | 5 | 1 | 3 | 16 | YES |
| 4 | **"Last message" context preview** | 5 | 4 | 2 | 3 | 15 | YES |
| 5 | **Keyboard shortcuts** | 4 | 5 | 1 | 2 | 15 | YES |
| 6 | **Selective attention mode** | 4 | 5 | 2 | 3 | 15 | YES |
| 7 | **Project archiving** | 3 | 5 | 1 | 2 | 14 | YES |
| 8 | **Named session badges** | 4 | 4 | 2 | 2 | 13 | Future |
| 9 | **Audio cues** | 3 | 4 | 2 | 3 | 13 | Future |
| 10 | **Session previews on hover** | 3 | 4 | 2 | 2 | 12 | Future |
| 11 | Status lights (explicit) | 3 | 5 | 1 | 1 | 13 | Implicit |
| 12 | Activity heatmap | 3 | 3 | 3 | 3 | 9 | No |
| 13 | Cross-session awareness | 3 | 3 | 3 | 3 | 9 | No |
| 14 | Workspace definitions | 3 | 4 | 3 | 2 | 9 | No |
| 15 | Session forking viz | 2 | 3 | 3 | 3 | 6 | No |
| 16 | Cost/token summary | 2 | 2 | 2 | 1 | 5 | No |
| 17 | Session timeline | 2 | 2 | 3 | 2 | 4 | No |

*Score = User Value + Calm + (3 - Complexity) + Unique*

---

## Phase 3: Heuristic Evaluation

### Top 7 Features Evaluated Against Three Frameworks

#### Framework 1: Nielsen's 10 Usability Heuristics

| Feature | Relevant Heuristics | Concerns |
|---------|---------------------|----------|
| Native OS notifications | H1 (Visibility of system status), H5 (Error prevention) | Must avoid notification spam (H8: Aesthetic) |
| Aggregate health indicator | H1 (Visibility), H6 (Recognition over recall) | Single indicator must be instantly parseable |
| "Last message" context preview | H6 (Recognition over recall), H7 (Flexibility) | Risk of cognitive overload if shown for all projects |
| Keyboard shortcuts | H7 (Flexibility and efficiency) | Must have discoverable hints (H10: Help) |
| Selective attention mode | H3 (User control), H8 (Aesthetic) | Dimming must not hide critical info |
| Project archiving | H3 (User control), H5 (Error prevention) | Need undo for accidental archive |
| One-click jump (exists) | H7 (Flexibility) | Working well, no concerns |

**Conflicts identified:**
- Native notifications could violate H8 (aesthetic/minimalist) if overdone
- Aggregate health must balance H1 (visibility) with calm philosophy

#### Framework 2: Calm Technology Principles

| Feature | Calm Alignment | Concerns |
|---------|----------------|----------|
| Native OS notifications | **Excellent** - moves info to periphery when dashboard not visible | Must be infrequent and dismissable |
| Aggregate health indicator | **Excellent** - single glance shows overall state | Avoid making it an "anxiety meter" |
| "Last message" context preview | **Good** - reduces memory burden | Text must be short, not overwhelming |
| Keyboard shortcuts | **Excellent** - invisible until needed | None |
| Selective attention mode | **Excellent** - embodies "peripheral awareness" | None |
| Project archiving | **Excellent** - reduces clutter | None |
| One-click jump (exists) | **Good** - reduces friction | None |

**No major conflicts with calm principles.**

#### Framework 3: Argus Design Principles (from CLAUDE.md)

| Feature | Principle Alignment | Concerns |
|---------|---------------------|----------|
| Native OS notifications | **Aligns** - outsources urgency to OS, dashboard stays calm | Ensure dashboard itself doesn't also pulse/flash |
| Aggregate health indicator | **Aligns** - glanceable, no timers | Must not show elapsed time |
| "Last message" context preview | **Aligns with P12** - user questions are #1 priority | Could conflict with P6 (max 2 notifications) if shown redundantly |
| Keyboard shortcuts | **Neutral** - no conflict | None |
| Selective attention mode | **Aligns with P9** - bubbles still visible, just dimmed | Must not hide blocked questions |
| Project archiving | **Aligns** - reduces visual noise | Archived projects should still appear if they become blocked |
| One-click jump | **Aligns with P12** - quick access to blocked terminals | None |

**Potential conflict identified:**
- "Last message" preview could duplicate information already shown in speech bubbles (violates P6 max 2 notifications). Solution: show preview in header only, not in card body.

---

## Phase 4: Competitive Analysis

### Comparison Matrix

| Feature | Argus Panoptes | Langfuse | Helicone | tmux | VSCode PM |
|---------|:--------------:|:--------:|:--------:|:----:|:---------:|
| **Real-time session monitoring** | YES | YES | YES | No | No |
| **Blocked state detection** | YES | No | No | No | No |
| **Visual agent hierarchy** | YES (cute bots) | Traces | Traces | No | No |
| **Native OS notifications** | PLANNED | No | No | No | No |
| **Named sessions** | No | YES | YES | YES | YES |
| **Session grouping/tags** | No | YES | YES | No | YES |
| **Keyboard navigation** | PLANNED | No | No | YES | No |
| **Cost/token tracking** | No | YES | YES | No | No |
| **Calm/ambient UX** | **CORE** | No | No | No | No |
| **Aggregate health** | PLANNED | YES | YES | No | No |
| **One-click jump to terminal** | YES | No | No | No | No |

### Gaps to Address (from competitors)

1. **Named sessions** - Langfuse, tmux, VSCode PM all have this. We should add it.
2. **Session grouping** - Could be useful, but adds complexity. Defer.

### Argus Differentiators

1. **Calm UX** - No competitor focuses on this. It's our core value.
2. **Cute bot visualization** - Unique, memorable, delightful.
3. **Blocked state detection** - Specific to Claude Code's hook system.
4. **One-click jump** - Direct integration with VS Code.
5. **No metrics overload** - We consciously omit cost/token/latency data.

---

## Phase 5: Detailed Feature Specifications

### Feature 1: Native OS Notifications

**One-line description:** Send a native OS notification when a project becomes blocked, so users can respond even when the dashboard isn't visible.

**User story:**
> As a developer running multiple Claude Code sessions, I want to be notified when any session needs my input, so I can respond quickly without constantly watching the dashboard.

**Job-to-be-done:** Reduce time-to-response for blocked sessions from "whenever I check the dashboard" to "immediately upon notification."

**Acceptance criteria:**
- [ ] Notification appears within 5 seconds of a project becoming blocked
- [ ] Notification shows: project name + truncated question (max 80 chars)
- [ ] Clicking notification focuses the dashboard (or optionally jumps to VS Code)
- [ ] User can disable notifications globally or per-project
- [ ] No duplicate notifications for the same blocked state
- [ ] Notifications respect OS "Do Not Disturb" mode

**Visual/interaction sketch:**

```
+------------------------------------------+
| [Argus icon]  Project-Name               |
|                                          |
| "Do you want me to proceed with the      |
| database migration?"                     |
|                                          |
| [Click to respond]                       |
+------------------------------------------+
```

**Edge cases:**
- Multiple projects block simultaneously: queue notifications, max 3 per 10 seconds
- User dismisses notification, project still blocked: do not re-notify for same blockage
- Dashboard is focused: still show notification (user may have multiple monitors)

**Dependencies:**
- Electron (if using electron-builder) or browser Notification API
- Server must track "notification sent" state to prevent duplicates

**Implementation notes:**
- Use `Notification` Web API if running in browser
- For deeper OS integration, consider Electron wrapper or native toast via PowerShell/osascript

---

### Feature 2: Aggregate Health Indicator

**One-line description:** A single glanceable indicator in the header showing the overall health of all sessions at once.

**User story:**
> As a developer glancing at the dashboard, I want to instantly know if everything is fine or if something needs attention, without scanning each project card.

**Job-to-be-done:** Answer "do I need to look closer?" in under 2 seconds.

**Acceptance criteria:**
- [ ] Indicator visible in header, always shown
- [ ] Three states: All Clear (green), Attention Needed (amber), Critical (red pulse once)
- [ ] Hover reveals breakdown: "2 blocked, 3 working, 1 idle"
- [ ] No anxiety-inducing animations (no continuous pulsing)
- [ ] Updates within 1 second of state change

**Visual/interaction sketch:**

```
Header:
+--------------------------------------------------+
| Argus Panoptes  [Connected]   [ * All Clear ]    |
+--------------------------------------------------+

States:
[ * ] Green dot + "All Clear" - all projects working or idle
[ * ] Amber dot + "2 need input" - some blocked
[ * ] Red dot (single pulse) + "Critical" - all projects blocked (rare)
```

**Edge cases:**
- Zero projects: show "No sessions" (neutral)
- Mix of blocked and idle: prioritize showing blocked count
- Completed work in inbox: do not affect health indicator

**Dependencies:**
- Stats store already exists (`stats.blocked`, `stats.working`)
- Minor header component update

---

### Feature 3: "Last Message" Context Preview

**One-line description:** Show the last user message or prompt for each project, making it easier to remember what you were working on.

**User story:**
> As a developer returning to a project after a break, I want to see what I last asked Claude, so I can quickly recall the context without opening the terminal.

**Job-to-be-done:** Reduce "what was I doing here?" cognitive load.

**Acceptance criteria:**
- [ ] Last user message shown in project card header (truncated to 60 chars)
- [ ] Tooltip shows full message on hover
- [ ] Only shown when project is idle or working (blocked shows the question instead)
- [ ] Persists across session reconnects
- [ ] Updates when new user message detected

**Visual/interaction sketch:**

```
Project Card Header:
+-----------------------------------------------+
| my-project             [Active]    [VS Code]  |
| d:\git\my-project                             |
| Last: "Refactor the auth module to use..."    |  <-- new line
+-----------------------------------------------+
```

**Edge cases:**
- No user messages yet: show "New session" or hide line
- Message is code block: show first line only, indicate "code"
- Multiple Claude sessions in same directory: show most recent message across all

**Dependencies:**
- Server must parse transcript for user messages (UserMessage entries)
- New field in Project type: `lastUserMessage?: string`

**Conflict resolution:**
- Per heuristic evaluation, this could duplicate info. Solution: show in header only, not in speech bubbles. Bubbles continue to show agent's current task/question.

---

### Feature 4: Keyboard Shortcuts

**One-line description:** Keyboard navigation for power users to quickly switch between projects and respond to blocked sessions.

**User story:**
> As a keyboard-focused developer, I want to navigate between projects without using my mouse, so I can respond to blocked sessions faster.

**Job-to-be-done:** Reduce friction for expert users; support flow state.

**Acceptance criteria:**
- [ ] `1-9` keys select project 1-9
- [ ] `Enter` on selected project opens VS Code
- [ ] `Tab` cycles through blocked projects only
- [ ] `?` shows keyboard shortcut help overlay
- [ ] Visual indicator shows currently selected project
- [ ] Shortcuts work only when no input is focused

**Visual/interaction sketch:**

```
+---------------------------+  +---------------------------+
| [1] my-project            |  | [2] other-project         |
| ...                       |  | ...                       |
+---------------------------+  +---------------------------+
        ^
     [Selected - border highlight]

Overlay (shown on ?):
+---------------------------------------+
| Keyboard Shortcuts                    |
|                                       |
| 1-9   Select project                  |
| Tab   Cycle blocked projects          |
| Enter Open in VS Code                 |
| Esc   Deselect                        |
| ?     This help                       |
+---------------------------------------+
```

**Edge cases:**
- More than 9 projects: keys 1-9 select first 9, use Tab for rest
- No blocked projects: Tab does nothing
- User is typing in a future search box: disable shortcuts

**Dependencies:**
- Global keydown listener in App.svelte
- Selected project state in store
- Help overlay component

---

### Feature 5: Selective Attention Mode

**One-line description:** Focus on one project by dimming all others, reducing visual noise during deep work.

**User story:**
> As a developer working on a specific project, I want to focus the dashboard on just that project, so I'm not distracted by other sessions.

**Job-to-be-done:** Enable flow state by reducing peripheral visual noise.

**Acceptance criteria:**
- [ ] Click a "focus" button on any project card to enter focus mode
- [ ] Focused project shown at 100% opacity, others at 30%
- [ ] Blocked projects still visible (opacity 50%) even when not focused
- [ ] Press Esc or click "exit focus" to return to normal view
- [ ] Focus mode persists until explicitly exited

**Visual/interaction sketch:**

```
Normal:
+-------------+  +-------------+  +-------------+
| Project A   |  | Project B   |  | Project C   |
| [Focus]     |  | [Focus]     |  | [Focus]     |
+-------------+  +-------------+  +-------------+

Focus on A:
+-------------+  +-------------+  +-------------+
| Project A   |  | Project B   |  | Project C   |
| [Exit Focus]|  | (dimmed)    |  | (dimmed)    |
+-------------+  +-------------+  +-------------+
   100%              30%              30%

Focus on A, but C is blocked:
+-------------+  +-------------+  +-------------+
| Project A   |  | Project B   |  | Project C   |
| [Exit Focus]|  | (dimmed)    |  | (semi-dim)  |
+-------------+  +-------------+  +-------------+
   100%              30%              50% (blocked)
```

**Edge cases:**
- Focused project completes/ends: auto-exit focus mode
- Focused project becomes blocked: show notification, keep focus
- All projects idle: allow focus, but maybe not useful

**Dependencies:**
- Focus state in store
- CSS transition for opacity changes
- Focus button in ProjectCard component

---

### Feature 6: Project Archiving

**One-line description:** Hide inactive projects to reduce visual clutter, with automatic resurrection if they become blocked.

**User story:**
> As a developer with many projects, I want to archive ones I'm not actively using, so the dashboard only shows what's relevant right now.

**Job-to-be-done:** Reduce cognitive load from visual clutter.

**Acceptance criteria:**
- [ ] "Archive" button on each project card (X or minimize icon)
- [ ] Archived projects hidden from main grid
- [ ] "Show archived (N)" button in header reveals archived projects
- [ ] Archived project that becomes blocked is automatically unarchived
- [ ] Archive state persists in localStorage

**Visual/interaction sketch:**

```
Header:
+----------------------------------------------------------+
| Argus Panoptes  [Connected]  [All Clear]  [Archived: 3]  |
+----------------------------------------------------------+

Project Card:
+---------------------------+
| my-project     [X]        |  <-- X archives
| ...                       |
+---------------------------+

Archived View (when toggled):
+---------------------------+  +---------------------------+
| (archived) old-project    |  | (archived) another-one    |
| [Restore]                 |  | [Restore]                 |
+---------------------------+  +---------------------------+
```

**Edge cases:**
- All projects archived: show empty state with "no active sessions" + archived count
- Archived project restarts (new session): auto-unarchive
- Archive while in focus mode: exit focus mode if archived project was focused

**Dependencies:**
- Archived project IDs in localStorage
- Filter in store to separate archived/active
- Resurrection logic in state update handler

---

### Feature 7: One-Click VS Code Jump (Enhancement)

**One-line description:** Improve the existing VS Code jump to also copy the blocked question to clipboard and optionally scroll to the relevant terminal.

**User story:**
> As a developer responding to a blocked Claude session, I want to jump directly to the terminal with the question ready, so I can respond immediately without hunting for context.

**Job-to-be-done:** Minimize steps from "I see a blocked project" to "I'm responding."

**Acceptance criteria:**
- [ ] Clicking "Open in VS Code" copies the blocked question to clipboard
- [ ] Toast notification confirms: "Question copied to clipboard"
- [ ] If multiple terminals in VS Code, attempt to focus the right one (stretch goal)
- [ ] Non-blocked projects: still open VS Code, no clipboard action

**Visual/interaction sketch:**

```
Blocked project card:
+-----------------------------------------------+
| my-project       [Needs input]                |
| "Should I proceed with the migration?"        |
|                                               |
| [ -> Open in VS Code & Copy Question ]        |  <-- enhanced button
+-----------------------------------------------+

Toast:
+-------------------------------+
| Question copied to clipboard  |
+-------------------------------+
```

**Edge cases:**
- Question is very long: truncate clipboard to 500 chars
- Clipboard access denied: show warning, still open VS Code
- VS Code not installed: show error message

**Dependencies:**
- `navigator.clipboard.writeText()` for clipboard
- Toast notification component (can be simple CSS animation)

---

## Phase 6: Tradeoff Analysis

### What We're NOT Building (and Why)

| Feature | Reason for Exclusion |
|---------|---------------------|
| **Cost/token tracking** | Explicitly anti-calm. Watching spend creates anxiety. Use Langfuse if you need this. |
| **Session timeline** | Would require timers or elapsed time, violating P4 (no visible timers). |
| **Session forking visualization** | Complex UX for marginal benefit; Claude Code doesn't expose fork metadata. |
| **Cross-session awareness** | Requires semantic analysis of prompts; high complexity, low certainty of value. |
| **Workspace definitions** | Power user feature; adds complexity. Defer until user demand is clear. |
| **Named sessions** | Claude Code doesn't support custom session names yet (see Issue #4707). Would require storing mapping locally, which could desync. Wait for upstream support. |
| **Activity heatmap** | Time-based visualization is inherently anxiety-adjacent. |

### Tradeoffs We Accept

| We Choose | We Lose |
|-----------|---------|
| Native notifications | Some users may find them intrusive (mitigated by off switch) |
| Aggregate health in header | Slightly less "at a glance" for individual projects |
| Keyboard shortcuts | Learning curve for new users (mitigated by ? help) |
| Selective attention mode | May miss activity in dimmed projects (mitigated by blocked exception) |
| Project archiving | Risk of forgetting about archived projects (mitigated by auto-resurrection) |
| Clipboard copy on jump | Unexpected behavior if user didn't want clipboard overwritten |

---

## Implementation Roadmap

### Phase 1: Core UX (Week 1)
1. Aggregate health indicator (1 day)
2. Keyboard shortcuts (1 day)
3. Enhanced VS Code jump + clipboard (0.5 days)

### Phase 2: Focus Features (Week 2)
4. Selective attention mode (1 day)
5. Project archiving (1 day)
6. "Last message" context preview (1 day)

### Phase 3: OS Integration (Week 3)
7. Native OS notifications (2 days)

---

## Open Questions for Review

1. **Notification frequency:** How often should we notify for the same blocked state? Once per block, or periodic reminders?

2. **Focus mode UX:** Should focus mode resize the focused card to take up more space, or just dim others?

3. **Keyboard shortcuts:** Are `1-9` intuitive, or should we use `Alt+1-9` to avoid conflicts?

4. **Clipboard behavior:** Should we ask before overwriting clipboard, or always copy silently?

5. **Archive persistence:** localStorage vs. server-side? (localStorage means per-browser, server means shared across devices)

---

## Appendix: Design System Updates Needed

To implement these features, we'll need:

1. **Toast component** - for notifications and confirmations
2. **Overlay component** - for keyboard shortcut help
3. **Focus state styling** - opacity transitions
4. **Header expansion** - aggregate health indicator, archived count
5. **Icon set** - focus, archive, restore icons

---

## Phase 7: Conjuration Animations (Cute Mode)

### Feature 8: Randomized Bot Conjuration Animations

**One-line description:** When a subagent spawns, animate it assembling piece-by-piece with variety and delight.

**User story:**
> As a user watching the cute dashboard, I want to see bots "conjured" in fun, varied ways, so the experience feels magical and not repetitive.

**Job-to-be-done:** Make the dashboard delightful and memorable; reward watching.

**Acceptance criteria:**
- [ ] Each spawn uses a randomly selected conjuration style
- [ ] Animation lasts 0.8-1.2 seconds (fast enough not to block, slow enough to see)
- [ ] Parts appear sequentially, not all at once
- [ ] Different conjuration styles feel distinct and fun
- [ ] No two adjacent spawns should use the same animation (avoid repetition)

### Conjuration Animation Library

#### Style 1: "Classic Assembly" (Build from ground up)
```
Frame 1: Body pops in (scale 0 → 1)
Frame 2: Legs attach from below (slide up)
Frame 3: Arms attach from sides (slide in)
Frame 4: Antenna pops out (scale + wobble)
Frame 5: Eyes + mouth fade in
Frame 6: Held tool materializes (sparkle)
```

#### Style 2: "Magic Teleport" (Particles coalesce)
```
Frame 1: Sparkle particles appear at position
Frame 2: Particles swirl inward
Frame 3: Body fades in from center
Frame 4: Limbs extend outward simultaneously
Frame 5: Face appears with flash
Frame 6: Tool materializes
```

#### Style 3: "Factory Assembly" (Mechanical feel)
```
Frame 1: Body drops from above (gravity)
Frame 2: Left leg clicks in (mechanical sound implied)
Frame 3: Right leg clicks in
Frame 4: Left arm slides in
Frame 5: Right arm slides in
Frame 6: Head/antenna screws in (rotation)
Frame 7: Eyes light up (glow)
Frame 8: Tool equipped
```

#### Style 4: "Inflate & Pop" (Balloon-like)
```
Frame 1: Small seed appears
Frame 2: Inflates rapidly (overshoot)
Frame 3: Bounces back to size
Frame 4: Features "pop" onto surface one by one
Frame 5: Tool appears with a "boing"
```

#### Style 5: "Pixel Scan" (Retro/digital)
```
Frame 1: Scanline sweeps top to bottom
Frame 2: Bot renders row by row
Frame 3: Colors fill in after shape
Frame 4: Final flash when complete
```

#### Style 6: "Spring Surprise" (Jack-in-the-box)
```
Frame 1: Compressed spring at bottom
Frame 2: Spring extends upward
Frame 3: Bot pops out at top with bounce
Frame 4: Settles into position with wobble
```

### Implementation Notes

**Random selection with no-repeat:**
```typescript
let lastAnimation = -1;
function getRandomAnimation(): number {
  const styles = 6;
  let next;
  do {
    next = Math.floor(Math.random() * styles);
  } while (next === lastAnimation && styles > 1);
  lastAnimation = next;
  return next;
}
```

**CSS Animation approach:**
- Use CSS keyframes for each style
- Apply via dynamic class: `conjure-style-1`, `conjure-style-2`, etc.
- Use Svelte transitions for complex sequences

**SVG part targeting:**
- Each body part needs its own group/element ID
- Animation targets: `body`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `antenna`, `eyes`, `mouth`, `heldTool`

**Timing:**
- Use `animation-delay` to stagger parts
- Each part: 0.1-0.15s duration
- Total: 0.8-1.2s depending on style

### Edge Cases

- Bot spawns while another is animating: allow overlap, no queue
- Bot despawns during animation: cancel animation, fade out
- Cute mode toggled during animation: complete animation, then show/hide

---

## Phase 8: CuteWorld Physics Configuration

### Configuration File: `client/src/lib/cuteWorldConfig.ts`

Centralized configuration for bot simulation physics, spacing, and animations.

#### Physics Constants
| Constant | Value | Description |
|----------|-------|-------------|
| FRICTION | 0.98 | Velocity decay per frame |
| BOUNCE | 0.7 | Energy retained on collision |
| HOME_PULL | 0.002 | Strength of desk gravity |
| WANDER_FORCE | 0.025 | Random movement impulse |
| MAX_VELOCITY | 0.7 | Speed cap |
| DIRECTION_FLIP_THRESHOLD | 0.6 | Hysteresis for facing direction |

#### Spacing Constants
| Constant | Value | Description |
|----------|-------|-------------|
| MIN_BOT_DISTANCE | 90px | Collision avoidance radius |
| CONDUCTOR_EXCLUSION | 100px | Zone around conductor |
| MIN_DESK_DISTANCE_PCT | 0.18 | Min desk spacing (% of container) |

#### Desk Bounds (% of container)
| Bound | Value | Description |
|-------|-------|-------------|
| MIN_X | 0.12 | Left edge |
| MAX_X | 0.92 | Right edge |
| MIN_Y | 0.05 | Top edge |
| MAX_Y | 0.75 | Bottom edge |

#### Restlessness Detection
| Constant | Value | Description |
|----------|-------|-------------|
| FAR_FROM_HOME_THRESHOLD | 40px | "Far from desk" distance |
| MOVING_FAST_THRESHOLD | 0.3 | "Moving fast" velocity |
| FRUSTRATION_MEAN_MS | 10000 | Gaussian mean for patience |
| FRUSTRATION_STDDEV_MS | 5000 | Gaussian stddev |
| FRUSTRATION_MIN_MS | 5000 | Minimum patience floor |

---

## Phase 9: CuteWorld Visual Test Suite

### Manual Test Checklist

Run at http://localhost:5173 with fake mode (🎭) enabled.

#### Bot Positioning
- [ ] Conductor appears in upper-left corner
- [ ] Conductor's speech bubble visible at top of card
- [ ] Subagents spread across full width (not clustered)
- [ ] Bots can wander close to all 4 edges
- [ ] No bots spawn overlapping each other

#### Movement & Physics
- [ ] Bots wander slowly and calmly (not frantic)
- [ ] Direction flips are infrequent (hysteresis working)
- [ ] Bots don't clip through container edges
- [ ] Bots bounce gently off each other

#### Desk Relocation
- [ ] After ~10s of restlessness, bot shows 🪑💨
- [ ] Relocating bot walks toward new position (not teleport)
- [ ] Name tag turns amber during relocation
- [ ] Bot settles at new position when arrived

#### Click Reactions
- [ ] Click triggers random reaction (wave/bounce/giggle/emoji)
- [ ] Emoji floats up and fades
- [ ] One reaction at a time per bot

#### Spawn/Conjure
- [ ] New subagents spawn with conjure animation
- [ ] Name tag shows ✨ during spawn
- [ ] Different conjure styles between spawns

---

*End of specification*
