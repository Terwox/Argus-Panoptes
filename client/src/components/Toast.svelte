<script lang="ts">
  /**
   * Toast - Simple bottom-right notification system
   *
   * Matches dark theme (bg-[#0f0f0f]) with smooth animations.
   * Stacks multiple toasts vertically.
   */
  import { toasts } from '../stores/toast';
  import { fly, fade } from 'svelte/transition';

  function getToastStyles(type: 'success' | 'info' | 'warning') {
    switch (type) {
      case 'success':
        return 'bg-green-500/20 border-green-500/30 text-green-300';
      case 'info':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-300';
      case 'warning':
        return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
      default:
        return 'bg-white/10 border-white/20 text-white';
    }
  }

  function getToastIcon(type: 'success' | 'info' | 'warning') {
    switch (type) {
      case 'success':
        return '✓';
      case 'info':
        return 'ⓘ';
      case 'warning':
        return '⚠';
      default:
        return '';
    }
  }
</script>

<!-- Toast container - bottom-right, stacked vertically -->
<div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
  {#each $toasts as toast (toast.id)}
    <div
      class="pointer-events-auto rounded-lg border backdrop-blur-sm shadow-lg px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-md {getToastStyles(toast.type)}"
      transition:fly={{ y: 50, duration: 300 }}
    >
      <!-- Icon -->
      <span class="text-lg flex-shrink-0">
        {getToastIcon(toast.type)}
      </span>

      <!-- Message -->
      <p class="text-sm flex-1 leading-snug">
        {toast.message}
      </p>

      <!-- Dismiss button -->
      <button
        class="flex-shrink-0 text-white/50 hover:text-white transition-colors ml-2"
        on:click={() => toasts.dismissToast(toast.id)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  {/each}
</div>

<style>
  /* Ensure smooth transitions */
  div {
    will-change: transform, opacity;
  }
</style>
