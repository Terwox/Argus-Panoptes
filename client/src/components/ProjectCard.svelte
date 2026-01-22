<script lang="ts">
  import type { Project } from '../../../shared/types';
  import AgentTree from './AgentTree.svelte';
  import AgentStatus from './AgentStatus.svelte';
  import BlockedQuestion from './BlockedQuestion.svelte';
  import { bounce } from '../lib/bounce';

  export let project: Project;
  export let detailed: boolean = false;

  $: agents = Object.values(project.agents);
  $: blockedAgent = agents.find((a) => a.status === 'blocked');
  $: isBlocked = project.status === 'blocked';
  $: isWorking = project.status === 'working';

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
  class="rounded-xl border-2 {borderColor} {bgColor} p-4 transition-all duration-200
         {isBlocked ? 'md:col-span-2 lg:col-span-2' : ''}"
>
  <!-- Header -->
  <div class="flex items-start justify-between mb-3">
    <div>
      <h3 class="font-semibold text-lg flex items-center gap-2">
        {project.name}
        {#if isBlocked}
          <span class="text-blocked text-sm font-normal">BLOCKED</span>
        {:else if isWorking}
          <span class="text-working text-sm font-normal">Working...</span>
        {:else}
          <span class="text-gray-500 text-sm font-normal">Idle</span>
        {/if}
      </h3>
      <p class="text-xs text-gray-500 truncate max-w-[300px]" title={project.path}>
        {project.path}
      </p>
    </div>

    {#if isBlocked}
      <button
        class="px-3 py-1.5 bg-blocked text-black font-medium text-sm rounded-lg
               hover:bg-blocked/90 transition-colors flex items-center gap-1.5"
        on:click={handleBounce}
      >
        <span>→</span>
        Open in VS Code
      </button>
    {/if}
  </div>

  <!-- Agent display -->
  {#if detailed}
    <AgentTree {agents} />
  {:else}
    <AgentStatus {agents} />
  {/if}

  <!-- Blocked question -->
  {#if blockedAgent?.question}
    <BlockedQuestion question={blockedAgent.question} />
  {/if}
</div>
