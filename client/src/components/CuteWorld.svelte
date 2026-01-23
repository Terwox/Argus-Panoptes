<script lang="ts">
  /**
   * CuteWorld - Rimworld-style agent simulation
   *
   * Agents wander around their project card, showing speech bubbles
   * with their tasks. The conductor (main agent) summons subagents
   * and displays questions when blocked.
   */
  import { onMount, onDestroy } from 'svelte';
  import type { Agent } from '../../../shared/types';

  export let agents: Agent[];
  export let height: number = 180;

  interface BotState {
    agent: Agent;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    direction: 'left' | 'right';
    idleTimer: number;
    showBubble: boolean;
    bubbleText: string;
    scale: number;
    spawning: boolean;
  }

  let bots: BotState[] = [];
  let containerWidth = 300;
  let animationFrame: number;

  const CONDUCTOR_X = 40; // Conductor stays on the left
  const BOT_SIZE = 32;
  const WANDER_SPEED = 0.3;
  const SPAWN_DURATION = 500;

  $: mainAgent = agents.find(a => a.type === 'main');
  $: subagents = agents.filter(a => a.type === 'subagent');

  // Initialize/update bots when agents change
  $: {
    const existingIds = new Set(bots.map(b => b.agent.id));
    const newAgentIds = new Set(agents.map(a => a.id));

    // Remove departed agents
    bots = bots.filter(b => newAgentIds.has(b.agent.id));

    // Add new agents
    for (const agent of agents) {
      if (!existingIds.has(agent.id)) {
        const isMain = agent.type === 'main';
        bots = [...bots, {
          agent,
          x: isMain ? CONDUCTOR_X : CONDUCTOR_X + 20, // Spawn near conductor
          y: height / 2 + (Math.random() - 0.5) * 40,
          targetX: isMain ? CONDUCTOR_X : randomX(),
          targetY: randomY(),
          direction: 'right',
          idleTimer: Math.random() * 3000,
          showBubble: false,
          bubbleText: getTaskText(agent),
          scale: 0,
          spawning: true,
        }];
      } else {
        // Update existing bot's agent data
        bots = bots.map(b => b.agent.id === agent.id ? { ...b, agent, bubbleText: getTaskText(agent) } : b);
      }
    }
  }

  function randomX(): number {
    return CONDUCTOR_X + 60 + Math.random() * (containerWidth - CONDUCTOR_X - 100);
  }

  function randomY(): number {
    return 30 + Math.random() * (height - 70);
  }

  function getTaskText(agent: Agent): string {
    if (agent.status === 'blocked') {
      return agent.question?.slice(0, 60) || 'Waiting...';
    }
    return agent.task?.slice(0, 40) || (agent.name || 'Working');
  }

  function animate() {
    const now = Date.now();

    bots = bots.map(bot => {
      // Handle spawn animation
      if (bot.spawning) {
        bot.scale = Math.min(1, bot.scale + 0.05);
        if (bot.scale >= 1) bot.spawning = false;
        return bot;
      }

      const isMain = bot.agent.type === 'main';

      // Conductor stays put but can show bubble when blocked
      if (isMain) {
        bot.showBubble = bot.agent.status === 'blocked';
        return bot;
      }

      // Move towards target
      const dx = bot.targetX - bot.x;
      const dy = bot.targetY - bot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 2) {
        bot.x += (dx / dist) * WANDER_SPEED;
        bot.y += (dy / dist) * WANDER_SPEED;
        bot.direction = dx > 0 ? 'right' : 'left';
      } else {
        // Reached target, idle for a bit then pick new target
        bot.idleTimer -= 16;
        if (bot.idleTimer <= 0) {
          bot.targetX = randomX();
          bot.targetY = randomY();
          bot.idleTimer = 2000 + Math.random() * 4000;
          bot.showBubble = !bot.showBubble; // Toggle bubble periodically
        }
      }

      // Completed agents settle down
      if (bot.agent.status === 'complete') {
        bot.targetX = bot.x;
        bot.targetY = bot.y;
      }

      return bot;
    });

    animationFrame = requestAnimationFrame(animate);
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });

  // Bot colors based on status
  function botColor(agent: Agent): string {
    switch (agent.status) {
      case 'blocked': return '#f59e0b';
      case 'working': return '#3b82f6';
      case 'complete': return '#22c55e';
      default: return '#6b7280';
    }
  }

  // Conductor wears a little hat
  function isBlocked(agent: Agent): boolean {
    return agent.status === 'blocked';
  }
</script>

<div
  class="relative overflow-hidden rounded-lg bg-gradient-to-b from-gray-900/50 to-gray-900/20"
  style="height: {height}px"
  bind:clientWidth={containerWidth}
>
  <!-- Ground line -->
  <div class="absolute bottom-4 left-0 right-0 h-px bg-gray-700/50"></div>

  <!-- Bots -->
  {#each bots as bot (bot.agent.id)}
    <div
      class="absolute transition-transform duration-75"
      style="
        left: {bot.x}px;
        top: {bot.y}px;
        transform: scaleX({bot.direction === 'left' ? -1 : 1}) scale({bot.scale});
      "
    >
      <!-- Speech bubble -->
      {#if bot.showBubble && bot.bubbleText}
        <div
          class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg text-caption
                 bg-white/10 backdrop-blur text-white/80 whitespace-nowrap max-w-[150px] truncate
                 {bot.agent.status === 'blocked' ? 'bg-blocked/20 text-blocked' : ''}"
          style="transform: scaleX({bot.direction === 'left' ? -1 : 1})"
        >
          {bot.bubbleText}
        </div>
      {/if}

      <!-- Bot SVG -->
      <svg width={BOT_SIZE} height={BOT_SIZE} viewBox="0 0 100 100" class="drop-shadow-lg">
        <!-- Body -->
        <rect
          x="20" y="35" width="60" height="45" rx="8"
          fill={botColor(bot.agent)}
          class="transition-colors duration-300"
        />

        <!-- Hat for conductor -->
        {#if bot.agent.type === 'main'}
          <polygon points="30,35 50,15 70,35" fill={botColor(bot.agent)} />
          <rect x="25" y="32" width="50" height="5" fill={botColor(bot.agent)} />
        {/if}

        <!-- Antenna for subagents -->
        {#if bot.agent.type === 'subagent'}
          <line x1="50" y1="35" x2="50" y2="22" stroke={botColor(bot.agent)} stroke-width="3" />
          <circle cx="50" cy="18" r="4" fill={botColor(bot.agent)} class={bot.agent.status === 'working' ? 'animate-pulse' : ''} />
        {/if}

        <!-- Eyes -->
        {#if bot.agent.status === 'blocked'}
          <!-- Wide worried eyes -->
          <circle cx="37" cy="52" r="7" fill="white" />
          <circle cx="63" cy="52" r="7" fill="white" />
          <circle cx="37" cy="53" r="3" fill="#333" />
          <circle cx="63" cy="53" r="3" fill="#333" />
        {:else if bot.agent.status === 'complete'}
          <!-- Happy closed eyes -->
          <path d="M 32 52 Q 37 47 42 52" stroke="white" stroke-width="3" fill="none" />
          <path d="M 58 52 Q 63 47 68 52" stroke="white" stroke-width="3" fill="none" />
        {:else}
          <!-- Normal eyes -->
          <circle cx="37" cy="52" r="5" fill="white" />
          <circle cx="63" cy="52" r="5" fill="white" />
          <circle cx="38" cy="53" r="2.5" fill="#333" />
          <circle cx="64" cy="53" r="2.5" fill="#333" />
        {/if}

        <!-- Mouth -->
        {#if bot.agent.status === 'blocked'}
          <ellipse cx="50" cy="68" rx="6" ry="4" fill="#333" />
        {:else if bot.agent.status === 'complete'}
          <path d="M 38 66 Q 50 76 62 66" stroke="#333" stroke-width="2.5" fill="none" />
        {:else}
          <path d="M 42 66 Q 50 72 58 66" stroke="#333" stroke-width="2.5" fill="none" />
        {/if}

        <!-- Legs with bobbing animation -->
        <rect x="32" y="78" width="10" height="12" rx="3" fill={botColor(bot.agent)} class={bot.agent.status === 'working' ? 'animate-bob-left' : ''} />
        <rect x="58" y="78" width="10" height="12" rx="3" fill={botColor(bot.agent)} class={bot.agent.status === 'working' ? 'animate-bob-right' : ''} />
      </svg>

      <!-- Name tag -->
      <div
        class="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-caption text-gray-400 whitespace-nowrap"
        style="transform: scaleX({bot.direction === 'left' ? -1 : 1})"
      >
        {bot.agent.name || bot.agent.type}
      </div>
    </div>
  {/each}

  <!-- Blocked question overlay -->
  {#if mainAgent?.status === 'blocked' && mainAgent.question}
    <div class="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-lg bg-blocked/20 border border-blocked/30 text-sm text-blocked">
      💬 {mainAgent.question}
    </div>
  {/if}
</div>

<style>
  @keyframes bob-left {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes bob-right {
    0%, 100% { transform: translateY(-2px); }
    50% { transform: translateY(0); }
  }

  :global(.animate-bob-left) {
    animation: bob-left 0.3s ease-in-out infinite;
  }

  :global(.animate-bob-right) {
    animation: bob-right 0.3s ease-in-out infinite;
  }
</style>
