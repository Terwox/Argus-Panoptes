<script lang="ts">
  /**
   * CompletedWorkInbox - Shows recently completed work from agents
   * Displays as a full grid cell card (equal to project cards)
   *
   * UPDATED: Now emits toast notifications instead of showing persistent panel
   */
  import type { CompletedWorkItem } from '../../../shared/types';
  import CuteBot from './CuteBot.svelte';
  import { toasts } from '../stores/toast';
  import { onMount } from 'svelte';

  export let items: CompletedWorkItem[] = [];

  // DESIGN: NO VISIBLE TIMERS - no "47s ago" anxiety counters

  // Track which items we've already shown toasts for
  let shownToasts = new Set<string>();

  // Watch for new items and emit toasts
  $: {
    items.forEach(item => {
      if (!shownToasts.has(item.id)) {
        shownToasts.add(item.id);
        // Only emit toast for items added after initial load
        // Toasts are temporary (15s), so be verbose - show full task up to 150 chars
        if (shownToasts.size > 1) {
          toasts.addCompletion(item.projectName, cleanName(item.agentName), truncate(item.task, 150));
        }
      }
    });
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
  function truncate(text: string, maxLen: number = 80): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  }
</script>

<!-- Card-style container matching ProjectCard -->
<div class="rounded-xl border-2 border-green-500/30 bg-green-500/5 p-4 transition-all duration-200 flex flex-col h-full min-h-0">
  <!-- Header -->
  <div class="flex items-center justify-between mb-3">
    <h3 class="font-semibold text-lg flex items-center gap-2">
      <span class="text-green-400">📥</span>
      Completed Work
      {#if items.length > 0}
        <span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      {/if}
    </h3>
  </div>

  <!-- Items list - scrollable if needed -->
  <div class="flex-1 min-h-0 overflow-y-auto space-y-2">
    {#if items.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <span class="text-3xl mb-2">✨</span>
        <p class="text-sm">No completed tasks yet</p>
        <p class="text-xs mt-1">Tasks will appear here as agents finish</p>
      </div>
    {:else}
      {#each items as item (item.id)}
        <div class="p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors animate-slide-in">
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
                <!-- DESIGN: NO VISIBLE TIMERS - no anxiety -->
                <span class="text-xs text-gray-500">✓</span>
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
    {/if}
  </div>
</div>

<style>
  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
