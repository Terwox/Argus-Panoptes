<script lang="ts">
  import { onMount } from 'svelte';
  import type { AgentStatus } from '../../../shared/types';

  export let status: AgentStatus;
  export let isTired: boolean = false;
  export let isSleeping: boolean = false; // Show sleeping zzz animation
  export let size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  export let role: string = 'main'; // Agent role/type for the held object
  export let conductorIndex: number = 0; // 0 = primary conductor, 1+ = secondary conductors
  export let conjuring: boolean = false; // Is this bot currently being conjured?
  export let conjureAnimation: 'classic' | 'teleport' | 'factory' | 'inflate' | 'pixel' | 'spring' | 'assembly' = 'classic';
  export let conjureProgress: number = 0; // 0-1 progress of conjuration
  export let bobble: boolean = false; // Trigger bobble animation (squash/stretch)

  // Idle animations for conductor
  type IdleAnimation =
    | 'sleeping'
    | 'reading'
    | 'stretching'
    | 'coffee'
    | 'stargazing'
    | 'polishing'
    | 'doodling'
    | 'pocket-watch'
    | 'humming'
    | 'meditating'
    | 'pet'
    | 'telescope'
    | 'bed'
    | 'doll'
    | 'imaginary-friend'
    | 'encouraging';

  let idleAnimation: IdleAnimation | null = null;

  // Select random idle animation when entering idle state
  function selectRandomIdleAnimation(): IdleAnimation {
    const animations: IdleAnimation[] = [
      'sleeping', 'reading', 'stretching', 'coffee', 'stargazing',
      'polishing', 'doodling', 'pocket-watch', 'humming', 'meditating',
      'pet', 'telescope', 'bed', 'doll', 'imaginary-friend', 'encouraging'
    ];
    return animations[Math.floor(Math.random() * animations.length)];
  }

  // Watch for status changes to idle
  $: {
    if (status === 'idle' && roleCategory === 'conductor' && !conjuring) {
      if (idleAnimation === null) {
        idleAnimation = selectRandomIdleAnimation();
      }
    } else if (status !== 'idle') {
      idleAnimation = null;
    }
  }

  // For idle eyes
  $: isIdle = status === 'idle';
  $: idleEyesClosed = isIdle && (idleAnimation === 'sleeping' || idleAnimation === 'meditating' || idleAnimation === 'bed');

  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // Map role names to simplified categories for objects
  function getRoleCategory(r: string): string {
    const lower = r.toLowerCase();
    if (lower === 'main' || lower.includes('conductor')) return 'conductor';
    if (lower.includes('background')) return 'background';  // Background bash tasks
    if (lower.includes('architect')) return 'architect';
    if (lower.includes('executor')) return 'executor';
    if (lower.includes('explore')) return 'explorer';
    if (lower.includes('designer')) return 'designer';
    if (lower.includes('writer')) return 'writer';
    if (lower.includes('research')) return 'researcher';
    if (lower.includes('planner') || lower.includes('plan')) return 'planner';
    if (lower.includes('critic') || lower.includes('review')) return 'critic';
    if (lower.includes('analyst')) return 'analyst';
    if (lower.includes('qa') || lower.includes('test')) return 'tester';
    if (lower.includes('vision')) return 'vision';
    if (lower.includes('scientist')) return 'scientist';
    if (lower.includes('security')) return 'security';
    if (lower.includes('build') || lower.includes('fixer')) return 'builder';
    return 'worker'; // default
  }

  $: roleCategory = getRoleCategory(role);

  // Pants colors based on role - chosen to contrast with ALL body states
  // Body colors: blocked=#f59e0b (amber), working=conductor #3b82f6 (blue) / others #0d9488 (teal), complete=#22c55e (green)
  // DESIGN: Only conductor is blue - makes main bot easy to identify at a glance
  // Avoid yellows (clash with amber), pure blues (clash with conductor), pure greens (clash with complete)
  const pantsColors: Record<string, string> = {
    conductor: '#1e1b4b',   // deep indigo - contrasts all states ~4:1+
    background: '#065f46',  // emerald-800 - for background bash tasks
    architect: '#312e81',   // indigo - matches compass theme
    executor: '#18181b',    // zinc-900 - dark neutral
    explorer: '#581c87',    // purple-800 - deep purple
    designer: '#831843',    // pink-800 - deep magenta
    writer: '#78350f',      // amber-800 - brown (not yellow)
    researcher: '#1e3a8a',  // blue-900 - navy
    planner: '#27272a',     // zinc-800 - charcoal
    critic: '#7f1d1d',      // red-900 - deep red
    analyst: '#1e293b',     // slate-800 - dark slate
    tester: '#14532d',      // green-900 - forest
    vision: '#0c4a6e',      // sky-900 - deep teal
    scientist: '#4c1d95',   // violet-800 - deep violet
    security: '#14532d',    // green-900 - forest
    builder: '#44403c',     // stone-700 - dark stone
    worker: '#27272a',      // zinc-800 - default dark
  };

  $: pantsColor = pantsColors[roleCategory] || pantsColors.worker;

  // Animation classes based on status
  $: animationClass = status === 'working'
    ? 'animate-bounce-slow'
    : status === 'blocked'
      ? 'animate-wiggle'
      : status === 'rate_limited'
        ? '' // Calm, no animation - just waiting
        : status === 'server_running'
          ? 'animate-pulse-slow' // Gentle pulse - server is alive
          : '';

  // Body colors by role when working - each role has distinct identity
  // DESIGN: Only conductor gets blue body - makes main bot easy to identify at a glance
  // Other roles get colors that match their tool/personality
  // Secondary conductors get a slightly different blue (>2x JND from primary)
  const primaryConductorBlue = '#3b82f6';   // blue-500 - primary conductor
  const secondaryConductorBlue = '#2563eb'; // blue-600 - secondary conductors (noticeable but still blue)

  const bodyColors: Record<string, string> = {
    conductor: primaryConductorBlue,   // blue - special, easy to spot (will be overridden for secondary)
    background: '#10b981',  // emerald - terminal green
    architect: '#6366f1',   // indigo - matches compass
    executor: '#64748b',    // slate - industrial workhorse
    explorer: '#8b5cf6',    // purple - matches magnifying glass
    designer: '#ec4899',    // pink - matches paintbrush
    writer: '#f97316',      // orange - matches pencil
    researcher: '#0ea5e9',  // sky - matches book
    planner: '#6b7280',     // gray - clipboard neutral
    critic: '#ef4444',      // red - matches red pen
    analyst: '#06b6d4',     // cyan - matches chart
    tester: '#84cc16',      // lime - matches bug net
    vision: '#0284c7',      // sky-600 - matches camera
    scientist: '#7c3aed',   // violet - matches flask
    security: '#10b981',    // emerald - matches shield
    builder: '#78716c',     // stone - matches hammer
    worker: '#0d9488',      // teal - default
  };

  // Bot colors - secondary conductors get a different blue shade
  $: workingColor = roleCategory === 'conductor' && conductorIndex > 0
    ? secondaryConductorBlue
    : bodyColors[roleCategory] || bodyColors.worker;

  $: bodyColor = status === 'blocked'
    ? '#f59e0b' // amber - all bots
    : status === 'rate_limited'
      ? '#0ea5e9' // sky blue - calm, waiting for quota
      : status === 'server_running'
        ? '#10b981' // emerald - server is running
        : status === 'working'
          ? workingColor
          : status === 'idle'
            ? '#6b7280' // gray for idle - calm, neutral
          : '#22c55e'; // green for complete - all bots

  $: eyeColor = isTired ? '#999' : '#fff';
</script>

<div class="inline-flex items-center justify-center {sizeClasses[size]} {animationClass} {bobble ? 'animate-bobble' : ''}">
  <svg viewBox="0 0 100 100" class="w-full h-full">
    <!-- Body -->
    <rect
      x="20" y="30" width="60" height="50" rx="10"
      fill={bodyColor}
      class="bot-part bot-body transition-colors duration-300 {conjuring ? `conjure-${conjureAnimation}` : ''}"
      style="--part-delay: 0s;"
    />

    <!-- Antenna -->
    <g class="bot-part bot-antenna {conjuring ? `conjure-${conjureAnimation}` : ''}" style="--part-delay: 0.3s;">
      <line x1="50" y1="30" x2="50" y2="15" stroke={bodyColor} stroke-width="4" stroke-linecap="round" />
      <!-- Glowing antenna light - outer glow -->
      <circle cx="50" cy="12" r="8" fill={bodyColor} class="animate-glow" />
      <!-- Inner solid light -->
      <circle cx="50" cy="12" r="5" fill={bodyColor} class={status === 'working' ? 'animate-pulse' : ''} />
      <!-- Highlight -->
      <circle cx="48" cy="10" r="2" fill="white" opacity="0.7" />
    </g>

    <!-- Eyes -->
    <g class="bot-part bot-eyes {conjuring ? `conjure-${conjureAnimation}` : ''}" style="--part-delay: 0.4s;">
      {#if isTired}
        <!-- Tired eyes (droopy) -->
        <line x1="32" y1="50" x2="42" y2="52" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
        <line x1="58" y1="52" x2="68" y2="50" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
      {:else if idleEyesClosed}
        <!-- Closed/sleeping eyes - peaceful -->
        <line x1="32" y1="50" x2="42" y2="50" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
        <line x1="58" y1="50" x2="68" y2="50" stroke={eyeColor} stroke-width="3" stroke-linecap="round" />
      {:else if status === 'blocked'}
        <!-- Wide open worried eyes -->
        <circle cx="37" cy="50" r="8" fill={eyeColor} />
        <circle cx="63" cy="50" r="8" fill={eyeColor} />
        <circle cx="37" cy="50" r="4" fill="#333" />
        <circle cx="63" cy="50" r="4" fill="#333" />
      {:else if status === 'rate_limited'}
        <!-- Calm/content eyes - waiting patiently (like coffee break) -->
        <ellipse cx="37" cy="50" rx="5" ry="4" fill={eyeColor} />
        <ellipse cx="63" cy="50" rx="5" ry="4" fill={eyeColor} />
        <circle cx="38" cy="51" r="2" fill="#333" />
        <circle cx="64" cy="51" r="2" fill="#333" />
      {:else if status === 'server_running'}
        <!-- Focused eyes with slight glow - server is humming -->
        <circle cx="37" cy="50" r="6" fill={eyeColor} />
        <circle cx="63" cy="50" r="6" fill={eyeColor} />
        <circle cx="38" cy="50" r="3" fill="#10b981" />
        <circle cx="64" cy="50" r="3" fill="#10b981" />
      {:else if status === 'complete'}
        <!-- Happy closed eyes -->
        <path d="M 32 50 Q 37 45 42 50" stroke={eyeColor} stroke-width="3" fill="none" stroke-linecap="round" />
        <path d="M 58 50 Q 63 45 68 50" stroke={eyeColor} stroke-width="3" fill="none" stroke-linecap="round" />
      {:else if isIdle}
        <!-- Relaxed half-closed eyes for idle state -->
        <ellipse cx="37" cy="50" rx="6" ry="4" fill={eyeColor} />
        <ellipse cx="63" cy="50" rx="6" ry="4" fill={eyeColor} />
        <ellipse cx="38" cy="51" rx="3" ry="2" fill="#333" />
        <ellipse cx="64" cy="51" rx="3" ry="2" fill="#333" />
      {:else}
        <!-- Normal focused eyes -->
        <circle cx="37" cy="50" r="6" fill={eyeColor} />
        <circle cx="63" cy="50" r="6" fill={eyeColor} />
        <circle cx="38" cy="51" r="3" fill="#333" />
        <circle cx="64" cy="51" r="3" fill="#333" />
      {/if}
    </g>

    <!-- Mouth -->
    <g class="bot-part bot-mouth {conjuring ? `conjure-${conjureAnimation}` : ''}" style="--part-delay: 0.45s;">
      {#if status === 'blocked'}
        <!-- Worried open mouth -->
        <ellipse cx="50" cy="68" rx="8" ry="6" fill="#333" />
      {:else if status === 'rate_limited'}
        <!-- Content smile - taking a break -->
        <path d="M 42 66 Q 50 70 58 66" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round" />
      {:else if status === 'server_running'}
        <!-- Satisfied smile - server humming along -->
        <path d="M 40 65 Q 50 71 60 65" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round" />
      {:else if status === 'complete'}
        <!-- Big smile -->
        <path d="M 35 65 Q 50 78 65 65" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
      {:else if isTired || isIdle}
        <!-- Small neutral/content mouth -->
        <line x1="42" y1="68" x2="58" y2="68" stroke="#333" stroke-width="3" stroke-linecap="round" />
      {:else}
        <!-- Determined smile -->
        <path d="M 40 65 Q 50 72 60 65" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
      {/if}
    </g>

    <!-- Arm holding object (right side) -->
    <g class="bot-part bot-arm-right {conjuring ? `conjure-${conjureAnimation}` : ''} {status === 'working' ? 'animate-wave' : ''}" style="--part-delay: 0.2s;">
      <!-- Arm -->
      <rect x="78" y="48" width="14" height="6" rx="3" fill={bodyColor} />

      <!-- Role-specific held object -->
      <g class="bot-part bot-tool {conjuring ? `conjure-${conjureAnimation}` : ''}" style="--part-delay: 0.5s;">
      {#if roleCategory === 'conductor'}
        <!-- Baton -->
        <line x1="90" y1="42" x2="98" y2="30" stroke="#e5e5e5" stroke-width="3" stroke-linecap="round" />
        <circle cx="99" cy="28" r="3" fill="#ffd700" />
      {:else if roleCategory === 'architect'}
        <!-- Compass/protractor -->
        <path d="M 90 38 L 95 48 L 100 38 Z" fill="none" stroke="#60a5fa" stroke-width="2" />
        <line x1="95" y1="48" x2="95" y2="35" stroke="#60a5fa" stroke-width="2" />
      {:else if roleCategory === 'executor'}
        <!-- Pipe wrench (monkey wrench) - red handle, silver jaw -->
        <rect x="88" y="38" width="5" height="14" rx="1" fill="#991b1b" /> <!-- Red handle -->
        <rect x="88" y="50" width="5" height="3" rx="1" fill="#7f1d1d" /> <!-- Handle end -->
        <rect x="89" y="42" width="3" height="4" fill="#fbbf24" /> <!-- Gold knurled grip -->
        <rect x="87" y="32" width="7" height="7" rx="1" fill="#6b7280" /> <!-- Jaw body -->
        <path d="M 87 32 L 85 28 L 88 28 L 88 32 Z" fill="#9ca3af" /> <!-- Upper jaw -->
        <path d="M 94 32 L 96 30 L 94 28 L 92 32 Z" fill="#9ca3af" /> <!-- Lower jaw -->
      {:else if roleCategory === 'explorer'}
        <!-- Magnifying glass -->
        <circle cx="94" cy="36" r="6" fill="none" stroke="#a78bfa" stroke-width="2" />
        <line x1="98" y1="41" x2="102" y2="48" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" />
      {:else if roleCategory === 'designer'}
        <!-- Paintbrush -->
        <rect x="90" y="30" width="3" height="14" fill="#92400e" />
        <ellipse cx="91.5" cy="28" rx="4" ry="5" fill="#f472b6" />
      {:else if roleCategory === 'writer'}
        <!-- Pencil -->
        <rect x="89" y="32" width="4" height="14" fill="#fbbf24" />
        <polygon points="89,46 91,52 93,46" fill="#f97316" />
        <rect x="89" y="32" width="4" height="3" fill="#fde68a" />
      {:else if roleCategory === 'researcher'}
        <!-- Book -->
        <rect x="87" y="34" width="10" height="12" rx="1" fill="#3b82f6" />
        <line x1="92" y1="34" x2="92" y2="46" stroke="#1e40af" stroke-width="1" />
        <rect x="88" y="36" width="3" height="1" fill="#bfdbfe" />
        <rect x="88" y="39" width="3" height="1" fill="#bfdbfe" />
      {:else if roleCategory === 'planner'}
        <!-- Clipboard -->
        <rect x="87" y="32" width="10" height="14" rx="1" fill="#d1d5db" />
        <rect x="90" y="30" width="4" height="3" rx="1" fill="#6b7280" />
        <line x1="89" y1="37" x2="95" y2="37" stroke="#374151" stroke-width="1" />
        <line x1="89" y1="40" x2="95" y2="40" stroke="#374151" stroke-width="1" />
        <line x1="89" y1="43" x2="93" y2="43" stroke="#374151" stroke-width="1" />
      {:else if roleCategory === 'critic'}
        <!-- Red pen with checkmark -->
        <rect x="90" y="30" width="3" height="16" fill="#ef4444" />
        <polygon points="90,46 91.5,50 93,46" fill="#dc2626" />
        <path d="M 96 36 L 98 40 L 103 32" stroke="#22c55e" stroke-width="2" fill="none" />
      {:else if roleCategory === 'analyst'}
        <!-- Chart -->
        <rect x="86" y="32" width="12" height="10" fill="#1e293b" stroke="#475569" stroke-width="1" />
        <rect x="88" y="38" width="2" height="3" fill="#22c55e" />
        <rect x="91" y="35" width="2" height="6" fill="#3b82f6" />
        <rect x="94" y="36" width="2" height="5" fill="#f59e0b" />
      {:else if roleCategory === 'tester'}
        <!-- Bug net -->
        <line x1="90" y1="48" x2="95" y2="30" stroke="#92400e" stroke-width="2" />
        <ellipse cx="95" cy="28" rx="6" ry="5" fill="none" stroke="#a3e635" stroke-width="2" />
        <path d="M 91 25 Q 95 32 99 25" stroke="#a3e635" stroke-width="1" fill="none" />
      {:else if roleCategory === 'vision'}
        <!-- Camera/eye -->
        <rect x="86" y="34" width="14" height="10" rx="2" fill="#374151" />
        <circle cx="93" cy="39" r="4" fill="#1f2937" stroke="#60a5fa" stroke-width="1" />
        <circle cx="93" cy="39" r="2" fill="#3b82f6" />
      {:else if roleCategory === 'scientist'}
        <!-- Flask -->
        <path d="M 89 32 L 89 38 L 85 48 L 97 48 L 93 38 L 93 32 Z" fill="#dbeafe" stroke="#3b82f6" stroke-width="1" />
        <rect x="88" y="30" width="6" height="3" fill="#6b7280" />
        <ellipse cx="91" cy="44" rx="4" ry="2" fill="#a78bfa" opacity="0.6" />
      {:else if roleCategory === 'security'}
        <!-- Shield -->
        <path d="M 91 30 L 85 34 L 85 42 L 91 48 L 97 42 L 97 34 Z" fill="#22c55e" stroke="#166534" stroke-width="1" />
        <path d="M 91 36 L 89 39 L 91 42 L 93 39 Z" fill="#166534" />
      {:else if roleCategory === 'builder'}
        <!-- Hammer -->
        <rect x="90" y="34" width="3" height="14" fill="#92400e" />
        <rect x="86" y="30" width="10" height="6" rx="1" fill="#6b7280" />
      {:else if roleCategory === 'background'}
        <!-- Terminal/gear for background tasks -->
        <rect x="85" y="32" width="14" height="12" rx="2" fill="#1f2937" stroke="#10b981" stroke-width="1" />
        <text x="92" y="41" font-size="8" fill="#10b981" text-anchor="middle" font-family="monospace">&gt;_</text>
      {:else}
        <!-- Default: pipe wrench -->
        <rect x="88" y="38" width="5" height="14" rx="1" fill="#991b1b" />
        <rect x="89" y="42" width="3" height="4" fill="#fbbf24" />
        <rect x="87" y="32" width="7" height="7" rx="1" fill="#6b7280" />
      {/if}
      </g>
    </g>

    <!-- Left arm (no object, just supporting) -->
    <rect
      x="8" y="50" width="14" height="6" rx="3"
      fill={bodyColor}
      class="bot-part bot-arm-left {conjuring ? `conjure-${conjureAnimation}` : ''}"
      style="--part-delay: 0.2s;"
    />

    <!-- Legs (pants colored by role) -->
    <rect
      x="30" y="78" width="10" height="12" rx="3"
      fill={pantsColor}
      class="bot-part bot-leg-left {conjuring ? `conjure-${conjureAnimation}` : ''}"
      style="--part-delay: 0.1s;"
    />
    <rect
      x="60" y="78" width="10" height="12" rx="3"
      fill={pantsColor}
      class="bot-part bot-leg-right {conjuring ? `conjure-${conjureAnimation}` : ''}"
      style="--part-delay: 0.1s;"
    />
  </svg>

  <!-- Idle Animation Overlays -->
  {#if idleAnimation && roleCategory === 'conductor'}
    <div class="absolute inset-0 pointer-events-none">
      {#if idleAnimation === 'sleeping'}
        <!-- Floating Z's -->
        <div class="idle-z idle-z1">Z</div>
        <div class="idle-z idle-z2">Z</div>
        <div class="idle-z idle-z3">Z</div>
      {:else if idleAnimation === 'reading'}
        <!-- Book held in hands -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(35, 55)">
            <rect x="0" y="0" width="30" height="20" rx="2" fill="#8b4513" />
            <line x1="15" y1="0" x2="15" y2="20" stroke="#654321" stroke-width="1" />
            <rect x="2" y="3" width="11" height="1.5" fill="#f5f5dc" />
            <rect x="2" y="6" width="11" height="1.5" fill="#f5f5dc" />
            <rect x="2" y="9" width="9" height="1.5" fill="#f5f5dc" />
            <rect x="17" y="3" width="11" height="1.5" fill="#f5f5dc" />
            <rect x="17" y="6" width="10" height="1.5" fill="#f5f5dc" />
            <rect x="17" y="9" width="11" height="1.5" fill="#f5f5dc" />
          </g>
        </svg>
      {:else if idleAnimation === 'stretching'}
        <!-- Arms raised overhead - modify arm positions -->
        <svg viewBox="0 0 100 100" class="w-full h-full animate-stretch">
          <rect x="15" y="35" width="12" height="6" rx="3" fill={bodyColor} transform="rotate(-45 21 38)" />
          <rect x="73" y="35" width="12" height="6" rx="3" fill={bodyColor} transform="rotate(45 79 38)" />
        </svg>
      {:else if idleAnimation === 'coffee'}
        <!-- Coffee mug with steam -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(60, 45)">
            <ellipse cx="8" cy="10" rx="6" ry="5" fill="#8b4513" />
            <ellipse cx="8" cy="9" rx="5" ry="4" fill="#3e2723" />
            <path d="M 14 8 Q 17 8 17 11 Q 17 14 14 14" stroke="#8b4513" stroke-width="1.5" fill="none" />
            <!-- Steam -->
            <path d="M 5 4 Q 6 0 5 -2" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.6" class="animate-steam" />
            <path d="M 8 3 Q 9 -1 8 -3" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.6" class="animate-steam" style="animation-delay: 0.3s" />
            <path d="M 11 4 Q 12 0 11 -2" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.6" class="animate-steam" style="animation-delay: 0.6s" />
          </g>
        </svg>
      {:else if idleAnimation === 'stargazing'}
        <!-- Stars floating around -->
        <div class="idle-star idle-star1">✨</div>
        <div class="idle-star idle-star2">⭐</div>
        <div class="idle-star idle-star3">✨</div>
        <div class="idle-star idle-star4">⭐</div>
      {:else if idleAnimation === 'polishing'}
        <!-- Baton with sparkles - animate the tool -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g class="animate-polish">
            <circle cx="99" cy="28" r="4" fill="#ffd700" opacity="0.8" />
            <circle cx="96" cy="26" r="2" fill="#fff" opacity="0.9" />
            <circle cx="102" cy="30" r="2" fill="#fff" opacity="0.9" />
          </g>
        </svg>
      {:else if idleAnimation === 'doodling'}
        <!-- Notepad and pencil -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(55, 50)">
            <rect x="0" y="0" width="20" height="25" rx="1" fill="#fff" stroke="#333" stroke-width="0.5" />
            <line x1="2" y1="4" x2="18" y2="4" stroke="#333" stroke-width="0.5" opacity="0.5" />
            <line x1="2" y1="7" x2="15" y2="7" stroke="#333" stroke-width="0.5" opacity="0.5" />
            <line x1="2" y1="10" x2="17" y2="10" stroke="#333" stroke-width="0.5" opacity="0.5" />
            <!-- Pencil -->
            <rect x="15" y="15" width="2" height="12" fill="#fbbf24" transform="rotate(30 16 21)" />
            <polygon points="15,27 16,30 17,27" fill="#f97316" transform="rotate(30 16 21)" />
          </g>
        </svg>
      {:else if idleAnimation === 'pocket-watch'}
        <!-- Pocket watch -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(60, 48)">
            <circle cx="8" cy="10" r="7" fill="#c0c0c0" stroke="#808080" stroke-width="0.8" />
            <circle cx="8" cy="10" r="5" fill="#f5f5f5" />
            <line x1="8" y1="10" x2="8" y2="7" stroke="#333" stroke-width="0.8" />
            <line x1="8" y1="10" x2="10" y2="10" stroke="#333" stroke-width="0.8" />
            <line x1="8" y1="3" x2="8" y2="0" stroke="#c0c0c0" stroke-width="1" />
          </g>
        </svg>
      {:else if idleAnimation === 'humming'}
        <!-- Musical notes floating -->
        <div class="idle-note idle-note1">♪</div>
        <div class="idle-note idle-note2">♫</div>
        <div class="idle-note idle-note3">♪</div>
      {:else if idleAnimation === 'meditating'}
        <!-- Om symbol -->
        <div class="idle-om">ॐ</div>
      {:else if idleAnimation === 'pet'}
        <!-- Tiny creature (cat) -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(55, 75)" class="animate-pet-bounce">
            <!-- Cat body -->
            <ellipse cx="8" cy="2" rx="6" ry="4" fill="#ff9800" />
            <!-- Cat head -->
            <circle cx="8" cy="-2" r="3" fill="#ff9800" />
            <!-- Ears -->
            <polygon points="6,-4 5,-6 7,-5" fill="#ff9800" />
            <polygon points="10,-4 11,-6 9,-5" fill="#ff9800" />
            <!-- Eyes -->
            <circle cx="7" cy="-2" r="0.5" fill="#333" />
            <circle cx="9" cy="-2" r="0.5" fill="#333" />
            <!-- Tail -->
            <path d="M 14 2 Q 18 0 20 2" stroke="#ff9800" stroke-width="1.5" fill="none" stroke-linecap="round" />
          </g>
        </svg>
      {:else if idleAnimation === 'telescope'}
        <!-- Telescope -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(65, 40)">
            <rect x="0" y="5" width="20" height="4" fill="#4a5568" transform="rotate(-20 10 7)" />
            <circle cx="2" cy="6" r="3" fill="#2d3748" transform="rotate(-20 10 7)" />
            <circle cx="18" cy="8" r="2" fill="#2d3748" transform="rotate(-20 10 7)" />
            <!-- Stars visible through telescope -->
            <circle cx="22" cy="4" r="0.5" fill="#ffd700" class="animate-twinkle" />
            <circle cx="24" cy="2" r="0.5" fill="#ffd700" class="animate-twinkle" style="animation-delay: 0.3s" />
            <circle cx="26" cy="5" r="0.5" fill="#ffd700" class="animate-twinkle" style="animation-delay: 0.6s" />
          </g>
        </svg>
      {:else if idleAnimation === 'bed'}
        <!-- Laying in bed -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(25, 65)">
            <!-- Bed frame -->
            <rect x="0" y="8" width="50" height="3" fill="#8b4513" />
            <!-- Mattress -->
            <rect x="2" y="2" width="46" height="6" rx="1" fill="#f5f5dc" />
            <!-- Pillow -->
            <ellipse cx="40" cy="3" rx="8" ry="3" fill="#fff" />
            <!-- Blanket -->
            <rect x="5" y="4" width="30" height="5" rx="1" fill="#6b7280" class="animate-breathe" />
          </g>
        </svg>
      {:else if idleAnimation === 'doll'}
        <!-- Playing with tiny robot doll -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(55, 55)" class="animate-doll-play">
            <!-- Tiny robot doll -->
            <rect x="0" y="0" width="8" height="6" rx="1" fill="#3b82f6" />
            <circle cx="4" cy="2" r="1" fill="#fff" />
            <circle cx="6" cy="2" r="1" fill="#fff" />
            <rect x="1" y="6" width="2" height="3" fill="#1e1b4b" />
            <rect x="5" y="6" width="2" height="3" fill="#1e1b4b" />
            <circle cx="4" cy="-2" r="1" fill="#3b82f6" />
            <line x1="4" y1="-2" x2="4" y2="0" stroke="#3b82f6" stroke-width="0.5" />
          </g>
        </svg>
      {:else if idleAnimation === 'imaginary-friend'}
        <!-- Conjuring imaginary friend with emojis -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(65, 45)">
            <!-- Ghost friend -->
            <path d="M 5 5 Q 0 5 0 10 L 0 20 L 2 18 L 4 20 L 6 18 L 8 20 L 10 18 L 10 10 Q 10 5 5 5 Z" fill="rgba(147, 197, 253, 0.4)" class="animate-ghost-float" />
            <circle cx="3.5" cy="9" r="1" fill="#333" opacity="0.5" />
            <circle cx="6.5" cy="9" r="1" fill="#333" opacity="0.5" />
          </g>
          <!-- Emoji speech from bot -->
          <div class="idle-emoji idle-emoji1">👋</div>
          <!-- Emoji reply from ghost -->
          <div class="idle-emoji idle-emoji2">✨</div>
        </svg>
      {:else if idleAnimation === 'encouraging'}
        <!-- Saying good job to another bot -->
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <g transform="translate(65, 58)">
            <!-- Tiny completed bot -->
            <rect x="0" y="0" width="8" height="6" rx="1" fill="#22c55e" />
            <circle cx="2.5" cy="2" r="0.8" fill="#fff" />
            <circle cx="5.5" cy="2" r="0.8" fill="#fff" />
            <!-- Happy mouth -->
            <path d="M 2 4 Q 4 5.5 6 4" stroke="#333" stroke-width="0.5" fill="none" />
            <rect x="1" y="6" width="2" height="3" fill="#14532d" />
            <rect x="5" y="6" width="2" height="3" fill="#14532d" />
            <!-- Checkmark above -->
            <path d="M 1 -2 L 3 0 L 7 -4" stroke="#22c55e" stroke-width="1.5" fill="none" class="animate-check-draw" />
          </g>
          <!-- "Good job!" text -->
          <div class="idle-encouragement">Good job!</div>
        </svg>
      {/if}
    </div>
  {/if}
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

  @keyframes pulse-slow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }

  :global(.animate-type-left) {
    animation: type-left 0.3s ease-in-out infinite;
  }

  :global(.animate-type-right) {
    animation: type-right 0.3s ease-in-out infinite;
  }

  @keyframes wave {
    0%, 100% { transform: rotate(0deg); transform-origin: 78px 51px; }
    25% { transform: rotate(-8deg); transform-origin: 78px 51px; }
    75% { transform: rotate(8deg); transform-origin: 78px 51px; }
  }

  .animate-wave {
    animation: wave 0.8s ease-in-out infinite;
  }

  @keyframes glow {
    0%, 100% {
      opacity: 0.3;
      transform: scale(1);
      filter: blur(2px);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.15);
      filter: blur(4px);
    }
  }

  .animate-glow {
    animation: glow 5s ease-in-out infinite;
    transform-origin: center;
  }

  /* ===== CONJURATION ANIMATIONS ===== */
  /* 6 distinct animation styles, staggered by part using --part-delay */

  /* Style 1: Classic Assembly - parts pop in from ground up */
  @keyframes conjure-classic {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .conjure-classic {
    animation: conjure-classic 0.15s ease-out forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 2: Magic Teleport - particles coalesce with fade */
  @keyframes conjure-teleport {
    0% {
      opacity: 0;
      filter: blur(4px);
      transform: scale(0.5);
    }
    50% {
      opacity: 0.5;
      filter: blur(2px);
    }
    100% {
      opacity: 1;
      filter: blur(0);
      transform: scale(1);
    }
  }

  .conjure-teleport {
    animation: conjure-teleport 0.2s ease-out forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 3: Factory Assembly - mechanical drop and click */
  @keyframes conjure-factory {
    0% {
      opacity: 0;
      transform: translateY(-20px);
    }
    60% {
      opacity: 1;
      transform: translateY(2px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .conjure-factory {
    animation: conjure-factory 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 4: Inflate & Pop - balloon-like expand with overshoot */
  @keyframes conjure-inflate {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    70% {
      opacity: 1;
      transform: scale(1.2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .conjure-inflate {
    animation: conjure-inflate 0.18s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 5: Pixel Scan - render row by row, retro digital feel */
  @keyframes conjure-pixel {
    0% {
      opacity: 0;
      clip-path: inset(0 0 100% 0);
    }
    100% {
      opacity: 1;
      clip-path: inset(0 0 0% 0);
    }
  }

  .conjure-pixel {
    animation: conjure-pixel 0.12s steps(3) forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 6: Spring Surprise - Jack-in-the-box bounce */
  @keyframes conjure-spring {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: translateY(-5px) scale(1.1);
    }
    75% {
      transform: translateY(2px) scale(0.95);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .conjure-spring {
    animation: conjure-spring 0.25s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    animation-delay: var(--part-delay);
    opacity: 0;
  }

  /* Style 7: Assembly - magical piece-by-piece construction */
  /* Each part materializes from sparkles and clicks into place */
  @keyframes conjure-assembly {
    0% {
      opacity: 0;
      transform: scale(0) rotate(-180deg);
      filter: blur(8px) brightness(2);
    }
    30% {
      opacity: 0.5;
      transform: scale(0.5) rotate(-90deg);
      filter: blur(4px) brightness(1.5);
    }
    70% {
      opacity: 1;
      transform: scale(1.15) rotate(10deg);
      filter: blur(0) brightness(1.2);
    }
    85% {
      transform: scale(0.95) rotate(-5deg);
    }
    100% {
      opacity: 1;
      transform: scale(1) rotate(0deg);
      filter: blur(0) brightness(1);
    }
  }

  /* Assembly has longer, more dramatic delays for each part */
  .conjure-assembly {
    animation: conjure-assembly 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    opacity: 0;
  }

  /* Override part delays for assembly to be more dramatic */
  .bot-body.conjure-assembly { animation-delay: 0s; }
  .bot-leg-left.conjure-assembly { animation-delay: 0.15s; }
  .bot-leg-right.conjure-assembly { animation-delay: 0.2s; }
  .bot-arm-left.conjure-assembly { animation-delay: 0.3s; }
  .bot-arm-right.conjure-assembly { animation-delay: 0.35s; }
  .bot-antenna.conjure-assembly { animation-delay: 0.45s; }
  .bot-eyes.conjure-assembly { animation-delay: 0.55s; }
  .bot-mouth.conjure-assembly { animation-delay: 0.6s; }
  .bot-tool.conjure-assembly { animation-delay: 0.65s; }

  /* Bobble animation - quick squash then stretch then settle */
  @keyframes bobble {
    0% { transform: scaleY(1); }
    25% { transform: scaleY(0.8); }
    50% { transform: scaleY(1.1); }
    75% { transform: scaleY(0.95); }
    100% { transform: scaleY(1); }
  }

  .animate-bobble {
    animation: bobble 0.4s ease-out;
  }

  /* ===== IDLE ANIMATIONS ===== */

  /* Sleeping Z's floating up */
  @keyframes float-z {
    0% {
      opacity: 0;
      transform: translate(-50%, 0);
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -40px);
    }
  }

  .idle-z {
    position: absolute;
    left: 70%;
    top: 30%;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    animation: float-z 3s ease-in-out infinite;
  }

  .idle-z1 { animation-delay: 0s; }
  .idle-z2 { animation-delay: 1s; font-size: 14px; left: 75%; }
  .idle-z3 { animation-delay: 2s; font-size: 12px; left: 73%; }

  /* Stretching animation */
  @keyframes stretch {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .animate-stretch {
    animation: stretch 2s ease-in-out infinite;
  }

  /* Coffee steam */
  @keyframes steam {
    0% {
      opacity: 0;
      transform: translateY(0);
    }
    30% {
      opacity: 0.6;
    }
    100% {
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  .animate-steam {
    animation: steam 2s ease-in-out infinite;
  }

  /* Stargazing stars */
  @keyframes float-star {
    0%, 100% {
      opacity: 0.4;
      transform: translate(0, 0) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: translate(0, -5px) scale(1);
    }
  }

  .idle-star {
    position: absolute;
    font-size: 18px;
    animation: float-star 3s ease-in-out infinite;
  }

  .idle-star1 { top: 15%; left: 30%; animation-delay: 0s; }
  .idle-star2 { top: 25%; left: 70%; animation-delay: 0.8s; }
  .idle-star3 { top: 10%; left: 50%; animation-delay: 1.6s; }
  .idle-star4 { top: 30%; left: 85%; animation-delay: 2.4s; }

  /* Polishing sparkles */
  @keyframes polish {
    0%, 100% {
      opacity: 0;
      transform: scale(0.5);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  .animate-polish {
    animation: polish 1.5s ease-in-out infinite;
  }

  /* Musical notes */
  @keyframes float-note {
    0% {
      opacity: 0;
      transform: translate(0, 0) rotate(0deg);
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(10px, -35px) rotate(15deg);
    }
  }

  .idle-note {
    position: absolute;
    left: 75%;
    top: 35%;
    font-size: 20px;
    color: rgba(147, 197, 253, 0.8);
    animation: float-note 3s ease-in-out infinite;
  }

  .idle-note1 { animation-delay: 0s; }
  .idle-note2 { animation-delay: 1s; left: 70%; }
  .idle-note3 { animation-delay: 2s; left: 80%; }

  /* Om symbol meditation */
  @keyframes meditate-om {
    0%, 100% {
      opacity: 0.3;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 0.7;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }

  .idle-om {
    position: absolute;
    left: 50%;
    top: 20%;
    font-size: 24px;
    color: rgba(147, 51, 234, 0.6);
    animation: meditate-om 4s ease-in-out infinite;
  }

  /* Pet bouncing */
  @keyframes pet-bounce {
    0%, 100% { transform: translate(55px, 75px) translateY(0); }
    50% { transform: translate(55px, 75px) translateY(-3px); }
  }

  .animate-pet-bounce {
    animation: pet-bounce 1s ease-in-out infinite;
  }

  /* Telescope stars twinkling */
  @keyframes twinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .animate-twinkle {
    animation: twinkle 1.5s ease-in-out infinite;
  }

  /* Bed breathing (blanket rising/falling) */
  @keyframes breathe {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.15); }
  }

  .animate-breathe {
    animation: breathe 3s ease-in-out infinite;
    transform-origin: center;
  }

  /* Doll playing (bouncing up and down) */
  @keyframes doll-play {
    0%, 100% { transform: translate(55px, 55px) rotate(0deg); }
    25% { transform: translate(55px, 52px) rotate(-5deg); }
    75% { transform: translate(55px, 52px) rotate(5deg); }
  }

  .animate-doll-play {
    animation: doll-play 1.5s ease-in-out infinite;
  }

  /* Ghost floating */
  @keyframes ghost-float {
    0%, 100% {
      transform: translate(65px, 45px) translateY(0);
      opacity: 0.4;
    }
    50% {
      transform: translate(65px, 45px) translateY(-5px);
      opacity: 0.6;
    }
  }

  .animate-ghost-float {
    animation: ghost-float 2.5s ease-in-out infinite;
  }

  /* Emoji speech bubbles */
  @keyframes emoji-appear {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    20%, 80% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
      transform: scale(0.5);
    }
  }

  .idle-emoji {
    position: absolute;
    font-size: 16px;
    animation: emoji-appear 4s ease-in-out infinite;
  }

  .idle-emoji1 {
    left: 60%;
    top: 40%;
    animation-delay: 0s;
  }

  .idle-emoji2 {
    left: 75%;
    top: 35%;
    animation-delay: 2s;
  }

  /* Checkmark drawing */
  @keyframes check-draw {
    0%, 100% {
      stroke-dasharray: 10;
      stroke-dashoffset: 10;
    }
    50% {
      stroke-dasharray: 10;
      stroke-dashoffset: 0;
    }
  }

  .animate-check-draw {
    animation: check-draw 2s ease-in-out infinite;
  }

  /* Good job encouragement text */
  @keyframes encouragement-fade {
    0%, 100% {
      opacity: 0;
      transform: translate(-50%, 0);
    }
    20%, 80% {
      opacity: 1;
      transform: translate(-50%, -5px);
    }
  }

  .idle-encouragement {
    position: absolute;
    left: 75%;
    top: 45%;
    font-size: 10px;
    font-weight: bold;
    color: rgba(34, 197, 94, 0.8);
    white-space: nowrap;
    animation: encouragement-fade 3s ease-in-out infinite;
  }
</style>
