<script lang="ts">
  import type { AgentStatus } from '../../../shared/types';

  export let status: AgentStatus;
  export let isTired: boolean = false;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // Animation classes based on status
  $: animationClass = status === 'working'
    ? 'animate-bounce-slow'
    : status === 'blocked'
      ? 'animate-wiggle'
      : '';

  // Bot colors
  $: bodyColor = status === 'blocked'
    ? '#f59e0b' // amber
    : status === 'working'
      ? '#3b82f6' // blue
      : '#22c55e'; // green for complete

  $: eyeColor = isTired ? '#999' : '#fff';
</script>

<div class="inline-flex items-center justify-center {sizeClasses[size]} {animationClass}">
  <svg viewBox="0 0 100 100" class="w-full h-full">
    <!-- Body -->
    <rect x="20" y="30" width="60" height="50" rx="10" fill={bodyColor} class="transition-colors duration-300" />

    <!-- Antenna -->
    <line x1="50" y1="30" x2="50" y2="15" stroke={bodyColor} stroke-width="4" stroke-linecap="round" />
    <circle cx="50" cy="12" r="5" fill={bodyColor} class={status === 'working' ? 'animate-pulse' : ''} />

    <!-- Eyes -->
    {#if isTired}
      <!-- Tired eyes (droopy) -->
      <line x1="32" y1="50" x2="42" y2="52" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
      <line x1="58" y1="52" x2="68" y2="50" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
    {:else if status === 'blocked'}
      <!-- Wide open worried eyes -->
      <circle cx="37" cy="50" r="8" fill={eyeColor} />
      <circle cx="63" cy="50" r="8" fill={eyeColor} />
      <circle cx="37" cy="50" r="4" fill="#333" />
      <circle cx="63" cy="50" r="4" fill="#333" />
    {:else if status === 'complete'}
      <!-- Happy closed eyes -->
      <path d="M 32 50 Q 37 45 42 50" stroke={eyeColor} stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 58 50 Q 63 45 68 50" stroke={eyeColor} stroke-width="3" fill="none" stroke-linecap="round" />
    {:else}
      <!-- Normal focused eyes -->
      <circle cx="37" cy="50" r="6" fill={eyeColor} />
      <circle cx="63" cy="50" r="6" fill={eyeColor} />
      <circle cx="38" cy="51" r="3" fill="#333" />
      <circle cx="64" cy="51" r="3" fill="#333" />
    {/if}

    <!-- Mouth -->
    {#if status === 'blocked'}
      <!-- Worried open mouth -->
      <ellipse cx="50" cy="68" rx="8" ry="6" fill="#333" />
    {:else if status === 'complete'}
      <!-- Big smile -->
      <path d="M 35 65 Q 50 78 65 65" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
    {:else if isTired}
      <!-- Small neutral mouth -->
      <line x1="42" y1="68" x2="58" y2="68" stroke="#333" stroke-width="3" stroke-linecap="round" />
    {:else}
      <!-- Determined smile -->
      <path d="M 40 65 Q 50 72 60 65" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
    {/if}

    <!-- Arms (for working/blocked states) -->
    {#if status === 'working'}
      <!-- Typing arms -->
      <rect x="10" y="55" width="12" height="6" rx="3" fill={bodyColor} class="animate-type-left" />
      <rect x="78" y="55" width="12" height="6" rx="3" fill={bodyColor} class="animate-type-right" />
    {:else if status === 'blocked'}
      <!-- Raised arms -->
      <rect x="5" y="40" width="12" height="6" rx="3" fill={bodyColor} transform="rotate(-30 11 43)" />
      <rect x="83" y="40" width="12" height="6" rx="3" fill={bodyColor} transform="rotate(30 89 43)" />
    {/if}

    <!-- Legs -->
    <rect x="30" y="78" width="10" height="12" rx="3" fill={bodyColor} />
    <rect x="60" y="78" width="10" height="12" rx="3" fill={bodyColor} />
  </svg>
</div>

<style>
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-3deg); }
    75% { transform: rotate(3deg); }
  }

  @keyframes type-left {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(2px); }
  }

  @keyframes type-right {
    0%, 100% { transform: translateY(2px); }
    50% { transform: translateY(0); }
  }

  .animate-bounce-slow {
    animation: bounce-slow 1.5s ease-in-out infinite;
  }

  .animate-wiggle {
    animation: wiggle 0.5s ease-in-out infinite;
  }

  :global(.animate-type-left) {
    animation: type-left 0.3s ease-in-out infinite;
  }

  :global(.animate-type-right) {
    animation: type-right 0.3s ease-in-out infinite;
  }
</style>
