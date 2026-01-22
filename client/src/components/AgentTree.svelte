<script lang="ts">
  import type { Agent } from '../../../shared/types';

  export let agents: Agent[];

  // Build tree structure
  $: mainAgents = agents.filter((a) => a.type === 'main');
  $: subagentsByParent = agents
    .filter((a) => a.type === 'subagent')
    .reduce(
      (acc, agent) => {
        const parentId = agent.parentId || 'unknown';
        if (!acc[parentId]) acc[parentId] = [];
        acc[parentId].push(agent);
        return acc;
      },
      {} as Record<string, Agent[]>
    );

  function statusIcon(status: Agent['status']): string {
    switch (status) {
      case 'blocked':
        return '💬';
      case 'working':
        return '⏳';
      case 'complete':
        return '✅';
      default:
        return '•';
    }
  }

  function statusColor(status: Agent['status']): string {
    switch (status) {
      case 'blocked':
        return 'text-blocked';
      case 'working':
        return 'text-working';
      case 'complete':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }

  function statusText(agent: Agent): string {
    switch (agent.status) {
      case 'blocked':
        return agent.question || 'Waiting for input...';
      case 'complete':
        return agent.task || 'Done';
      case 'working':
        return agent.task || '';
      default:
        return '';
    }
  }
</script>

<div class="text-sm font-mono">
  {#each mainAgents as main}
    <div class="flex items-center gap-2 {statusColor(main.status)}">
      <span>{statusIcon(main.status)}</span>
      <span class="text-gray-400">main</span>
      {#if statusText(main)}
        <span
          class="text-gray-600 truncate text-xs flex-1 min-w-0"
          title={statusText(main)}
        >— {statusText(main)}</span>
      {/if}
    </div>

    {#if subagentsByParent[main.id]}
      {#each subagentsByParent[main.id] as sub, i}
        <div class="flex items-center gap-2 ml-4 {statusColor(sub.status)}">
          <span class="text-gray-600">
            {i === subagentsByParent[main.id].length - 1 ? '└─' : '├─'}
          </span>
          <span>{statusIcon(sub.status)}</span>
          <span class="text-gray-400">{sub.name || 'subagent'}</span>
          <span
            class="text-gray-600 truncate text-xs flex-1 min-w-0"
            title={statusText(sub) || '(no task)'}
          >— {statusText(sub) || '(no task)'}</span>
        </div>
      {/each}
    {/if}
  {/each}

  {#if mainAgents.length === 0 && agents.length > 0}
    <!-- Fallback if no main agent -->
    {#each agents as agent}
      <div class="flex items-center gap-2 {statusColor(agent.status)}">
        <span>{statusIcon(agent.status)}</span>
        <span class="text-gray-400">{agent.name || agent.type}</span>
      </div>
    {/each}
  {/if}
</div>
