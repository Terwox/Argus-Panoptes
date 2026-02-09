<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import type { Project, Agent } from '../../../shared/types';
  import { bounce } from '../lib/bounce';
  import { toasts } from '../stores/toast';

  export let project: Project | null = null;
  export let open: boolean = false;

  const dispatch = createEventDispatcher();

  // Reactive derivations from project
  $: agents = project ? (Object.values(project.agents) as Agent[]) : [];
  $: conductor = agents.find(a => a.type === 'main');
  $: subagents = agents.filter(a => a.type === 'subagent');
  $: backgroundAgents = agents.filter(a => a.type === 'background');
  $: blockedAgent = agents.find(a => a.status === 'blocked');
  $: isBlocked = project?.status === 'blocked';
  $: isError = project?.status === 'error';
  $: isRateLimited = project?.status === 'rate_limited';
  $: isServerRunning = project?.status === 'server_running';
  $: isFake = project?.id.startsWith('fake-') ?? false;

  // Status display
  $: statusLabel = isBlocked ? 'Needs input'
    : isError ? 'Error'
    : isRateLimited ? 'Rate limited'
    : isServerRunning ? 'Server running'
    : project?.status === 'working' ? 'Working'
    : 'Idle';

  $: statusColor = isBlocked ? 'text-blocked'
    : isError ? 'text-purple-400'
    : isRateLimited ? 'text-sky-400'
    : isServerRunning ? 'text-emerald-400'
    : project?.status === 'working' ? 'text-working'
    : 'text-[var(--text-muted)]';

  $: statusDot = isBlocked ? 'bg-blocked'
    : isError ? 'bg-purple-400'
    : isRateLimited ? 'bg-sky-400'
    : isServerRunning ? 'bg-emerald-400'
    : project?.status === 'working' ? 'bg-working'
    : 'bg-[var(--text-muted)]';

  // Clean agent name (strip framework prefixes)
  function cleanName(name: string | undefined): string {
    if (!name) return 'Agent';
    return name.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '');
  }

  // Agent status icon
  function agentStatusIcon(status: string): string {
    switch (status) {
      case 'working': return '●';
      case 'blocked': return '⏸';
      case 'complete': return '✓';
      case 'error': return '!';
      case 'rate_limited': return '☕';
      case 'server_running': return '🖥';
      default: return '○';
    }
  }

  function agentStatusColor(status: string): string {
    switch (status) {
      case 'working': return 'text-blue-400';
      case 'blocked': return 'text-blocked';
      case 'complete': return 'text-emerald-400';
      case 'error': return 'text-purple-400';
      case 'rate_limited': return 'text-sky-400';
      case 'server_running': return 'text-emerald-400';
      default: return 'text-[var(--text-muted)]';
    }
  }

  function close() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      close();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close();
    }
  }

  function openInVSCode() {
    if (project && !isFake) {
      bounce(project.path, blockedAgent?.question);
      close();
    }
  }

  async function copyPath() {
    if (project && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(project.path);
        toasts.addToast('Path copied to clipboard', 'success');
      } catch (err) {
        console.error('Failed to copy path:', err);
      }
    }
  }

  async function copyQuestion() {
    if (blockedAgent?.question && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(blockedAgent.question);
        toasts.addToast('Question copied to clipboard', 'success');
      } catch (err) {
        console.error('Failed to copy question:', err);
      }
    }
  }

  // Format rate limit reset time
  function formatResetTime(timestamp: number | undefined): string {
    if (!timestamp) return 'Back soon...';
    const resetDate = new Date(timestamp);
    const now = Date.now();
    const diffMs = timestamp - now;
    if (diffMs < 2 * 60 * 1000) {
      const mins = Math.max(1, Math.ceil(diffMs / 60000));
      return `Back in ${mins} min`;
    }
    return `Back at ${resetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
  }

  // Manage keyboard listener
  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open && project}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="detail-backdrop"
    on:click={handleBackdropClick}
  >
    <!-- Panel -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class="detail-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-panel-title"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-5 pb-4 border-b border-[var(--panel-border)]">
        <div class="flex-1 min-w-0">
          <h2 id="detail-panel-title" class="text-xl font-semibold text-[var(--panel-text)] truncate">
            {project.name}
          </h2>
          <p class="text-sm text-[var(--panel-description)] mt-1 break-all">{project.path}</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="w-2 h-2 rounded-full {statusDot}"></span>
            <span class="text-sm font-medium {statusColor}">{statusLabel}</span>
            {#if agents.length > 1}
              <span class="text-xs text-[var(--panel-description)] ml-2">
                {agents.length} agents
              </span>
            {/if}
          </div>
        </div>
        <button
          class="ml-3 p-1.5 rounded-lg hover:bg-[var(--bg-muted-hover)] text-[var(--panel-description)] transition-colors flex-shrink-0"
          on:click={close}
          title="Close (Esc)"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 5L15 15M15 5L5 15" />
          </svg>
        </button>
      </div>

      <!-- Scrollable content -->
      <div class="detail-content">

        <!-- Last user message -->
        {#if project.lastUserMessage}
          <section class="detail-section">
            <h3 class="detail-section-title">Last prompt</h3>
            <p class="text-sm text-[var(--panel-text)] leading-relaxed">
              {project.lastUserMessage}
            </p>
          </section>
        {/if}

        <!-- Blocked question (full text) -->
        {#if blockedAgent?.question}
          <section class="detail-section">
            <h3 class="detail-section-title text-blocked">
              {isError ? 'Error' : 'Question'}
            </h3>
            <div class="p-3 rounded-lg border {isError ? 'bg-purple-500/10 border-purple-500/30' : 'bg-blocked/10 border-blocked/30'}">
              <p class="text-sm whitespace-pre-wrap leading-relaxed {isError ? 'text-purple-300' : 'text-blocked/90'}">
                {blockedAgent.question}
              </p>
            </div>
            <button
              class="mt-2 text-xs text-[var(--panel-description)] hover:text-[var(--panel-text)] transition-colors"
              on:click={copyQuestion}
            >
              Copy question text
            </button>
          </section>
        {/if}

        <!-- Rate limit info -->
        {#if isRateLimited}
          {@const rateLimitedAgent = agents.find(a => a.status === 'rate_limited')}
          <section class="detail-section">
            <h3 class="detail-section-title text-sky-400">Rate Limited</h3>
            <p class="text-sm text-[var(--panel-text)]">
              {formatResetTime(rateLimitedAgent?.rateLimitResetAt)}
            </p>
          </section>
        {/if}

        <!-- Agents section -->
        <section class="detail-section">
          <h3 class="detail-section-title">Agents</h3>
          <div class="space-y-3">
            <!-- Conductor -->
            {#if conductor}
              <div class="agent-row">
                <div class="flex items-center gap-2">
                  <span class="{agentStatusColor(conductor.status)} text-sm">{agentStatusIcon(conductor.status)}</span>
                  <span class="text-sm font-medium text-[var(--panel-text)]">
                    {cleanName(conductor.name)} <span class="text-xs text-[var(--panel-description)]">(conductor)</span>
                  </span>
                </div>
                {#if conductor.currentActivity}
                  <p class="text-xs text-[var(--panel-description)] mt-1 ml-6 leading-relaxed">
                    {conductor.currentActivity}
                  </p>
                {/if}
                {#if conductor.task && conductor.task !== conductor.currentActivity}
                  <p class="text-xs text-[var(--panel-description)] mt-0.5 ml-6 opacity-70">
                    Task: {conductor.task}
                  </p>
                {/if}
                {#if conductor.modes}
                  <div class="flex gap-1 mt-1 ml-6">
                    {#if conductor.modes.ralph}
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        Ralph {conductor.modes.ralphIteration ? `${conductor.modes.ralphIteration}/${conductor.modes.ralphMaxIterations || '?'}` : ''}
                      </span>
                    {/if}
                    {#if conductor.modes.ultrawork}
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">Ultrawork</span>
                    {/if}
                    {#if conductor.modes.planning}
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Planning</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Subagents -->
            {#each subagents as agent (agent.id)}
              <div class="agent-row">
                <div class="flex items-center gap-2">
                  <span class="{agentStatusColor(agent.status)} text-sm">{agentStatusIcon(agent.status)}</span>
                  <span class="text-sm font-medium text-[var(--panel-text)]">
                    {cleanName(agent.name)}
                  </span>
                  <span class="text-xs text-[var(--panel-description)]">subagent</span>
                </div>
                {#if agent.currentActivity}
                  <p class="text-xs text-[var(--panel-description)] mt-1 ml-6 leading-relaxed">
                    {agent.currentActivity}
                  </p>
                {/if}
                {#if agent.task && agent.task !== agent.currentActivity}
                  <p class="text-xs text-[var(--panel-description)] mt-0.5 ml-6 opacity-70">
                    Task: {agent.task}
                  </p>
                {/if}
              </div>
            {/each}

            <!-- Background agents -->
            {#each backgroundAgents as agent (agent.id)}
              <div class="agent-row">
                <div class="flex items-center gap-2">
                  <span class="{agentStatusColor(agent.status)} text-sm">{agentStatusIcon(agent.status)}</span>
                  <span class="text-sm font-medium text-[var(--panel-text)]">
                    {cleanName(agent.name)}
                  </span>
                  <span class="text-xs text-[var(--panel-description)]">background</span>
                </div>
                {#if agent.currentActivity}
                  <p class="text-xs text-[var(--panel-description)] mt-1 ml-6 leading-relaxed">
                    {agent.currentActivity}
                  </p>
                {/if}
              </div>
            {/each}
          </div>
        </section>

        <!-- TODO list (complete) -->
        {#if conductor?.todos && conductor.todos.items.length > 0}
          {@const counts = conductor.todos.counts}
          {@const total = counts.pending + counts.inProgress + counts.completed}
          {@const completedPercent = Math.round((counts.completed / total) * 100)}
          <section class="detail-section">
            <h3 class="detail-section-title">
              Tasks
              <span class="text-xs font-normal text-[var(--panel-description)] ml-2">
                {counts.completed}/{total} done
              </span>
            </h3>
            <!-- Progress bar -->
            <div class="h-1.5 bg-[var(--bg-muted)] rounded-full overflow-hidden mb-3">
              <div
                class="h-full bg-blue-500/60 transition-all duration-500 ease-out rounded-full"
                style="width: {completedPercent}%"
              ></div>
            </div>
            <div class="space-y-1.5">
              {#each conductor.todos.items as item}
                <div class="flex items-start gap-2">
                  <span class="flex-shrink-0 mt-0.5 {item.status === 'completed' ? 'text-emerald-400' : item.status === 'in_progress' ? 'text-blue-400' : 'text-gray-500'}">
                    {item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '●' : '○'}
                  </span>
                  <span class="text-sm leading-relaxed {item.status === 'in_progress' ? 'text-blue-300 font-medium' : item.status === 'completed' ? 'text-[var(--panel-description)] line-through opacity-70' : 'text-[var(--panel-text)]'}">
                    {item.status === 'in_progress' ? (item.activeForm || item.content) : item.content}
                  </span>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Quick actions -->
        <section class="detail-section border-b-0 pb-0">
          <h3 class="detail-section-title">Actions</h3>
          <div class="flex flex-wrap gap-2">
            {#if !isFake}
              <button
                class="action-btn {isBlocked ? 'action-btn-primary' : ''}"
                on:click={openInVSCode}
              >
                <span>&#8594;</span>
                Open in VS Code
              </button>
            {/if}
            <button
              class="action-btn"
              on:click={copyPath}
            >
              Copy path
            </button>
            {#if blockedAgent?.question}
              <button
                class="action-btn"
                on:click={copyQuestion}
              >
                Copy question
              </button>
            {/if}
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<style>
  .detail-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .detail-panel {
    width: 460px;
    max-width: 90vw;
    height: 100%;
    background: var(--panel-bg);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    animation: slideInRight 0.3s ease-out;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  .detail-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    /* Smooth scrolling */
    scroll-behavior: smooth;
    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--border-default) transparent;
  }

  .detail-content::-webkit-scrollbar {
    width: 6px;
  }

  .detail-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .detail-content::-webkit-scrollbar-thumb {
    background: var(--border-default);
    border-radius: 3px;
  }

  .detail-section {
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--panel-border);
  }

  .detail-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--panel-description);
    margin: 0 0 0.75rem 0;
    display: flex;
    align-items: center;
  }

  .agent-row {
    padding: 0.5rem 0.75rem;
    background: var(--bg-muted);
    border-radius: 0.5rem;
    border: 1px solid var(--panel-border);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.875rem;
    border-radius: 0.5rem;
    border: 1px solid var(--panel-border);
    background: transparent;
    color: var(--panel-text);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  .action-btn-primary {
    background: #f59e0b;
    border-color: #f59e0b;
    color: #000;
    font-weight: 500;
  }

  .action-btn-primary:hover {
    background: #d97706;
    border-color: #d97706;
    color: #000;
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .detail-backdrop,
    .detail-panel {
      animation: none;
    }
  }
</style>
