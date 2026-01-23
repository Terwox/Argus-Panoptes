<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    connect,
    disconnect,
    connected,
    sortedProjects,
    realProjects,
    stats,
    viewMode,
    cuteMode,
    fakeMode,
    completedWork,
  } from './stores/state';
  import ProjectCard from './components/ProjectCard.svelte';
  import ViewToggle from './components/ViewToggle.svelte';
  import Scoreboard from './components/Scoreboard.svelte';
  import CompletedWorkInbox from './components/CompletedWorkInbox.svelte';

  onMount(() => {
    connect();
  });

  onDestroy(() => {
    disconnect();
  });

  function toggleCute() {
    cuteMode.update((v) => !v);
  }

  function toggleFake() {
    fakeMode.update((v) => !v);
  }

  // Calculate grid layout based on project count and cute mode
  // In cute mode: 2x2 grid (projects + completed work panel as 4th cell)
  $: gridCols = $cuteMode && $viewMode === 'detailed'
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  // Total cells in cute mode includes Completed Work panel as equal-sized cell
  $: totalCells = $cuteMode ? $sortedProjects.length + 1 : $sortedProjects.length;

  // DESIGN PRINCIPLE: No scrolling unless >4 cells
  // Cards should shrink to fit viewport, not overflow
  $: allowScroll = totalCells > 4;
</script>

<div class="h-screen flex flex-col bg-[#0f0f0f] text-white overflow-hidden">
  <!-- Header -->
  <header class="flex-shrink-0 bg-[#0f0f0f]/90 backdrop-blur border-b border-white/10">
    <div class="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">ꙮ</span>
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

        <!-- Cute Mode Toggle -->
        <button
          class="px-2 py-1 text-sm rounded-lg transition-colors {$cuteMode
            ? 'bg-pink-500/20 text-pink-300'
            : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
          on:click={toggleCute}
          title="Toggle cute bot mode"
        >
          🤖
        </button>

        <!-- Fake Projects Toggle (only show if <3 real projects) -->
        {#if $realProjects.length < 3}
          <button
            class="px-2 py-1 text-sm rounded-lg transition-colors {$fakeMode
              ? 'bg-purple-500/20 text-purple-300'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'}"
            on:click={toggleFake}
            title="Toggle demo projects"
          >
            🎭
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- Scoreboard (secondary stats bar) -->
  {#if $sortedProjects.length > 0}
    <div class="flex-shrink-0 bg-[#0f0f0f]/80 border-b border-white/5">
      <div class="max-w-[1800px] mx-auto px-4 py-2">
        <Scoreboard />
      </div>
    </div>
  {/if}

  <!-- Main content - fills remaining space -->
  <!-- DESIGN PRINCIPLE: No scrolling unless >4 projects or very small viewport -->
  <main class="flex-1 min-h-0 {allowScroll ? 'overflow-auto' : 'overflow-hidden'}">
    <div class="max-w-[1800px] mx-auto px-4 py-4 h-full">
      {#if $sortedProjects.length === 0}
        <!-- Empty state -->
        <div class="flex flex-col items-center justify-center h-full text-center">
          <span class="text-6xl mb-4">ꙮ</span>
          <h2 class="text-xl font-medium mb-2">No active sessions</h2>
          <p class="text-gray-500 max-w-md">
            Start a Claude Code session with the Argus hook enabled. Sessions will
            appear here automatically.
          </p>
        </div>
      {:else}
        <!-- Project grid - fills available space, cards shrink to fit -->
        <!-- In cute mode, Completed Work is a full grid cell (2x2 layout) -->
        <div
          class="grid gap-4 {gridCols} h-full"
          style="grid-auto-rows: {allowScroll ? 'minmax(200px, auto)' : '1fr'};"
        >
          {#each $sortedProjects as project (project.id)}
            <ProjectCard {project} detailed={$viewMode === 'detailed'} />
          {/each}

          <!-- Completed Work as 4th cell in cute mode (2x2 grid) -->
          {#if $cuteMode}
            <CompletedWorkInbox items={$completedWork} />
          {/if}
        </div>
      {/if}
    </div>
  </main>
</div>
