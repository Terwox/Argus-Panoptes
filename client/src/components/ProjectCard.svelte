<script lang="ts">
  import type { Project } from '../../../shared/types';
  import AgentTree from './AgentTree.svelte';
  import AgentStatus from './AgentStatus.svelte';
  import BlockedQuestion from './BlockedQuestion.svelte';
  import CuteWorld from './CuteWorld.svelte';
  import { bounce } from '../lib/bounce';
  import { cuteMode } from '../stores/state';
  import { onMount, onDestroy } from 'svelte';

  export let project: Project;
  export let detailed: boolean = false;

  $: agents = Object.values(project.agents);
  $: blockedAgent = agents.find((a) => a.status === 'blocked');
  $: isBlocked = project.status === 'blocked';
  $: isWorking = project.status === 'working';
  $: isFake = project.id.startsWith('fake-');

  // DESIGN PRINCIPLES:
  // - NO anxiety-inducing elements (no timers on blocked, no pulsing, no urgency)
  // - Help users calmly switch context and play whack-a-mole with projects
  // - This is NOT a GO-GO-GO dashboard

  // Time tracking for UX - only show "last activity" for working projects
  let now = Date.now();
  let interval: ReturnType<typeof setInterval>;

  onMount(() => {
    interval = setInterval(() => {
      now = Date.now();
    }, 1000);
  });

  onDestroy(() => {
    if (interval) clearInterval(interval);
  });

  // Format time duration for display (working projects only)
  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  $: lastActivityDuration = now - project.lastActivityAt;

  $: borderColor = isBlocked
    ? 'border-blocked/50'
    : isWorking
      ? 'border-working/30'
      : 'border-white/5';

  $: bgColor = isBlocked
    ? 'bg-blocked/5'
    : isWorking
      ? 'bg-working/5'
      : 'bg-white/[0.02]';

  function handleBounce() {
    bounce(project.path, blockedAgent?.question);
  }
</script>

<div
  class="rounded-xl border-2 {borderColor} {bgColor} p-4 transition-all duration-200 flex flex-col
         {isBlocked ? 'md:col-span-2 lg:col-span-2' : ''}"
>
  <!-- Header -->
  <div class="flex items-start justify-between mb-3">
    <div>
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
        {:else if isWorking}
          <span class="text-working text-sm font-normal">Active</span>
          <span class="text-working/60 text-xs font-normal">(last: {formatDuration(lastActivityDuration)})</span>
        {:else}
          <span class="text-gray-500 text-sm font-normal">Idle</span>
        {/if}
      </h3>
      <p class="text-xs text-gray-500 truncate max-w-[300px]" title={project.path}>
        {project.path}
      </p>
    </div>

    {#if !isFake}
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

  <!-- Agent display -->
  <!-- DESIGN: Cards shrink to fit viewport (no-scroll design), min-h-0 allows flex shrinking -->
  <div class="flex-1 min-h-0">
    {#if $cuteMode && detailed}
      <CuteWorld {agents} fillHeight={true} />
    {:else if detailed}
      <AgentTree {agents} />
    {:else}
      <AgentStatus {agents} />
    {/if}
  </div>

  <!-- Blocked question (only show if not in cute mode, since CuteWorld shows it) -->
  {#if blockedAgent?.question && !($cuteMode && detailed)}
    <BlockedQuestion question={blockedAgent.question} />
  {/if}
</div>
