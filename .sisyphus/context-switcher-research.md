# Context Switcher / Multi-Session Manager Research

*Research conducted 2026-01-24 by oh-my-claudecode:researcher (Opus)*

## Query

What features might users be looking for in a "context switcher" or "multi-session manager" for AI coding assistants like Claude Code?

---

## Findings

### 1. Claude Code Multi-Project Workflow Pain Points

**Source: GitHub Issues and Developer Discussions**

| Pain Point | Description |
|------------|-------------|
| **Session Identification** | Sessions are auto-renamed based on conversation content, making it hard to find the right one when resuming |
| **Context Loss** | Claude Code's effectiveness drops after 10-20 minutes as context fills up; plans aren't persistent across sessions |
| **Session Isolation** | Most workflows operate in isolation - AI-assisted development becomes a silo with no cross-session continuity |
| **Concurrent Session Conflicts** | Multiple Claude Code instances compete for control of the same browser/resources |
| **No Session Forking** | Sessions evolve through multiple topics with no way to extract or resume just one "branch" |

**Key Issue: [#4707 - Better Multi-project workflow](https://github.com/anthropics/claude-code/issues/4707)**

*"Imagine if VS Code did not allow you to name your source files and instead created a summary name that changed each time you saved a file -- super annoying."*

**Proposed Solutions from the Community:**
- Persistent, user-defined session names with `--session-name` flag
- Session management panel with visual list of all sessions
- Cross-session context sharing (drag content between sessions)
- Session-specific CLAUDE.md context configurations

---

### 2. Context Switching Cognitive Load Research

**Source: Developer Productivity Research**

- **23 minutes and 15 seconds** average time to refocus after an interruption (Carnegie Mellon)
- **40% productivity loss** from multitasking/switching (Psychology Today)
- **$50,000/year** estimated cost per developer from context switching overhead
- **27% of the day** spent waiting for or switching between tools (~2 hours of friction)

**Key Concepts:**
- **Attention Residue** (Sophie Leroy, NYU): When switching tasks, attention remains partially engaged with the previous task
- **Flow State**: Context switching is its primary enemy
- **Zeigarnik Effect**: Unfinished tasks occupy working memory; quick comments in code can offload this

**Mitigation Strategies:**
- Clutter-free workspaces reduce cognitive load
- Quick contextual notes before switching tasks

---

### 3. Calm Technology Principles

**Source: Calm Technology Institute / Amber Case**

| Principle | Application to Argus Panoptes |
|-----------|------------------------------|
| **Peripheral Awareness** | Information at edge of attention, not demanding constant focus |
| **Minimal Attention Requirement** | Display only critical information prominently |
| **Appropriate Communication** | Status lights and color coding instead of notification spam |
| **Graceful Degradation** | Dashboard should work even if some monitoring fails |
| **Respectful Feature Scope** | Only essential metrics; avoid feature creep |

**Design Patterns for Calm Dashboards:**
- **Status Lights**: Green/orange/red indicators for session state
- **Ambient Display**: Aggregate health in peripheral vision; details on demand
- **Timed Triggers**: Status updates at meaningful intervals, not constant streaming

*Mark Weiser and John Seely Brown: "Calm technology informs but doesn't demand our focus or attention."*

---

### 4. Terminal Multiplexer Features (tmux)

**What Makes tmux Context Switching "Almost Free":**
- **Persistent Sessions**: Detach, let it run in background, reattach later
- **Scriptable Workspaces**: Build workspaces quickly from config files
- **Quick Reconstruction**: Knowing you can rebuild a workspace makes switching cheap
- **Named Sessions**: User-defined names for easy identification

**Key Features to Borrow:**
- Session previews before switching
- Directory-based workspace detection
- Quick detach/reattach without losing state
- Visual session list with current state indicators

---

### 5. IDE Workspace Manager Features

**VSCode Project Manager Extension:**
- All projects gathered in one spot
- Click to open in new window
- Tags for filtering/grouping
- Customizable project names and paths

**JetBrains Workspaces:**
- Meta-project containing multiple projects in single IDE window
- Share pre-defined setups via workspace definitions
- Partial workspace checkouts

---

### 6. Multi-Agent Dashboard UIs

| Tool | Key Features |
|------|--------------|
| **Langfuse** | Open-source; tracks latency, cost, error rates; session grouping |
| **Helicone** | Dashboard + Sessions view; traces complete user journeys |
| **Datadog LLM Observability** | End-to-end agent workflow view; tool usage, handoffs, retries |
| **Agno** | Ready-made UI for local/cloud agents; session management built-in |

---

### 7. Glanceable Dashboard Design

A glanceable interface communicates its key message in **1-2 seconds**. This is cognitive ergonomics, not minimalism.

**Principles for Developer Dashboards:**
1. **Visual Hierarchy**: Emphasize what matters through size, contrast, color
2. **Progressive Disclosure**: Start with high-level overview, drill down for detail
3. **Clarity Over Quantity**: Right data in right way, not more data
4. **Preattentive Processing**: Leverage brain's natural speed of recognition

*"A great dashboard is not about showing more data - it's about showing the right data in the right way."*

---

## Summary: Feature Ideas for Argus Panoptes

### Calm UX (Already Aligned)
- Status lights over timers (validated by calm tech research)
- Peripheral awareness: info at edge, details on demand
- Max 2 notifications for blocked state

### Session Organization
- Named session badges
- Project grouping by tags/categories
- Session previews on hover
- Directory-based auto-detection (already implemented)

### Context Switching Support
- "Pick up where you left off" indicators
- Quick context notes: surface last user message prominently
- Cross-session awareness: visual indicators when projects are related

### Blocking State Handling
- Clear "needs input" vs "working" vs "idle" states
- Actual question text displayed (not generic "Waiting...")
- One-click jump to blocked terminal

### Potential Future Features
- Session timeline (activity over time, not anxiety timers)
- Workspace definitions (saveable configs)
- Selective attention mode (focus one, dim others)
- Aggregate health indicator (single glanceable status for all)

---

## References

- [Better Multi-project workflow - Issue #4707](https://github.com/anthropics/claude-code/issues/4707)
- [TechWorld with Milan - Context Switching](https://newsletter.techworld-with-milan.com/p/context-switching-is-the-main-productivity)
- [CalmTech.com - Principles](https://calmtech.com/)
- [Medium - Design for Glanceable Interfaces](https://medium.com/design-bootcamp/design-for-glanceable-interfaces-how-preattentive-vision-shapes-intuitive-interactions-d2042b119280)
- [VSCode Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager)
- [AIMultiple - AI Agent Observability Tools](https://research.aimultiple.com/agentic-monitoring/)
