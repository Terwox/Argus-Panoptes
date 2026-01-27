<script lang="ts">
  import type { Project } from '../../../shared/types';
  import AgentTree from './AgentTree.svelte';
  import AgentStatus from './AgentStatus.svelte';
  import BlockedQuestion from './BlockedQuestion.svelte';
  import CuteWorld from './CuteWorld.svelte';
  import { bounce } from '../lib/bounce';
  import { cuteMode, focusedProject, archiveProject, layoutMode } from '../stores/state';
  import { toasts } from '../stores/toast';

  export let project: Project;
  export let detailed: boolean = false;
  export let selected: boolean = false;
  export let dimmed: boolean = false;

  $: agents = Object.values(project.agents);
  $: blockedAgent = agents.find((a) => a.status === 'blocked');
  $: rateLimitedAgent = agents.find((a) => a.status === 'rate_limited');
  $: serverAgent = agents.find((a) => a.status === 'server_running');
  $: conductor = agents.find((a) => a.type === 'main');
  $: isBlocked = project.status === 'blocked';
  $: isRateLimited = project.status === 'rate_limited';
  $: isServerRunning = project.status === 'server_running';
  $: isWorking = project.status === 'working';
  $: isFake = project.id.startsWith('fake-');
  $: isFocused = $focusedProject === project.id;

  // Track 2: Expanded list view state
  let todoExpanded = false;

  // Format TODO progress for display
  function formatTodoProgress(todos: typeof conductor.todos, compact: boolean = false): string {
    if (!todos || todos.items.length === 0) return '';
    const { counts } = todos;
    const total = counts.pending + counts.inProgress + counts.completed;

    // Track 3: Compact mode - just show counts
    if (compact) {
      return `${counts.completed}/${total}`;
    }

    // Find the in-progress task
    const inProgressItem = todos.items.find(t => t.status === 'in_progress');
    const currentTask = inProgressItem?.activeForm || inProgressItem?.content || '';

    // Edge cases
    if (counts.completed === total) {
      return `All ${total} tasks done`;
    }
    if (counts.inProgress === 0 && counts.completed === 0) {
      return `${total} tasks planned`;
    }

    // Normal case: show current task + counts
    const remaining = counts.pending + counts.inProgress;
    const taskText = currentTask ? currentTask.slice(0, 50) : 'Working';
    return `${taskText}${currentTask.length > 50 ? '...' : ''} (${counts.completed} done, ${remaining} left)`;
  }

  // Format rate limit reset time as friendly "Back at X:XX PM"
  function formatResetTime(timestamp: number | undefined): string {
    if (!timestamp) return 'Back soon...';
    const resetDate = new Date(timestamp);
    const now = Date.now();
    const diffMs = timestamp - now;

    // If less than 2 minutes, show "Back in X min"
    if (diffMs < 2 * 60 * 1000) {
      const mins = Math.max(1, Math.ceil(diffMs / 60000));
      return `Back in ${mins} min`;
    }

    // Otherwise show time "Back at 2:30 PM"
    return `Back at ${resetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
  }

  // DESIGN PRINCIPLES:
  // - NO anxiety-inducing elements (no timers on blocked, no pulsing, no urgency)
  // - NO VISIBLE TIMERS - no "47s ago" counters
  // - Help users calmly switch context and play whack-a-mole with projects
  // - This is NOT a GO-GO-GO dashboard

  $: borderColor = selected
    ? 'border-blue-500'
    : isBlocked
    ? 'border-blocked/50'
    : isRateLimited
      ? 'border-sky-500/30'
      : isServerRunning
        ? 'border-emerald-500/30'
        : isWorking
          ? 'border-working/30'
          : 'border-white/5';

  $: bgColor = isBlocked
    ? 'bg-blocked/5'
    : isRateLimited
      ? 'bg-sky-500/5'
      : isServerRunning
        ? 'bg-emerald-500/5'
        : isWorking
          ? 'bg-working/5'
          : 'bg-white/[0.02]';

  $: opacityClass = dimmed
    ? (isBlocked ? 'opacity-50' : 'opacity-30')
    : '';

  async function handleBounce() {
    // Copy question to clipboard if blocked
    if (isBlocked && blockedAgent?.question && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(blockedAgent.question);
        toasts.addToast('Question copied to clipboard', 'success');
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
      }
    }
    bounce(project.path, blockedAgent?.question);
  }

  function toggleFocus() {
    if (isFocused) {
      $focusedProject = null;
    } else {
      $focusedProject = project.id;
    }
  }

  function handleArchive() {
    if (!isBlocked) {
      archiveProject(project.id);
    }
  }

  function handleCardClick() {
    // DESIGN PRINCIPLE: Pointer cursor = exit action only
    // Card click just focuses/selects the project - doesn't navigate away
    // Use explicit "VS Code" button to open project
    toggleFocus();
  }
</script>

<div
  class="rounded-xl border-2 {borderColor} {bgColor} {opacityClass} p-4 transition-all duration-200 flex flex-col
         hover:border-white/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-white/5
         {selected ? 'ring-2 ring-blue-500' : ''}
         {(isBlocked || isFocused) && $layoutMode !== 'compact' ? 'md:col-span-2 lg:col-span-2' : ''}
         {isFocused && !isBlocked ? 'ring-2 ring-blue-400/50 shadow-xl shadow-blue-500/10' : ''}
         {$layoutMode === 'compact' ? 'max-w-[350px] mx-auto w-full' : ''}"
  on:click={handleCardClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && handleCardClick()}
>
  <!-- Header -->
  <div class="flex items-start justify-between mb-3">
    <div class="flex-1">
      <h3 class="font-semibold text-lg flex items-center gap-2">
        {project.name}
        {#if isBlocked}
          <!-- DESIGN: No timers or pulsing - avoid inducing anxiety. Calm context-switching, not GO-GO-GO urgency -->
          <!-- Show brief snippet of WHAT is being asked/done, not just generic "Needs input" -->
          {@const hasRealQuestion = blockedAgent?.question && blockedAgent.question !== 'Waiting for your response...'}
          {@const context = blockedAgent?.currentActivity || blockedAgent?.task}
          {@const displayText = hasRealQuestion
            ? blockedAgent.question
            : context
              ? `Done: ${context}`
              : 'Needs input'}
          <span class="text-blocked text-sm font-normal" title={displayText}>
            {displayText.slice(0, 40)}{displayText.length > 40 ? '...' : ''}
          </span>
        {:else if isRateLimited}
          <!-- DESIGN: Calm "waiting for quota" - no anxiety, just a friendly timer -->
          <span class="text-sky-400 text-sm font-normal" title="Rate limited - waiting for quota to reset">
            ☕ {formatResetTime(rateLimitedAgent?.rateLimitResetAt)}
          </span>
        {:else if isServerRunning}
          <!-- DESIGN: Calm "server running" - ambient background process -->
          <span class="text-emerald-400 text-sm font-normal" title={serverAgent?.currentActivity || 'Server running'}>
            🖥️ {serverAgent?.currentActivity || 'Server running'}
          </span>
        {:else if isWorking}
          <!-- DESIGN: NO VISIBLE TIMERS - no anxiety -->
          <span class="text-working text-sm font-normal">Active</span>
        {:else}
          <span class="text-gray-500 text-sm font-normal">Idle</span>
        {/if}
      </h3>
      <p class="text-xs text-gray-500 truncate max-w-[300px]" title={project.path}>
        {project.path}
      </p>
      {#if project.lastUserMessage && !isBlocked}
        <p class="text-xs text-gray-600 mt-1 truncate max-w-[300px]" title={project.lastUserMessage}>
          {project.lastUserMessage.slice(0, 60)}{project.lastUserMessage.length > 60 ? '...' : ''}
        </p>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      {#if !isFake}
        <!-- Focus mode button -->
        <button
          class="p-1.5 text-sm rounded-lg transition-colors
                 {isFocused
                   ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                   : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'}"
          on:click={toggleFocus}
          title={isFocused ? 'Exit Focus Mode' : 'Focus on this project'}
        >
          {isFocused ? '⊙' : '○'}
        </button>

        <!-- Archive button (hide for blocked projects) -->
        {#if !isBlocked}
          <button
            class="p-1.5 text-sm rounded-lg transition-colors bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
            on:click={handleArchive}
            title="Archive this project"
          >
            ✕
          </button>
        {/if}

        <!-- VS Code button -->
        <button
          class="px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5
                 {isBlocked
                   ? 'bg-blocked text-black font-medium hover:bg-blocked/90'
                   : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'}"
          on:click={handleBounce}
        >
          <span>→</span>
          {isBlocked ? 'Open in VS Code' : 'VS Code'}
        </button>
      {/if}
    </div>
  </div>

  <!-- Agent display -->
  <!-- DESIGN: Cards shrink to fit viewport (no-scroll design), min-h-0 allows flex shrinking -->
  <div class="flex-1 min-h-0 {$layoutMode === 'compact' ? 'max-h-[300px]' : ''}">
    {#if $cuteMode && detailed}
      <CuteWorld {agents} fillHeight={true} compact={$layoutMode === 'compact'} projectPath={project.path} />
    {:else if detailed}
      <AgentTree {agents} />
    {:else}
      <AgentStatus {agents} />
    {/if}
  </div>

  <!-- TODO Progress (below speech bubble / agent display) -->
  <!-- Only show when there's active tracking - hide stale "All done" state -->
  {#if conductor?.todos && (conductor.todos.counts.inProgress > 0 || conductor.todos.counts.pending > 0)}
    {@const progress = formatTodoProgress(conductor.todos, $layoutMode === 'compact')}
    {@const counts = conductor.todos.counts}
    {@const total = counts.pending + counts.inProgress + counts.completed}
    {@const inProgress = conductor.todos.items.find(t => t.status === 'in_progress')}
    {@const completedPercent = Math.round((counts.completed / total) * 100)}
    {@const textSize = $layoutMode === 'compact' ? 'text-[10px]' : 'text-xs'}

    <!-- Track 4: Visual polish - clickable container with hover effect -->
    <div
      class="mt-2 px-2 py-1.5 bg-white/[0.03] rounded-lg border border-white/5 hover:bg-white/[0.05] transition-colors duration-200"
      on:click={(e) => { e.stopPropagation(); todoExpanded = !todoExpanded; }}
      role="button"
      tabindex="0"
      on:keydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); todoExpanded = !todoExpanded; }}}
    >
      <!-- Track 4: Progress bar -->
      <div class="h-1 bg-white/10 rounded-full overflow-hidden mb-1.5">
        <div
          class="h-full bg-blue-500/50 transition-all duration-500 ease-out"
          style="width: {completedPercent}%"
        ></div>
      </div>

      <div class="flex items-center gap-2 {textSize} text-gray-400">
        <!-- Track 2: Chevron indicator -->
        <span class="flex-shrink-0 transition-transform duration-200 ease-out" style="transform: rotate({todoExpanded ? 90 : 0}deg)">
          ▶
        </span>

        <!-- Status indicator -->
        <span class="flex-shrink-0">
          {#if counts.completed === total}
            <span class="text-emerald-400">✓</span>
          {:else if inProgress}
            <span class="text-blue-400">●</span>
          {:else}
            <span class="text-gray-500">○</span>
          {/if}
        </span>

        <!-- Progress text -->
        <span class="truncate" title={progress}>
          {progress}
        </span>
      </div>

      <!-- Track 2: Expanded list view -->
      {#if todoExpanded}
        <div class="mt-2 space-y-1 {textSize} max-h-[200px] overflow-y-auto">
          {#each conductor.todos.items as item}
            <div class="flex items-center gap-2 text-gray-500">
              <span class={item.status === 'completed' ? 'text-emerald-400' : item.status === 'in_progress' ? 'text-blue-400' : 'text-gray-500'}>
                {item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '●' : '○'}
              </span>
              <!-- Track 4: In-progress tasks get blue color -->
              <span class={item.status === 'in_progress' ? 'text-blue-300' : ''}>
                {item.activeForm || item.content}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Blocked question (only show if not in cute mode, since CuteWorld shows it) -->
  {#if blockedAgent?.question && !($cuteMode && detailed)}
    <BlockedQuestion question={blockedAgent.question} />
  {/if}
</div>
