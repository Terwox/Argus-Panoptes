<script lang="ts">
  import type { Agent, SessionModes } from '../../../shared/types';
  import { cuteMode } from '../stores/state';
  import CuteBot from './CuteBot.svelte';

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

  // Format mode badges
  function modeBadges(modes: SessionModes | undefined): { icon: string; label: string; color: string }[] {
    if (!modes) return [];
    const badges: { icon: string; label: string; color: string }[] = [];

    if (modes.ralph) {
      const iteration = modes.ralphIteration && modes.ralphMaxIterations
        ? ` ${modes.ralphIteration}/${modes.ralphMaxIterations}`
        : '';
      badges.push({ icon: '🔄', label: `ralph${iteration}`, color: 'bg-purple-500/20 text-purple-300' });
    }
    if (modes.ultrawork) {
      badges.push({ icon: '⚡', label: 'ultrawork', color: 'bg-yellow-500/20 text-yellow-300' });
    }
    if (modes.planning) {
      badges.push({ icon: '📋', label: 'planning', color: 'bg-blue-500/20 text-blue-300' });
    }

    return badges;
  }

  // Check if agent is "tired" (working for 30+ minutes)
  const TIRED_THRESHOLD = 30 * 60 * 1000; // 30 minutes
  const VERY_TIRED_THRESHOLD = 60 * 60 * 1000; // 1 hour

  function tiredIndicator(agent: Agent): { icon: string; label: string } | null {
    if (agent.status === 'complete' || !agent.workingTime) return null;

    if (agent.workingTime >= VERY_TIRED_THRESHOLD) {
      return { icon: '😴', label: 'very tired' };
    }
    if (agent.workingTime >= TIRED_THRESHOLD) {
      return { icon: '😓', label: 'tired' };
    }
    return null;
  }

  // Format working time as human-readable
  function formatWorkingTime(ms: number | undefined): string {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return `${hours}h ${remainingMins}m`;
  }
</script>

<div class="font-mono space-y-2">
  {#each mainAgents as main}
    <!-- Main agent header -->
    <div class="flex items-center gap-2 {statusColor(main.status)}">
      {#if $cuteMode}
        <CuteBot status={main.status} isTired={!!tiredIndicator(main)} size="md" />
      {:else}
        <span class="text-agent">{statusIcon(main.status)}</span>
      {/if}
      <span class="text-agent text-gray-300">main</span>
      <!-- Mode badges -->
      {#each modeBadges(main.modes) as badge}
        <span class="text-caption px-1.5 py-0.5 rounded {badge.color}">
          {badge.icon} {badge.label}
        </span>
      {/each}
      <!-- Tired indicator -->
      {#if tiredIndicator(main)}
        <span
          class="text-caption px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300"
          title={`Working for ${formatWorkingTime(main.workingTime)}`}
        >
          {tiredIndicator(main)?.icon} {formatWorkingTime(main.workingTime)}
        </span>
      {/if}
    </div>
    <!-- Main agent task description -->
    {#if main.task}
      <div
        class="text-task text-gray-400 ml-6 line-clamp-2"
        title={main.task}
      >{main.task}</div>
    {/if}

    {#if subagentsByParent[main.id]}
      {#each subagentsByParent[main.id] as sub, i}
        <!-- Subagent header -->
        <div class="flex items-center gap-2 ml-6 {statusColor(sub.status)}">
          <span class="text-gray-500 text-agent">
            {i === subagentsByParent[main.id].length - 1 ? '└─' : '├─'}
          </span>
          {#if $cuteMode}
            <CuteBot status={sub.status} isTired={!!tiredIndicator(sub)} size="sm" />
          {:else}
            <span class="text-agent">{statusIcon(sub.status)}</span>
          {/if}
          <span class="text-agent text-gray-300">{sub.name || 'subagent'}</span>
          <!-- Tired indicator for subagent -->
          {#if tiredIndicator(sub)}
            <span
              class="text-caption px-1 py-0.5 rounded bg-orange-500/20 text-orange-300"
              title={`Working for ${formatWorkingTime(sub.workingTime)}`}
            >
              {tiredIndicator(sub)?.icon}
            </span>
          {/if}
        </div>
        <!-- Subagent task description -->
        {#if statusText(sub)}
          <div
            class="text-task text-gray-400 ml-12 line-clamp-2"
            title={statusText(sub)}
          >{statusText(sub)}</div>
        {/if}
      {/each}
    {/if}
  {/each}

  {#if mainAgents.length === 0 && agents.length > 0}
    <!-- Fallback if no main agent -->
    {#each agents as agent}
      <div class="flex items-center gap-2 {statusColor(agent.status)}">
        {#if $cuteMode}
          <CuteBot status={agent.status} isTired={!!tiredIndicator(agent)} size="sm" />
        {:else}
          <span class="text-agent">{statusIcon(agent.status)}</span>
        {/if}
        <span class="text-agent text-gray-300">{agent.name || agent.type}</span>
      </div>
    {/each}
  {/if}
</div>
