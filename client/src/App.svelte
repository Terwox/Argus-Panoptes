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
    selectedProject,
    focusedProject,
    layoutMode,
  } from './stores/state';
  import ProjectCard from './components/ProjectCard.svelte';
  import ViewToggle from './components/ViewToggle.svelte';
  import Scoreboard from './components/Scoreboard.svelte';
  import HealthIndicator from './components/HealthIndicator.svelte';
  import Toast from './components/Toast.svelte';
  import KeyboardHelp from './components/KeyboardHelp.svelte';
  import Settings from './components/Settings.svelte';
  import { toasts } from './stores/toast';
  import type { CompletedWorkItem } from '../../shared/types';

  let showHelp = false;
  let showSettings = false;

  // Track which completed items we've shown toasts for
  let shownCompletionToasts = new Set<string>();

  // Helper to clean agent name
  function cleanAgentName(name: string): string {
    return name.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '');
  }

  // Watch for new completed work items and emit toasts
  $: {
    $completedWork.forEach((item: CompletedWorkItem) => {
      if (!shownCompletionToasts.has(item.id)) {
        shownCompletionToasts.add(item.id);
        // Only emit toast for items added after initial load
        if (shownCompletionToasts.size > 1) {
          const task = item.task.length > 60 ? item.task.slice(0, 60) + '...' : item.task;
          toasts.addCompletion(item.projectName, cleanAgentName(item.agentName), task);
        }
      }
    });
  }

  // Auto-detect compact mode threshold
  const COMPACT_THRESHOLD = 600;

  function updateLayoutMode() {
    if (window.innerWidth < COMPACT_THRESHOLD) {
      layoutMode.set('compact');
    }
    // Don't auto-switch back to grid - let user manually toggle if they want
  }

  onMount(() => {
    connect();

    // Auto-detect compact mode on load
    updateLayoutMode();

    // Listen for window resize
    window.addEventListener('resize', updateLayoutMode);
  });

  onDestroy(() => {
    disconnect();
    window.removeEventListener('resize', updateLayoutMode);
  });

  function toggleCute() {
    cuteMode.update((v) => !v);
  }

  function toggleFake() {
    fakeMode.update((v) => !v);
  }

  function handleKeydown(e: KeyboardEvent) {
    // Skip shortcuts if user is typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Handle number keys 1-9 for project selection
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < $sortedProjects.length) {
        selectedProject.set($sortedProjects[index].id);
      }
      return;
    }

    // Handle Tab for cycling through blocked projects
    if (e.key === 'Tab') {
      e.preventDefault();
      const blockedProjects = $sortedProjects.filter(p => p.status === 'blocked');
      if (blockedProjects.length === 0) return;

      const currentIndex = $selectedProject
        ? blockedProjects.findIndex(p => p.id === $selectedProject)
        : -1;

      const nextIndex = (currentIndex + 1) % blockedProjects.length;
      selectedProject.set(blockedProjects[nextIndex].id);
      return;
    }

    // Handle Enter to open selected project in VS Code
    if (e.key === 'Enter' && $selectedProject) {
      const project = $sortedProjects.find(p => p.id === $selectedProject);
      if (project && !project.id.startsWith('fake-')) {
        window.location.href = `vscode://file/${project.path}`;
      }
      return;
    }

    // Handle Escape to deselect / close help / close settings
    if (e.key === 'Escape') {
      if (showSettings) {
        showSettings = false;
      } else if (showHelp) {
        showHelp = false;
      } else {
        selectedProject.set(null);
      }
      return;
    }

    // Handle ? to show help
    if (e.key === '?') {
      showHelp = !showHelp;
      return;
    }

    // Handle N for test notification
    if (e.key === 'n' || e.key === 'N') {
      sendTestNotification();
      return;
    }
  }

  async function sendTestNotification() {
    if (!('Notification' in window)) {
      alert('Notifications not supported in this browser');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Enable them in browser settings.');
      return;
    }

    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result !== 'granted') {
        alert('Notification permission denied');
        return;
      }
    }

    new Notification('Argus Panoptes', {
      body: 'Test notification! This is what you\'ll see when a project needs input.',
      icon: '/favicon.ico',
      tag: 'test-notification',
    });
  }

  // Calculate grid layout based on project count, cute mode, and layout mode
  // In compact mode: vertical stack
  // Single project: always full width
  $: gridCols = $layoutMode === 'compact'
    ? 'grid-cols-1'
    : $sortedProjects.length === 1
    ? 'grid-cols-1' // Single project fills full width
    : $cuteMode && $viewMode === 'detailed'
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  // Total cells = just projects (CompletedWork now shows as toasts)
  $: totalCells = $sortedProjects.length;

  // DESIGN PRINCIPLE: No scrolling unless >4 cells
  // Cards should shrink to fit viewport, not overflow
  $: allowScroll = totalCells > 4;

  // Calculate agent counts per project for weighted sizing
  $: agentCounts = $sortedProjects.map(p => Object.keys(p.agents || {}).length);
  $: maxAgents = Math.max(...agentCounts, 1);

  // Projects with lots of agents get more space (weighted row sizes)
  // "Wisely" = projects with 2x the avg agents get 1.5x space, etc.
  $: rowWeights = agentCounts.map(count => {
    if (maxAgents <= 2) return 1; // All equal if everyone has few agents
    const weight = 0.7 + (count / maxAgents) * 0.6; // Range: 0.7 to 1.3
    return Math.round(weight * 10) / 10;
  });

  // Build grid-template-rows for weighted sizing
  $: gridRowTemplate = allowScroll
    ? 'minmax(200px, auto)'
    : rowWeights.length <= 2
      ? '1fr'
      : rowWeights.slice(0, Math.ceil(totalCells / 2)).map(w => `${w}fr`).join(' ');
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
  <!-- Header -->
  <header class="flex-shrink-0 bg-[var(--bg-primary)] backdrop-blur border-b border-[var(--border-default)]">
    <div class="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-2xl">ꙮ</span>
        <h1 class="text-xl font-semibold tracking-tight">Argus Panoptes</h1>
        <span
          class="text-xs px-2 py-0.5 rounded-full {$connected
            ? 'bg-green-500/20 text-green-400'
            : 'bg-amber-500/10 text-amber-400/70'}"
        >
          {$connected ? 'Connected' : 'Disconnected'}
        </span>
        {#if $completedWork.length > 0}
          <span
            class="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20"
            title="Tasks completed this session"
          >
            {$completedWork.length} completed
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-4">
        <!-- Aggregate Health Indicator -->
        <HealthIndicator stats={$stats} />

        <!-- View Toggle -->
        <ViewToggle />

        <!-- Cute Mode Toggle -->
        <button
          class="px-2 py-1 text-sm rounded-lg transition-colors {$cuteMode
            ? 'bg-pink-500/20 text-pink-300'
            : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-hover)]'}"
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
              : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-hover)]'}"
            on:click={toggleFake}
            title="Toggle demo projects"
          >
            🎭
          </button>
        {/if}

        <!-- Settings Button -->
        <button
          class="px-2 py-1 text-sm rounded-lg transition-colors {showSettings
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted-hover)]'}"
          on:click={() => showSettings = !showSettings}
          title="Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  </header>

  <!-- Scoreboard (secondary stats bar) -->
  {#if $sortedProjects.length > 0}
    <div class="flex-shrink-0 bg-[var(--bg-primary)] border-b border-[var(--border-subtle)]">
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
          <p class="text-[var(--text-muted)] max-w-md">
            Start a Claude Code session with the Argus hook enabled. Sessions will
            appear here automatically.
          </p>
        </div>
      {:else}
        <!-- Project grid - fills available space, cards shrink to fit -->
        <!-- Projects with more agents get more space (weighted rows) -->
        <div
          class="grid gap-4 {gridCols} h-full"
          style="grid-template-rows: {gridRowTemplate};"
        >
          {#each $sortedProjects as project (project.id)}
            <ProjectCard
              {project}
              detailed={$viewMode === 'detailed'}
              selected={project.id === $selectedProject}
              dimmed={$focusedProject !== null && project.id !== $focusedProject}
            />
          {/each}
        </div>
      {/if}
    </div>
  </main>

  <!-- Toast notifications (global) -->
  <Toast />

  <!-- Keyboard Help Overlay -->
  <KeyboardHelp show={showHelp} on:close={() => showHelp = false} />

  <!-- Settings Panel -->
  <Settings bind:open={showSettings} />
</div>
