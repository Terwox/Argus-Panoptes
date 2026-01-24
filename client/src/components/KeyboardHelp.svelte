<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }

  $: if (show && typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown);
  } else if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown);
  }

  const shortcuts = [
    { key: '1-9', description: 'Select project by number' },
    { key: 'Tab', description: 'Cycle through blocked projects' },
    { key: 'Enter', description: 'Open selected project in VS Code' },
    { key: 'Esc', description: 'Deselect / close help' },
    { key: '?', description: 'Show this help' },
  ];
</script>

{#if show}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
    on:click={handleBackdropClick}
    role="presentation"
  >
    <!-- Help Card -->
    <div
      class="bg-[#1a1a1a] border-2 border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      role="dialog"
      aria-labelledby="keyboard-help-title"
    >
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <!-- Keyboard icon -->
        <svg
          class="w-6 h-6 text-white/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="2" y="6" width="20" height="12" rx="2" stroke-width="2" />
          <line x1="6" y1="10" x2="6" y2="10" stroke-width="2" stroke-linecap="round" />
          <line x1="10" y1="10" x2="10" y2="10" stroke-width="2" stroke-linecap="round" />
          <line x1="14" y1="10" x2="14" y2="10" stroke-width="2" stroke-linecap="round" />
          <line x1="18" y1="10" x2="18" y2="10" stroke-width="2" stroke-linecap="round" />
          <line x1="8" y1="14" x2="16" y2="14" stroke-width="2" stroke-linecap="round" />
        </svg>
        <h2 id="keyboard-help-title" class="text-xl font-semibold text-white">
          Keyboard Shortcuts
        </h2>
      </div>

      <!-- Shortcuts list -->
      <div class="space-y-3">
        {#each shortcuts as { key, description }}
          <div class="flex items-center gap-4">
            <!-- Key badge -->
            <kbd
              class="inline-flex items-center justify-center min-w-[3rem] px-3 py-1.5
                     text-sm font-mono font-medium text-white/90
                     bg-white/10 border border-white/20 rounded-lg shadow-sm"
            >
              {key}
            </kbd>
            <!-- Description -->
            <span class="text-gray-300 text-sm flex-1">{description}</span>
          </div>
        {/each}
      </div>

      <!-- Footer hint -->
      <div class="mt-8 pt-4 border-t border-white/10 text-center">
        <p class="text-xs text-gray-500">
          Press <kbd class="px-2 py-0.5 bg-white/10 rounded text-gray-400">Esc</kbd> or click
          outside to close
        </p>
      </div>
    </div>
  </div>
{/if}
