# Argus Panoptes — Design Principles & Audit Framework

A formal design principles document grounded in established heuristic frameworks, tailored for calm ambient monitoring dashboards with a character-driven user interface (UI).

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
- [ ] No blocked-state countdowns, anxiety-inducing "time since" counters, or continuously prominent timers

**Argus status:** Strong. "Needs input" language, no blocked-state countdowns, no continuously prominent timers, and no flashing. Blocked bots wiggle gently (3-degree rotation) rather than pulsing. Rate limit framing ("Back at X:XX PM") avoids countdown anxiety. After 30 minutes, tired agents receive a low-salience fatigue cue: the conductor badge and tooltip include approximate working duration, while subagents use an icon with duration in the tooltip. This is a wellbeing signal, not an urgency or performance counter. Sleeping animation uses organic Z-bubble patterns. Sound notifications are opt-in via Settings.

---

### P3. Glanceable State

> System state must be comprehensible in a single glance (<250ms of attention). Use preattentive features: color, position, size, motion.

**Sources:** Matthews (Glanceable Displays), Mankoff H4 (Sufficient information design), Mankoff H7 (Visibility of state)

**Auditable criteria:**
- [ ] Each project's status is distinguishable by color alone (no need to read text)
- [ ] Agent count per project is perceivable without counting (1 vs. 3 vs. 8 are visually distinct)
- [ ] The "something needs me" signal is detectable from 2+ meters away
- [ ] No more than 3-4 distinct visual states to learn (working/blocked/idle/rate-limited maps well to this)

**Argus status:** Good with a deliberate trade-off. Blocked state uses multi-channel signaling: amber color flood (bot body + bubble + border + VS Code button), card width doubling, bot expression change (worried eyes/mouth), blocked projects sort to top of grid. Sound chime + operating system (OS) notification serve as the true distance signal. Trade-off: the card background tint is only 5% opacity amber — nearly invisible at distance. The 8px health indicator dot is too small for peripheral vision. The project consciously chose calm over aggressive visual alarm; sound handles the distance case.

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

**Argus status:** Deliberate tension, with disclosure now implemented at several levels. Speech bubbles are normally visible (design rule: "toggling creates cognitive load"), which trades progressive disclosure for reduced interaction cost. Decision mode suppresses non-blocked subagent bubbles to focus attention on the blocking question. Suppressed bubbles can be revealed temporarily, truncated bubbles expand on hover, to-do (TODO) lists are expandable, and a project detail panel provides a deeper current-state view without turning the main grid into a log viewer.

**Implemented disclosure layers:**
1. Ambient: bot colors + motion (always visible)
2. Glanceable: speech bubbles with truncated text (always visible, intelligently suppressed)
3. Expanded: hover truncated bubble, reveal a suppressed bubble temporarily, expand TODO list
4. Detail: open the project detail panel for current project and agent information
5. Exit: a VS Code button opens the project and copies a surfaced blocker; a blocked-bot click or Enter on the keyboard opens it directly without a clipboard copy. Number keys and Tab select or cycle before Enter.

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

Fatigue posture is wired in both the character and textual views: `workingTime` drives `isTired` for bots and, after the 30-minute threshold, the text view exposes the derived duration at low salience. The conductor shows the approximate duration in its fatigue badge and tooltip; subagents show the fatigue icon with duration in the tooltip. This deliberately trades an absolute no-timer rule for a wellbeing cue without turning duration into urgency. Completion can also trigger a calm high-five/sparkle interaction and a completion toast.

---

### P7. Soundless by Default

> The dashboard is silent unless the user opts in. All primary communication is visual.

**Sources:** Case P5 (Technology can communicate but doesn't need to speak), Case P8 (Respect social norms)

**Auditable criteria:**
- [ ] Zero audio by default — no notification sounds, no chimes, no alerts
- [ ] If audio is added, it must be opt-in and respect system notification settings
- [ ] The dashboard works equally well muted and unmuted (it's the same)

**Argus status:** Met. Sound is opt-in via Settings ("Sound Notifications" toggle). When enabled, `playChime()` fires on new blocked states. The OS `Notification` application programming interface (API) is used for desktop notifications. All primary state communication remains visual regardless of sound setting.

---

### P8. Graceful Degradation

> When data is missing, stale, or the system is disconnected, the display remains calm and useful — never alarming.

**Sources:** Case P6 (Work even when it fails), Mankoff H7 (Visibility of state)

**Auditable criteria:**
- [ ] Disconnected state is visually distinct but not alarming (greyed out, not red)
- [ ] Stale data fades or dims rather than showing error states
- [ ] Missing projects simply don't appear (no empty error cards)
- [ ] Server restart doesn't cause visual chaos (smooth reconnection)

**Argus status:** Met for the current local architecture. WebSocket clients reconnect after disconnect, stale sessions are cleaned up silently, and missing projects simply do not render. A disconnected state uses a muted slate badge plus a subtle frost/desaturation overlay and reduced content opacity, making stale state visible without presenting an alarm.

---

### P9. Environmental Fit

> The dashboard should feel like it belongs in a workspace — not like a mission control center.

**Sources:** Mankoff H3 (Match between display and environment), Mankoff H8 (Aesthetic and pleasing design), Case P8 (Respect social norms)

**Auditable criteria:**
- [ ] Color palette is muted/warm enough to not draw unwanted attention in an office
- [ ] The visual style is cohesive (cute bots don't clash with data typography)
- [ ] The dashboard looks intentional on a shared screen (not embarrassing, not alarming)
- [ ] Adapts to environment (dark/light, compact/full, reduced motion)

**Argus status:** Strong. The cute bot aesthetic remains cohesive, compact mode can be automatic or manually selected, and theme selection supports light, dark, and the system `prefers-color-scheme` setting. The client observes `prefers-reduced-motion`; global styles and the most animation-heavy character/detail surfaces disable or simplify motion when it is requested.

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
| VS Code button (project card) | Opens `vscode://file/{path}` through the shared bounce helper; copies a surfaced blocked question or error to the clipboard first |
| VS Code button (detail panel) | Opens through the same helper; copies a blocked question but does not select an error message for copying |
| Click any bot | Triggers an in-dashboard bobble and reaction; a non-blocked bot stays in Argus and can reveal a suppressed bubble |
| Click blocked bot | Also opens `vscode://file/{path}` directly, without copying the question |
| Tab key | Cycles through blocked projects |
| Enter key | Opens the selected project in VS Code directly, without copying text |
| Number keys (1-9) | Selects project by grid position |
| Card click | Toggles focus mode (stays in dashboard — no pointer cursor) |

Card click intentionally does NOT navigate — it toggles focus mode. Bot clicks are a current exception to the pointer-means-exit rule: every bot is clickable for an in-dashboard reaction, while only blocked bots also navigate away. VS Code buttons remain the clipboard-aware exit path.

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
| Hover-expanded bubbles | n/a | + | + | + | + | + | + | n/a | + | n/a |
| Project detail panel | n/a | + | n/a | + | + | n/a | + | n/a | + | + |
| Conductor blue | n/a | + | + | + | n/a | + | + | n/a | + | n/a |
| VS Code button + keyboard nav | n/a | n/a | n/a | + | + | n/a | + | n/a | + | + |
| Sound chime (opt-in) | n/a | + | + | n/a | n/a | n/a | + | n/a | + | n/a |
| Compact mode | + | + | n/a | + | n/a | n/a | + | n/a | + | n/a |
| Light/dark/system theme | + | + | n/a | + | n/a | n/a | + | + | + | n/a |
| Reduced-motion behavior | + | + | n/a | + | n/a | + | + | + | + | n/a |
| Disconnection badge + frost overlay | + | + | + | + | n/a | n/a | + | + | + | n/a |

`+` = supports principle | `~` = partially supports | `-` = tension with principle | `n/a` = not applicable

---

## Audit Closure and Remaining Opportunities

The original opportunity backlog is retained here as history rather than as an active checklist. The following items were completed after the first audit: reduced-motion support, calm disconnected-state degradation, fatigue posture in the bot view, completion interactions, hover-expanded bubbles, light/system themes, distinct error rendering, an ambient system-health hue, and the project detail panel.

Remaining product opportunities must preserve the principles above:

| Idea | Principles | Constraint |
|------|-----------|------------|
| **Transcript-position navigation** from a bot or bubble | P5, P10 | Deferred until VS Code exposes a reliable terminal/scrollback target; the source FUTURE note remains active. |
| **User-defined priority pinning** | P3, P10 | Must not cause unstable reordering or obscure blocked first-in, first-out (FIFO) priority. |
| **Persistent history** | P5, P8 | Must remain secondary to current-state triage and must not turn the grid into a log viewer. |
| **OpenClaw source differentiation** | P4, P6 | Optional cosmetic work only after real transcript and lifecycle behavior is verified. |

**Implemented boundary:** Collaboration proximity is implemented as a restrained signal: `MIN_CLUSTER_DISTANCE`, `CLUSTER_RADIUS`, and `CLUSTER_PULL` bound the attraction between related bots, and a proximity connector renders between them. Tight overlap and clumping remain intentionally rejected. The physics system preserves enough separation for spatial clarity and unambiguous bubble association while still making collaboration visible.

---

## Known Design Tensions

These are places where Argus's principles intentionally pull against the frameworks. They're documented trade-offs, not bugs.

| Tension | Principles in Conflict | Argus's Choice | Rationale |
|---------|----------------------|----------------|-----------|
| Always-visible bubbles vs. progressive disclosure | P5 vs. P6 | Show bubbles, suppress intelligently | Toggling creates cognitive load. Decision mode suppression handles the overwhelming case. |
| Calm affect vs. distance readability | P2 vs. P3 | Calm wins; sound handles distance | No flashing, no aggressive pulsing. Sound chime + OS notification serve as the cross-room signal. |
| Theme adaptation vs. ambient consistency | P9 | Follow system preference, allow light/dark override | Environmental fit improves without changing the information mapping. |
| Collaboration proximity vs. spatial clarity | P6 vs. P4 | Use bounded attraction and a proximity connector; reject tight overlap and clumping | Collaboration remains visible without sacrificing bot separation or unambiguous bubble association. Overlapping bots would be confusing, not informative. |

---

## References

- Mankoff, J., Dey, A. K., Hsieh, G., Kientz, J., Lederer, S., & Ames, M. (2003). *Heuristic Evaluation of Ambient Displays.* Proc. CHI 2003. ACM.
- Case, A. (2015). *Calm Technology: Principles and Patterns for Non-Intrusive Design.* O'Reilly Media.
- Matthews, T., Dey, A. K., & Mankoff, J. (2006). *Designing and Evaluating Glanceable Peripheral Displays.* Proc. DIS 2006. ACM.
- Weiser, M. & Brown, J. S. (1996). *The Coming Age of Calm Technology.* Xerox PARC.
