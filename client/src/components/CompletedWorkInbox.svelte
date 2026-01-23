<script lang="ts">
  /**
   * CompletedWorkInbox - Shows recently completed work from agents
   * Displays as a slide-out panel in the bottom-right corner
   */
  import type { CompletedWorkItem } from '../../../shared/types';
  import CuteBot from './CuteBot.svelte';

  export let items: CompletedWorkItem[] = [];

  // Time ago formatter
  function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }

  // Clean agent name (remove prefixes)
  function cleanName(name: string): string {
    return name.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '');
  }

  // Get role from agent name
  function getRole(name: string): string {
    const clean = cleanName(name).toLowerCase();
    if (clean.includes('architect')) return 'architect';
    if (clean.includes('executor')) return 'executor';
    if (clean.includes('explore')) return 'explore';
    if (clean.includes('design')) return 'designer';
    if (clean.includes('research')) return 'researcher';
    if (clean.includes('writ')) return 'writer';
    if (clean.includes('test') || clean.includes('qa')) return 'tester';
    if (clean.includes('review') || clean.includes('critic')) return 'reviewer';
    return 'worker';
  }

  // Truncate task text
  function truncate(text: string, maxLen: number = 60): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  }

  $: visibleItems = items.slice(0, 5); // Show max 5 items
</script>

{#if items.length > 0}
  <div class="fixed bottom-4 right-4 w-80 max-h-96 overflow-hidden z-50">
    <!-- Header -->
    <div class="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-t-lg px-3 py-2 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-green-400">📥</span>
        <span class="text-sm font-medium text-gray-200">Completed Work</span>
      </div>
      <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
        {items.length}
      </span>
    </div>

    <!-- Items -->
    <div class="bg-gray-900/95 backdrop-blur border-x border-b border-gray-700 rounded-b-lg divide-y divide-gray-800 max-h-80 overflow-y-auto">
      {#each visibleItems as item (item.id)}
        <div class="p-3 hover:bg-gray-800/50 transition-colors animate-slide-in">
          <div class="flex items-start gap-3">
            <!-- Mini bot icon -->
            <div class="w-8 h-8 flex-shrink-0">
              <CuteBot status="complete" role={getRole(item.agentName)} size="sm" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-green-400">
                  {cleanName(item.agentName)}
                </span>
                <span class="text-xs text-gray-500">
                  {timeAgo(item.completedAt)}
                </span>
              </div>
              <p class="text-sm text-gray-300 mt-0.5 leading-snug">
                {truncate(item.task)}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {item.projectName}
              </p>
            </div>
          </div>
        </div>
      {/each}

      {#if items.length > 5}
        <div class="px-3 py-2 text-center text-xs text-gray-500">
          +{items.length - 5} more completed
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
