# Argus Panoptes — Design Principles & Audit Framework

A formal design principles document grounded in established heuristic frameworks, tailored for calm ambient monitoring dashboards with character-driven UI.

## Applicable Frameworks

Three bodies of work inform this design space:

| Framework | Source | Why It Applies |
|-----------|--------|----------------|
| **Ambient Display Heuristics** | Mankoff, Dey, Hsieh, Kientz, Lederer & Ames (CHI 2003) | Purpose-built for evaluating peripheral information displays. Found more severe problems than Nielsen's heuristics on ambient UIs. |
| **Calm Technology Principles** | Case (2015), building on Weiser & Brown (1996) | Defines what "calm" means operationally: peripheral awareness, minimal attention demand, graceful degradation. |
| **Glanceable Peripheral Display Design** | Matthews, Dey & Mankoff (DIS 2006) | Guidelines for displays that must be understood in <250ms via preattentive processing (color, shape, motion). |

Nielsen's 10 heuristics remain useful as a baseline but under-index on peripherality, affect, and information mapping — the three things that matter most here.

---

## Synthesized Principles

Each principle below maps to its source framework(s), states the design rule, and provides auditable criteria.

### P1. Peripherality First

> The display lives at the edge of attention. It should never demand focus — only reward it.

**Sources:** Mankoff H2 (Peripherality of Display), Case P1 (Smallest possible attention), Case P3 (Make use of the periphery)

**Auditable criteria:**
- [ ] Can the user understand overall system status without reading any text (color/motion alone)?
- [ ] Does any element demand attention when nothing is wrong?
- [ ] Can the dashboard sit on a secondary monitor untouched for hours without creating anxiety?
- [ ] Are status changes communicated through ambient channels (color shift, motion change) before text?

**Argus status:** Mostly met. Bot idle/working/blocked states use distinct colors. Blocked cards double in width (spatial preattentive cue). Idle bots sleep with Z animations. The dashboard is designed for secondary-monitor ambient use. Remaining gap: rate-limited state communicates primarily via text ("Back at X:XX PM") with only a subtle sky-blue color shift.

---

### P2. Calm Affect

> The emotional register is always calm. Blocked states are invitations, not alarms.

**Sources:** Case P2 (Inform and create calm), Mankoff H3 (Match between display and environment)

**Auditable criteria:**
- [ ] Zero elements that flash, pulse rapidly, or use red/warning colors for non-critical states
- [ ] Language uses invitational framing ("Needs input") not urgency framing ("BLOCKED", "ERROR")
- [ ] Animations are smooth, organic, and at human breathing pace (~4s cycle) or slower
- [ ] No visible timers, countdowns, or "time since" indicators

**Argus status:** Strong. "Needs input" language, no timers, no flashing. Blocked bots wiggle gently (3-degree rotation) rather than pulsing. Rate limit framing ("Back at X:XX PM") avoids countdown anxiety. Sleeping animation uses organic Z-bubble patterns. Sound notifications are opt-in via Settings.

---

### P3. Glanceable State

> System state must be comprehensible in a single glance (<250ms of attention). Use preattentive features: color, position, size, motion.

**Sources:** Matthews (Glanceable Displays), Mankoff H4 (Sufficient information design), Mankoff H7 (Visibility of state)

**Auditable criteria:**
- [ ] Each project's status is distinguishable by color alone (no need to read text)
- [ ] Agent count per project is perceivable without counting (1 vs. 3 vs. 8 are visually distinct)
- [ ] The "something needs me" signal is detectable from 2+ meters away
- [ ] No more than 3-4 distinct visual states to learn (working/blocked/idle/rate-limited maps well to this)

**Argus status:** Good with a deliberate trade-off. Blocked state uses multi-channel signaling: amber color flood (bot body + bubble + border + VS Code button), card width doubling, bot expression change (worried eyes/mouth), blocked projects sort to top of grid. Sound chime + OS notification serve as the true distance signal. Trade-off: the card background tint is only 5% opacity amber — nearly invisible at distance. The 8px health indicator dot is too small for peripheral vision. The project consciously chose calm over aggressive visual alarm; sound handles the distance case.

---

### P4. Consistent & Intuitive Mapping

> The relationship between data and visual representation should be natural and learnable.

**Sources:** Mankoff H5 (Consistent and intuitive mapping), Case P4 (Amplify best of technology and humanity)

**Auditable criteria:**
- [ ] Visual metaphors are internally consistent (e.g., bots = agents, desks = workspaces, tools = roles)
- [ ] Color mappings are stable — the same color always means the same thing
- [ ] Spatial position carries meaning (or is explicitly decorative)
- [ ] New users can infer meaning without a legend within 30 seconds

**Argus status:** Strong. Bot metaphor is intuitive — little workers at desks. Role-based colors + held tools are consistent (conductor=blue+baton, explorer=purple+magnifying glass, etc.). Conductor sits at a fixed left-side position. Speech bubbles as "what they're saying" is natural. Assembly animation reinforces the "spawning a new worker" concept. Bot count = agent count (no separate numeric display needed).

---

### P5. Progressive Disclosure

> Show the minimum by default. Reveal detail on intentional approach.

**Sources:** Mankoff H6 (Easy transition to more detailed information), Case P7 (Minimum needed to solve the problem)

**Auditable criteria:**
- [ ] Default view shows only status (working/blocked/idle) — no details
- [ ] Hover, click, or approach reveals: current activity, question text, todo list
- [ ] Deep detail (transcript, logs) is reachable but never shown unprompted
- [ ] There's a clear visual affordance for "more info available" without showing the info

**Argus status:** Deliberate tension. Speech bubbles are always visible (design rule: "toggling creates cognitive load"), which trades progressive disclosure for reduced interaction cost. This is mitigated by intelligent suppression: in decision mode (any bot blocked), non-blocked subagent bubbles hide to focus attention on the blocked bot's question. TODO lists are expandable. Click-to-show exists for suppressed bubbles (5s timeout). Bubbles are `pointer-events: none` so hover-expand is not currently possible.

**Implemented disclosure layers:**
1. Ambient: bot colors + motion (always visible)
2. Glanceable: speech bubbles with truncated text (always visible, intelligently suppressed)
3. Expanded: click suppressed bot to see its bubble (5s), expand TODO list
4. Exit: VS Code button, bot click, keyboard shortcut (Tab/Enter/number keys) → opens terminal

**Gap:** No in-dashboard detail panel. The only "deep dive" is exiting to VS Code.

---

### P6. Character as Data

> The bot characters are not decoration — they ARE the data visualization. Their appearance, posture, and behavior encode system state.

**Sources:** Mankoff H8 (Aesthetic and pleasing design), Matthews (preattentive features), Case P5 (Communicate without speaking)

This principle is unique to Argus and not covered by any existing framework. It's the core differentiator.

**Auditable criteria:**
- [ ] Every visual bot attribute encodes information (color=role, tool=role, posture=status, animation=activity)
- [ ] Bot count is the agent count — no separate number display needed
- [ ] Idle bots look idle (sleeping); working bots look busy; blocked bots look expectant
- [ ] Adding a new status or role requires only adding a new visual state, not redesigning the UI

**Argus status:** Strong. Expression mapping is comprehensive:

| Status | Body Color | Eyes | Mouth | Animation |
|--------|-----------|------|-------|-----------|
| idle | role color | relaxed dreamy | neutral | sleeping Z's |
| working | role color | focused | determined smile | bounce |
| blocked | amber | wide worried | open worried | gentle wiggle |
| complete | green | happy closed | big smile | static |
| rate_limited | role color | calm content | content smile | glow |
| server_running | emerald | focused, green pupils | neutral | gentle pulse |
| tired | role color | droopy horizontal | small neutral | — |

**Partially wired:** Fatigue posture (tired eyes, droopy expression) is fully rendered in CuteBot but `isTired` is never passed in CuteWorld — it only shows in the AgentTree text view. The `workingTime` data is available from the server; just needs threading through CuteWorld's bot rendering.

---

### P7. Soundless by Default

> The dashboard is silent unless the user opts in. All primary communication is visual.

**Sources:** Case P5 (Technology can communicate but doesn't need to speak), Case P8 (Respect social norms)

**Auditable criteria:**
- [ ] Zero audio by default — no notification sounds, no chimes, no alerts
- [ ] If audio is added, it must be opt-in and respect system notification settings
- [ ] The dashboard works equally well muted and unmuted (it's the same)

**Argus status:** Met. Sound is opt-in via Settings ("Sound Notifications" toggle). When enabled, `playChime()` fires on new blocked states. OS-level `Notification` API is used for desktop notifications. All primary state communication remains visual regardless of sound setting.

---

### P8. Graceful Degradation

> When data is missing, stale, or the system is disconnected, the display remains calm and useful — never alarming.

**Sources:** Case P6 (Work even when it fails), Mankoff H7 (Visibility of state)

**Auditable criteria:**
- [ ] Disconnected state is visually distinct but not alarming (greyed out, not red)
- [ ] Stale data fades or dims rather than showing error states
- [ ] Missing projects simply don't appear (no empty error cards)
- [ ] Server restart doesn't cause visual chaos (smooth reconnection)

**Argus status:** Partially met. WebSocket auto-reconnects after 3s on disconnect. Stale sessions get cleaned up silently (idle >2min removed, stale projects >30min removed). Missing projects simply don't render.

**Gap:** The disconnection indicator is a tiny 12px header badge (`Connected` green / `Disconnected` red pill). If you're watching the bot visualization and not the header, you won't notice a disconnect — the UI silently freezes on last-known state. No desaturation, dimming, or frost overlay on the main content area. The red color on the disconnected badge also violates P2 (calm affect) — a muted gray or amber would be more appropriate.

---

### P9. Environmental Fit

> The dashboard should feel like it belongs in a workspace — not like a mission control center.

**Sources:** Mankoff H3 (Match between display and environment), Mankoff H8 (Aesthetic and pleasing design), Case P8 (Respect social norms)

**Auditable criteria:**
- [ ] Color palette is muted/warm enough to not draw unwanted attention in an office
- [ ] The visual style is cohesive (cute bots don't clash with data typography)
- [ ] The dashboard looks intentional on a shared screen (not embarrassing, not alarming)
- [ ] Adapts to environment (dark/light, compact/full, reduced motion)

**Argus status:** Mostly met. The app is dark-only (`#0f0f0f` background, white text) — appropriate for secondary monitors in typical dev setups. The cute bot aesthetic is cohesive and charming. Compact mode exists (auto-triggers at <600px width, manual toggle in Settings).

**Gap:** No light mode or `prefers-color-scheme` support. No `prefers-reduced-motion` support — the app has extensive animations (bounce, wiggle, pulse, glow, marquee, spawn animations, physics-based movement, steam particles, sparkles, idle swaying) with zero reduced-motion fallback. This is an accessibility gap.

---

### P10. Exit Affordance Clarity

> The dashboard is a routing tool. Its most important interaction is sending the user elsewhere (to the right terminal, the right file, the right question).

**Sources:** Mankoff H6 (Easy transition to detailed information), unique to monitoring dashboards

**Auditable criteria:**
- [ ] Every blocked project has a one-click path to the terminal that needs input
- [ ] Pointer cursor appears ONLY for elements that navigate away
- [ ] Exit targets are discoverable but not aggressive (no "CLICK HERE" buttons)
- [ ] The dashboard never tries to be the place where you DO the work — only where you SEE the work

**Argus status:** Strong. Multiple exit paths implemented:

| Trigger | Action |
|---------|--------|
| VS Code button (per card) | Opens `vscode://file/{path}`, copies blocked question to clipboard |
| Click blocked bot | Opens `vscode://file/{path}` directly |
| Tab key | Cycles through blocked projects |
| Enter key | Opens selected project in VS Code |
| Number keys (1-9) | Selects project by grid position |
| Card click | Toggles focus mode (stays in dashboard — no pointer cursor) |

Card click intentionally does NOT navigate — it toggles focus mode. Pointer cursor rule is enforced: only the VS Code button and blocked bot clicks show pointer cursor.

---

## Audit Matrix

Quick reference for auditing features against principles.

| Feature | P1 Periph. | P2 Calm | P3 Glance | P4 Mapping | P5 Disclosure | P6 Character | P7 Silent | P8 Degrade | P9 Env. Fit | P10 Exit |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Bot idle/sleep animation | + | + | + | + | n/a | + | + | n/a | + | n/a |
| Speech bubbles (always on) | ~ | ~ | ~ | + | - | + | + | n/a | + | n/a |
| Bubble suppression (decision mode) | + | + | + | + | + | n/a | + | n/a | + | n/a |
| "Needs input" badge | + | + | + | + | + | n/a | + | n/a | + | ~ |
| Blocked card expansion (2x width) | + | + | + | + | n/a | n/a | + | n/a | + | n/a |
| Blocked multi-channel amber | n/a | + | + | + | n/a | + | + | n/a | + | n/a |
| Rate limit ("Back at...") | + | + | ~ | + | + | + | + | + | + | n/a |
| Assembly animation | n/a | + | n/a | + | n/a | + | + | n/a | + | n/a |
| Role colors + tools | n/a | + | + | + | n/a | + | + | n/a | + | n/a |
| Server running (emerald) | + | + | + | + | n/a | + | + | n/a | + | n/a |
| TODO list (expandable) | n/a | + | n/a | + | + | n/a | + | n/a | + | n/a |
| Conductor blue | n/a | + | + | + | n/a | + | + | n/a | + | n/a |
| VS Code button + keyboard nav | n/a | n/a | n/a | + | + | n/a | + | n/a | + | + |
| Sound chime (opt-in) | n/a | + | + | n/a | n/a | n/a | + | n/a | + | n/a |
| Compact mode | + | + | n/a | + | n/a | n/a | + | n/a | + | n/a |
| Disconnection badge | n/a | - | n/a | + | n/a | n/a | + | ~ | ~ | n/a |

`+` = supports principle | `~` = partially supports | `-` = tension with principle | `n/a` = not applicable

---

## Opportunity Backlog

Features that don't exist yet (or are partially wired), organized by which principles they'd serve.

### High value (serves 3+ principles)

| Idea | Principles | Effort | Notes |
|------|-----------|--------|-------|
| **`prefers-reduced-motion` support** — disable/simplify all animations when OS setting is on | P9, P2, P1 | Medium | Accessibility gap. Many animation systems to gate: bounce, wiggle, pulse, glow, marquee, spawn, physics, particles. |
| **Disconnection visual degradation** — desaturation or frost overlay on main content when WebSocket is down | P8, P3, P1 | Low | Current 12px badge is insufficient. Swap red pill for muted gray/amber to fix P2 tension. |

### Medium value (serves 2 principles)

| Idea | Principles | Effort | Notes |
|------|-----------|--------|-------|
| **Wire `isTired` in CuteWorld** — pass fatigue posture prop through to bot rendering | P6, P4 | Trivial | CuteBot already renders tired expression. `workingTime` available from server. Just needs prop threading. |
| **Completion celebration** — brief sparkle/confetti when agent finishes work | P6, P2 | Low | Currently just expression change (green + happy face) + toast notification. No animation. |
| **Hover-expand bubbles** — truncated bubbles expand on hover to show full text | P5, P3 | Low | Requires removing `pointer-events: none` from bubbles or adding a hover zone. |
| **Light mode / system preference** — `prefers-color-scheme` support | P9, P1 | Medium | App is dark-only. Would need CSS custom properties and theme switching. |

### Nice-to-have (serves 1 principle, or exploratory)

| Idea | Principles | Effort | Notes |
|------|-----------|--------|-------|
| **Confused expression** for error states (distinct from blocked) | P6 | Low | Errors currently render identical to blocked (amber, worried). No `error` AgentStatus type. |
| **Ambient background hue** — subtle bg color shift with overall system health | P1 | Medium | All-green-all-calm → slight warm shift when something is blocked. |
| **In-dashboard detail panel** — slide-in panel for selected project without leaving dashboard | P5 | High | Currently the only "deep dive" is exiting to VS Code. |
| **Bot clustering** for collaborating agents | P6 | High | Physics system is explicitly anti-clustering (min distance, billiard-ball bounce). Would need a new spatial mode. |

---

## Known Design Tensions

These are places where Argus's principles intentionally pull against the frameworks. They're documented trade-offs, not bugs.

| Tension | Principles in Conflict | Argus's Choice | Rationale |
|---------|----------------------|----------------|-----------|
| Always-visible bubbles vs. progressive disclosure | P5 vs. P6 | Show bubbles, suppress intelligently | Toggling creates cognitive load. Decision mode suppression handles the overwhelming case. |
| Calm affect vs. distance readability | P2 vs. P3 | Calm wins; sound handles distance | No flashing, no aggressive pulsing. Sound chime + OS notification serve as the cross-room signal. |
| Dark-only vs. environmental adaptation | P9 | Dark-only | Matches typical dev environment. Light mode is low-priority until there's a use case. |
| Anti-clustering vs. collaboration signals | P6 vs. P4 | Keep bots separated | Spatial clarity > information density. Overlapping bots would be confusing, not informative. |

---

## References

- Mankoff, J., Dey, A. K., Hsieh, G., Kientz, J., Lederer, S., & Ames, M. (2003). *Heuristic Evaluation of Ambient Displays.* Proc. CHI 2003. ACM.
- Case, A. (2015). *Calm Technology: Principles and Patterns for Non-Intrusive Design.* O'Reilly Media.
- Matthews, T., Dey, A. K., & Mankoff, J. (2006). *Designing and Evaluating Glanceable Peripheral Displays.* Proc. DIS 2006. ACM.
- Weiser, M. & Brown, J. S. (1996). *The Coming Age of Calm Technology.* Xerox PARC.
