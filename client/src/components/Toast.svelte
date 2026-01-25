<script lang="ts">
  /**
   * Toast - Simple bottom-right notification system
   *
   * Matches dark theme (bg-[#0f0f0f]) with smooth animations.
   * Stacks multiple toasts vertically.
   */
  import { toasts } from '../stores/toast';
  import { fly } from 'svelte/transition';

  function getToastStyles(type: 'success' | 'info' | 'warning') {
    switch (type) {
      case 'success':
        return 'bg-green-500/15 border-green-500/30';
      case 'info':
        return 'bg-blue-500/15 border-blue-500/30';
      case 'warning':
        return 'bg-amber-500/15 border-amber-500/30';
      default:
        return 'bg-white/10 border-white/20';
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
      class="pointer-events-auto rounded-lg border backdrop-blur-sm shadow-lg px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-md {getToastStyles(toast.type)} hover:bg-opacity-25 transition-all cursor-pointer"
      transition:fly={{ y: 20, duration: 300 }}
      on:click={() => toasts.dismissToast(toast.id)}
      on:keydown={(e) => e.key === 'Enter' && toasts.dismissToast(toast.id)}
      role="button"
      tabindex="0"
      aria-live="polite"
    >
      <!-- Icon -->
      <span class="text-lg flex-shrink-0 text-green-400">
        {getToastIcon(toast.type)}
      </span>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        {#if toast.projectName}
          <div class="text-xs font-semibold text-green-400 mb-1">
            {toast.projectName}
          </div>
        {/if}
        <p class="text-sm text-gray-200 leading-snug">
          {toast.message}
        </p>
      </div>

      <!-- Dismiss button -->
      <button
        class="flex-shrink-0 text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
        on:click|stopPropagation={() => toasts.dismissToast(toast.id)}
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
