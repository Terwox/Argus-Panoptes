<script lang="ts">
  export let stats: { total: number; blocked: number; working: number; idle: number };

  // Track previous state for pulse animation trigger
  let prevState: 'clear' | 'attention' | 'critical' = 'clear';
  let shouldPulse = false;

  // Determine current health state
  $: state = stats.total === 0
    ? 'clear' // No projects = all clear
    : stats.blocked === stats.total
    ? 'critical' // All projects blocked = critical
    : stats.blocked > 0
    ? 'attention' // Some blocked = attention needed
    : 'clear'; // None blocked = all clear

  // Trigger single pulse animation when transitioning to critical
  $: if (state === 'critical' && prevState !== 'critical') {
    shouldPulse = true;
    prevState = state;
    // Reset pulse flag after animation completes
    setTimeout(() => {
      shouldPulse = false;
    }, 600);
  } else if (state !== prevState) {
    prevState = state;
    shouldPulse = false;
  }

  // Color for dot based on state
  $: dotColor = state === 'clear'
    ? '#22c55e' // green-500
    : state === 'attention'
    ? '#f59e0b' // amber-500
    : '#ef4444'; // red-500

  // Label text
  $: label = state === 'clear'
    ? 'All clear'
    : state === 'attention'
    ? `${stats.blocked} need${stats.blocked === 1 ? 's' : ''} input`
    : 'All blocked';

  // Tooltip breakdown text
  $: tooltipText = stats.total === 0
    ? 'No active sessions'
    : [
        stats.blocked > 0 ? `${stats.blocked} blocked` : null,
        stats.working > 0 ? `${stats.working} working` : null,
        stats.idle > 0 ? `${stats.idle} idle` : null,
      ]
        .filter(Boolean)
        .join(', ');

  let showTooltip = false;
</script>

<div
  class="relative flex items-center gap-2 text-sm"
  on:mouseenter={() => (showTooltip = true)}
  on:mouseleave={() => (showTooltip = false)}
>
  <!-- Colored dot indicator -->
  <div class="relative">
    <div
      class="w-2 h-2 rounded-full transition-colors duration-300"
      style="background-color: {dotColor}"
      class:pulse={shouldPulse}
    />
  </div>

  <!-- Label text -->
  <span
    class="font-medium transition-colors duration-300"
    class:text-green-400={state === 'clear'}
    class:text-amber-400={state === 'attention'}
    class:text-red-400={state === 'critical'}
  >
    {label}
  </span>

  <!-- Hover tooltip -->
  {#if showTooltip && stats.total > 0}
    <div
      class="absolute top-full left-0 mt-2 px-3 py-1.5 rounded-lg bg-black/90 border border-white/10 text-xs text-gray-300 whitespace-nowrap z-50 pointer-events-none"
    >
      {tooltipText}
    </div>
  {/if}
</div>

<style>
  /* Single pulse animation on transition to critical state */
  @keyframes pulse-once {
    0% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
  }

  .pulse {
    animation: pulse-once 0.6s ease-out;
  }
</style>
