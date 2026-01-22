<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    connect,
    disconnect,
    connected,
    sortedProjects,
    stats,
    viewMode,
  } from './stores/state';
  import ProjectCard from './components/ProjectCard.svelte';
  import ViewToggle from './components/ViewToggle.svelte';

  onMount(() => {
    connect();
  });

  onDestroy(() => {
    disconnect();
  });
</script>

<div class="min-h-screen bg-[#0f0f0f] text-white">
  <!-- Header -->
  <header
    class="sticky top-0 z-50 bg-[#0f0f0f]/90 backdrop-blur border-b border-white/10"
  >
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">👁️</span>
        <h1 class="text-xl font-semibold tracking-tight">Argus Panoptes</h1>
        <span
          class="text-xs px-2 py-0.5 rounded-full {$connected
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'}"
        >
          {$connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <!-- Stats -->
        <div class="flex gap-3 text-sm">
          {#if $stats.blocked > 0}
            <span class="text-blocked font-medium">
              {$stats.blocked} blocked
            </span>
          {/if}
          {#if $stats.working > 0}
            <span class="text-working">
              {$stats.working} working
            </span>
          {/if}
          <span class="text-gray-500">
            {$stats.total} total
          </span>
        </div>

        <!-- View Toggle -->
        <ViewToggle />
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="max-w-7xl mx-auto px-4 py-6">
    {#if $sortedProjects.length === 0}
      <!-- Empty state -->
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <span class="text-6xl mb-4">👁️</span>
        <h2 class="text-xl font-medium mb-2">No active sessions</h2>
        <p class="text-gray-500 max-w-md">
          Start a Claude Code session with the Argus hook enabled. Sessions will
          appear here automatically.
        </p>
      </div>
    {:else}
      <!-- Project grid -->
      <div
        class="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        style="grid-auto-rows: min-content;"
      >
        {#each $sortedProjects as project (project.id)}
          <ProjectCard {project} detailed={$viewMode === 'detailed'} />
        {/each}
      </div>
    {/if}
  </main>
</div>
