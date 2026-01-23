<script lang="ts">
  /**
   * CuteWorld - Rimworld-style agent simulation
   *
   * Agents wander around their project card, showing speech bubbles
   * with their tasks. The conductor (main agent) summons subagents
   * with magical conjuring animations.
   */
  import { onMount, onDestroy } from 'svelte';
  import type { Agent } from '../../../shared/types';
  import CuteBot from './CuteBot.svelte';

  export let agents: Agent[];
  export let height: number = 280;
  export let fillHeight: boolean = false; // If true, fill parent container

  // Conjuring animation types
  type ConjureAnimation = 'sparkle' | 'portal' | 'poof' | 'beam';
  const CONJURE_ANIMATIONS: ConjureAnimation[] = ['sparkle', 'portal', 'poof', 'beam'];

  interface BotState {
    agent: Agent;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    direction: 'left' | 'right';
    idleTimer: number;
    bubbleTimer: number;
    showBubble: boolean;
    bubbleText: string;
    scale: number;
    spawning: boolean;
    conjureAnimation: ConjureAnimation;
    conjureProgress: number; // 0-1 for animation
  }

  let bots: BotState[] = [];
  let containerWidth = 300;
  let containerHeight = height;
  let animationFrame: number;
  let frameCount = 0;

  const BOT_SIZE = 56; // Bigger bots
  const WANDER_SPEED = 0.5;
  const BUBBLE_DURATION = 4000; // Show bubble for 4 seconds
  const BUBBLE_INTERVAL = 2000; // Then hide for 2 seconds
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Bot distance must be large enough that speech bubbles don't collide
  const MIN_BOT_DISTANCE = 100; // Increased for bubble spacing

  // Conductor position computed from desk position (reactive)
  $: conductorX = DESK_POSITIONS.conductor.xPct * containerWidth;
  $: conductorY = DESK_POSITIONS.conductor.yPct * containerHeight;
  // Exclusion zone around conductor - subagents shouldn't spawn too close
  const CONDUCTOR_EXCLUSION_DISTANCE = 100;

  // Desk layout with WIDE spacing to prevent overlap
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP - spread rows far apart
  // Positions are percentages of container width/height for responsiveness
  const DESK_POSITIONS: Record<string, { xPct: number; yPct: number }> = {
    // Conductor at left, vertically centered
    conductor: { xPct: 0.10, yPct: 0.45 },
    // Row 1 - TOP of workspace (15% from top)
    architect: { xPct: 0.35, yPct: 0.15 },
    executor: { xPct: 0.60, yPct: 0.15 },
    explore: { xPct: 0.85, yPct: 0.15 },
    explorer: { xPct: 0.85, yPct: 0.15 },
    // Row 2 - MIDDLE (50% from top)
    designer: { xPct: 0.35, yPct: 0.50 },
    researcher: { xPct: 0.60, yPct: 0.50 },
    tester: { xPct: 0.85, yPct: 0.50 },
    // Row 3 - BOTTOM (85% from top)
    writer: { xPct: 0.35, yPct: 0.85 },
    reviewer: { xPct: 0.60, yPct: 0.85 },
    worker: { xPct: 0.85, yPct: 0.85 },
  };

  // Track which desks are occupied
  let occupiedDesks: Set<string> = new Set();

  // Dynamic bubble sizing based on bot count
  // Few bots = big bubbles (with wrapping), many bots = small marquee bubbles
  $: botCount = bots.length;
  $: bubbleSize = botCount <= 1 ? 'xl' : botCount <= 2 ? 'lg' : botCount <= 4 ? 'md' : 'sm';
  // Cap bubble width to container width minus padding
  $: bubbleDesiredWidth = bubbleSize === 'xl' ? 500 : bubbleSize === 'lg' ? 380 : bubbleSize === 'md' ? 260 : 180;
  $: bubbleMaxWidth = Math.min(bubbleDesiredWidth, containerWidth - 40);
  $: bubbleTextClass = bubbleSize === 'xl' ? 'text-sm' : bubbleSize === 'lg' ? 'text-sm' : 'text-xs';
  $: bubbleCharLimit = bubbleSize === 'xl' ? 300 : bubbleSize === 'lg' ? 180 : bubbleSize === 'md' ? 100 : 60;
  $: bubbleAllowWrap = bubbleSize === 'xl' || bubbleSize === 'lg'; // Bigger bubbles can wrap text
  $: marqueeThreshold = bubbleSize === 'xl' ? 80 : bubbleSize === 'lg' ? 55 : bubbleSize === 'md' ? 35 : 22;

  // Conjuration animation speed (lower = slower, 0.003 ≈ 5 seconds at 60fps)
  const CONJURE_SPEED = 0.003;

  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Use percentage-based bounds so desk rows can spread out properly
  // Values are percentages (0.1 = 10% of container height)
  const BOT_MIN_Y_PCT = 0.10;  // 10% from top
  const BOT_MAX_Y_PCT = 0.85;  // 85% from top (leave room for name tags)

  // Reactive pixel bounds based on container height
  $: botMinY = containerHeight * BOT_MIN_Y_PCT;
  $: botMaxY = containerHeight * BOT_MAX_Y_PCT;

  $: mainAgent = agents.find(a => a.type === 'main');

  // Initialize/update bots when agents change
  $: {
    const existingIds = new Set(bots.map(b => b.agent.id));
    const newAgentIds = new Set(agents.map(a => a.id));

    // Remove departed agents (with fade out)
    bots = bots.filter(b => newAgentIds.has(b.agent.id));

    // Add new agents with conjuring animation
    for (const agent of agents) {
      if (!existingIds.has(agent.id)) {
        const isMain = agent.type === 'main';
        const conjureAnim = CONJURE_ANIMATIONS[Math.floor(Math.random() * CONJURE_ANIMATIONS.length)];

        // Find desk position - ALL agents use desk positions (including conductor)
        const spawnPos = isMain
          ? getDeskPosition('conductor')
          : findNonOverlappingPosition(agent.name);

        bots = [...bots, {
          agent,
          x: spawnPos.x, // Spawn directly at target position
          y: spawnPos.y,
          targetX: spawnPos.x,
          targetY: spawnPos.y,
          direction: isMain ? 'right' : (spawnPos.x > containerWidth / 2 ? 'left' : 'right'),
          idleTimer: 3000 + Math.random() * 2000, // Wait a bit before wandering
          bubbleTimer: Math.random() * BUBBLE_INTERVAL,
          showBubble: true, // Start with bubble showing
          bubbleText: getTaskText(agent),
          scale: 0,
          spawning: true,
          conjureAnimation: conjureAnim,
          conjureProgress: 0,
        }];
      } else {
        // Update existing bot's agent data and bubble text
        // Also force bounds using exclusion zone
        const minX = conductorX + CONDUCTOR_EXCLUSION_DISTANCE;
        const maxX = Math.max(minX + 50, containerWidth - BOT_SIZE - 20);

        bots = bots.map(b => {
          if (b.agent.id === agent.id) {
            const newText = getTaskText(agent);
            // If task changed, show bubble immediately
            const taskChanged = b.bubbleText !== newText;
            const isMain = b.agent.type === 'main';
            return {
              ...b,
              agent,
              // Force position within bounds
              // Conductor uses its desk position, subagents stay within bounds
              x: isMain ? conductorX : Math.max(minX, Math.min(maxX, b.x)),
              y: isMain ? conductorY : Math.max(botMinY, Math.min(botMaxY, b.y)),
              targetY: Math.max(botMinY, Math.min(botMaxY, b.targetY)),
              bubbleText: newText,
              showBubble: taskChanged ? true : b.showBubble,
              bubbleTimer: taskChanged ? BUBBLE_DURATION : b.bubbleTimer,
            };
          }
          return b;
        });
      }
    }
  }

  // Get role category from agent name (for desk assignment)
  function getRoleCategory(agentName: string | undefined): string {
    if (!agentName) return 'worker';
    const clean = agentName.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '').toLowerCase();
    // Map variations to canonical names
    if (clean.includes('architect')) return 'architect';
    if (clean.includes('executor')) return 'executor';
    if (clean.includes('explore')) return 'explore';
    if (clean.includes('design')) return 'designer';
    if (clean.includes('research')) return 'researcher';
    if (clean.includes('writ')) return 'writer';
    if (clean.includes('test') || clean.includes('qa')) return 'tester';
    if (clean.includes('review') || clean.includes('critic')) return 'reviewer';
    return 'worker';
  }

  // Check if a position is occupied by any bot
  function isPositionOccupied(x: number, y: number): boolean {
    for (const bot of bots) {
      const dx = bot.x - x;
      const dy = bot.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_BOT_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  // Get desk position for a role, with fallback to ANY empty desk
  function getDeskPosition(role: string): { x: number; y: number } {
    const desk = DESK_POSITIONS[role] || DESK_POSITIONS.worker;
    const x = desk.xPct * containerWidth;
    const y = desk.yPct * containerHeight;

    // First try: preferred desk for this role
    if (!isPositionOccupied(x, y)) {
      return { x, y };
    }

    // Second try: find ANY empty desk (take empty seats!)
    // Priority order: subagent desks first (not conductor)
    const deskPriority = ['architect', 'executor', 'explore', 'explorer', 'designer',
                          'researcher', 'tester', 'writer', 'reviewer', 'worker'];

    for (const deskRole of deskPriority) {
      const altDesk = DESK_POSITIONS[deskRole];
      if (!altDesk) continue;

      const altX = altDesk.xPct * containerWidth;
      const altY = altDesk.yPct * containerHeight;

      if (!isPositionOccupied(altX, altY)) {
        return { x: altX, y: altY };
      }
    }

    // Third try: offsets from preferred desk (all desks full)
    const offsets = [
      { x: 50, y: 0 }, { x: -50, y: 0 },
      { x: 0, y: 30 }, { x: 0, y: -30 },
      { x: 40, y: 25 }, { x: -40, y: 25 },
    ];

    for (const offset of offsets) {
      const testX = Math.max(conductorX + CONDUCTOR_EXCLUSION_DISTANCE, Math.min(containerWidth - BOT_SIZE - 10, x + offset.x));
      const testY = Math.max(botMinY, Math.min(botMaxY, y + offset.y));

      if (!isPositionOccupied(testX, testY)) {
        return { x: testX, y: testY };
      }
    }

    // Final fallback: random position
    return findRandomPosition();
  }

  function findRandomPosition(): { x: number; y: number } {
    const minX = conductorX + CONDUCTOR_EXCLUSION_DISTANCE;
    const maxX = Math.max(minX + 100, containerWidth - BOT_SIZE - 20);

    for (let attempt = 0; attempt < 20; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = botMinY + Math.random() * (botMaxY - botMinY);

      let hasCollision = false;
      for (const bot of bots) {
        const dx = bot.x - x;
        const dy = bot.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_BOT_DISTANCE) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        return { x, y };
      }
    }

    // Grid fallback
    const subagentCount = bots.filter(b => b.agent.type !== 'main').length;
    const gridX = conductorX + CONDUCTOR_EXCLUSION_DISTANCE + (subagentCount % 3) * 70;
    const gridY = botMinY + Math.floor(subagentCount / 3) * 50;  // Increased row spacing
    return { x: Math.min(gridX, containerWidth - BOT_SIZE - 20), y: Math.min(gridY, botMaxY) };
  }

  // Find position for a new agent - uses desk position based on role
  function findNonOverlappingPosition(agentName?: string): { x: number; y: number } {
    const role = getRoleCategory(agentName);
    return getDeskPosition(role);
  }

  function getTaskText(agent: Agent): string {
    if (agent.status === 'blocked') {
      // DESIGN: Max 2 notifications for "needs input"
      // Only conductor (main agent) shows the full blocked question
      // Subagents just show simple "Paused" to avoid notification spam
      if (agent.type === 'main') {
        // Show actual question if available, otherwise indicate what we were doing
        if (agent.question && agent.question !== 'Waiting for your response...') {
          return agent.question.slice(0, 200);
        }
        // No specific question - show what we were doing (currentActivity > task)
        const context = agent.currentActivity || agent.task;
        return context ? `Done: ${context.slice(0, 150)}` : 'Waiting...';
      }
      return 'Paused';
    }
    if (agent.status === 'complete') {
      // Show WHAT was completed, not just "Done!"
      const taskSnippet = agent.task?.slice(0, 100);
      return taskSnippet ? `✓ ${taskSnippet}` : '✓ Done!';
    }
    // Show delegation status if delegating
    if (agent.delegatingTo) {
      const cleanRole = agent.delegatingTo.replace(/^oh-my-claudecode:/i, '').replace(/^omc:/i, '');
      return `→ Passing to ${cleanRole}...`;
    }
    // Show current activity (what they're doing now) if available
    // Otherwise fall back to task (initial prompt) or generic "Working..."
    // Store more text - we'll truncate at display time based on bubble size
    return agent.currentActivity?.slice(0, 200) || agent.task?.slice(0, 200) || 'Working...';
  }

  // Truncate text for display based on current bubble size
  function truncateForDisplay(text: string, limit: number): string {
    if (text.length <= limit) return text;
    return text.slice(0, limit) + '...';
  }

  // Calculate bubble vertical offset to prevent overlapping bubbles
  // Returns extra Y offset (negative = higher) if this bubble would overlap with others
  function getBubbleYOffset(botIndex: number): number {
    const bot = bots[botIndex];
    if (!bot || !bot.bubbleText) return 0;

    const bubbleHeight = 32; // Approximate height of a bubble
    const minBubbleSpacing = 8;

    let offset = 0;

    // Check all bots that come before this one (already rendered)
    for (let i = 0; i < botIndex; i++) {
      const other = bots[i];
      if (!other.bubbleText || other.scale <= 0.5) continue;

      // Check if bubbles would overlap horizontally
      const botCenterX = bot.x + BOT_SIZE / 2;
      const otherCenterX = other.x + BOT_SIZE / 2;
      const horizontalDist = Math.abs(botCenterX - otherCenterX);

      // If bots are close horizontally (bubbles might overlap)
      if (horizontalDist < bubbleMaxWidth * 0.8) {
        // Check vertical proximity too
        const verticalDist = Math.abs(bot.y - other.y);
        if (verticalDist < bubbleHeight + minBubbleSpacing) {
          // Stagger this bubble higher
          offset -= (bubbleHeight + minBubbleSpacing);
        }
      }
    }

    return offset;
  }

  function getRole(agent: Agent): string {
    if (agent.type === 'main') return 'conductor';
    return cleanAgentName(agent.name) || 'worker';
  }

  // Clean up agent names - remove oh-my-claudecode: prefix and simplify
  function cleanAgentName(name: string | undefined): string {
    if (!name) return '';
    // Remove oh-my-claudecode: prefix
    let clean = name.replace(/^oh-my-claudecode:/i, '');
    // Also remove any other common prefixes
    clean = clean.replace(/^omc:/i, '');
    return clean;
  }

  function animate() {
    frameCount++;

    for (const bot of bots) {
      // Handle spawn/conjure animation (5 seconds for full effect)
      if (bot.spawning) {
        bot.conjureProgress = Math.min(1, bot.conjureProgress + CONJURE_SPEED);
        bot.scale = easeOutBack(bot.conjureProgress);
        if (bot.conjureProgress >= 1) {
          bot.spawning = false;
          bot.scale = 1;
        }
        continue;
      }

      const isMain = bot.agent.type === 'main';

      // Bubble timing
      bot.bubbleTimer -= 16;
      if (bot.bubbleTimer <= 0) {
        bot.showBubble = !bot.showBubble;
        bot.bubbleTimer = bot.showBubble ? BUBBLE_DURATION : BUBBLE_INTERVAL;
      }

      // All agents (including subagents) stay at their desk positions
      // Continuously enforce desk position so it updates when container resizes
      const role = isMain ? 'conductor' : getRoleCategory(bot.agent.name);
      const deskPos = DESK_POSITIONS[role] || DESK_POSITIONS.worker;
      const targetX = deskPos.xPct * containerWidth;
      const targetY = deskPos.yPct * containerHeight;

      // Conductor stays exactly at desk
      if (isMain) {
        bot.x = targetX;
        bot.y = targetY;
        bot.showBubble = bot.agent.status === 'blocked' || bot.showBubble;
        continue;
      }

      // Subagents move towards their desk position
      const dx = targetX - bot.x;
      const dy = targetY - bot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 3) {
        // Move towards desk position
        let moveX = (dx / dist) * WANDER_SPEED * 2;
        let moveY = (dy / dist) * WANDER_SPEED * 2;

        // Collision avoidance - check ALL other bots including conductor
        for (const other of bots) {
          if (other === bot) continue;
          const odx = bot.x - other.x;
          const ody = bot.y - other.y;
          const odist = Math.sqrt(odx * odx + ody * ody);
          const repulsionDist = other.agent.type === 'main' ? CONDUCTOR_EXCLUSION_DISTANCE : MIN_BOT_DISTANCE;
          const repulsionStrength = other.agent.type === 'main' ? 0.8 : 0.4;
          if (odist < repulsionDist && odist > 0) {
            const force = (repulsionDist - odist) / repulsionDist * repulsionStrength;
            moveX += (odx / odist) * force;
            moveY += (ody / odist) * force;
          }
        }

        bot.x += moveX;
        bot.y += moveY;
        bot.direction = dx > 0 ? 'right' : 'left';
      } else {
        // At desk - snap to exact position
        bot.x = targetX;
        bot.y = targetY;
      }
    }

    if (frameCount % 3 === 0) {
      bots = bots;
    }

    animationFrame = requestAnimationFrame(animate);
  }

  // Easing function for bouncy spawn
  function easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  onMount(() => {
    animate();
  });

  onDestroy(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });
</script>

<!-- DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP -->
<!-- Use clip-path instead of overflow-hidden to allow name tags to extend below bots -->
<div
  class="relative rounded-lg bg-gradient-to-b from-gray-900/50 to-gray-900/20 {fillHeight ? 'h-full' : ''}"
  style="{fillHeight ? '' : `height: ${height}px`} clip-path: inset(0 0 -30px 0);"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  <!-- Ground/floor effect -->
  <div class="absolute bottom-6 left-0 right-0 h-px bg-gray-700/30"></div>
  <div class="absolute bottom-5 left-0 right-0 h-px bg-gray-700/20"></div>

  <!-- Desk position markers (subtle shadows) -->
  {#each Object.entries(DESK_POSITIONS) as [role, pos]}
    {@const deskX = pos.xPct * containerWidth}
    {@const deskY = pos.yPct * containerHeight}
    {@const isOccupied = bots.some(b => {
      const botRole = b.agent.type === 'main' ? 'conductor' : getRoleCategory(b.agent.name);
      return botRole === role;
    })}
    <div
      class="absolute rounded-full pointer-events-none transition-opacity duration-500"
      class:opacity-30={isOccupied}
      class:opacity-10={!isOccupied}
      style="
        left: {deskX - 5}px;
        top: {deskY + BOT_SIZE - 5}px;
        width: {BOT_SIZE + 10}px;
        height: 12px;
        background: radial-gradient(ellipse, rgba(100, 150, 255, 0.3) 0%, transparent 70%);
        z-index: 1;
      "
    />
  {/each}

  <!-- Conjuring effects layer (behind bots) - more visible and longer lasting -->
  {#each bots as bot (bot.agent.id)}
    {#if bot.spawning && bot.agent.type === 'subagent'}
      {@const effectIntensity = Math.max(0, 1 - bot.conjureProgress * 1.5)}
      {@const roleAnnounceOpacity = bot.conjureProgress < 0.5 ? bot.conjureProgress * 2 : Math.max(0, 1 - (bot.conjureProgress - 0.5) * 2)}
      <div
        class="absolute pointer-events-none"
        style="left: {bot.x + BOT_SIZE/2}px; top: {bot.y + BOT_SIZE/2}px; z-index: 500;"
      >
        {#if bot.conjureAnimation === 'sparkle'}
          <!-- Sparkle effect - larger and more particles -->
          <div class="conjure-sparkle">
            {#each Array(12) as _, i}
              <div
                class="absolute w-2 h-2 rounded-full bg-yellow-300 shadow-lg shadow-yellow-400/50"
                style="
                  transform: rotate({i * 30}deg) translateY({-25 - bot.conjureProgress * 40}px);
                  opacity: {effectIntensity};
                "
              />
            {/each}
            <!-- Center glow -->
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-yellow-400/30"
              style="opacity: {effectIntensity}; filter: blur(8px);"
            />
          </div>
        {:else if bot.conjureAnimation === 'portal'}
          <!-- Portal effect - more dramatic -->
          <div class="absolute -translate-x-1/2 -translate-y-1/2">
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-purple-400"
              style="
                width: {80 * (1 - bot.conjureProgress * 0.3)}px;
                height: {80 * (1 - bot.conjureProgress * 0.3)}px;
                opacity: {effectIntensity};
                box-shadow: 0 0 30px rgba(168, 85, 247, {effectIntensity * 0.8}), inset 0 0 20px rgba(168, 85, 247, {effectIntensity * 0.5});
                animation: spin 2s linear infinite;
              "
            />
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/20"
              style="width: 60px; height: 60px; opacity: {effectIntensity}; filter: blur(10px);"
            />
          </div>
        {:else if bot.conjureAnimation === 'poof'}
          <!-- Poof cloud effect - larger clouds -->
          <div class="absolute -translate-x-1/2 -translate-y-1/2">
            {#each Array(7) as _, i}
              <div
                class="absolute rounded-full bg-white/40"
                style="
                  width: {20 + i * 8}px;
                  height: {20 + i * 8}px;
                  transform: translate({(i - 3) * 15}px, {Math.sin(i * 1.5) * 15 - bot.conjureProgress * 20}px) scale({1 - bot.conjureProgress * 0.8});
                  opacity: {effectIntensity * 0.8};
                  filter: blur(2px);
                "
              />
            {/each}
          </div>
        {:else if bot.conjureAnimation === 'beam'}
          <!-- Light beam from conductor - thicker and glowing -->
          <div
            class="absolute bg-gradient-to-r from-blue-400 via-cyan-300 to-transparent rounded-full"
            style="
              width: {(bot.x - conductorX + BOT_SIZE/2) * (1 - bot.conjureProgress * 0.8)}px;
              height: 6px;
              left: {-(bot.x - conductorX + BOT_SIZE/2)}px;
              top: -3px;
              opacity: {effectIntensity};
              box-shadow: 0 0 15px rgba(56, 189, 248, {effectIntensity * 0.8});
            "
          />
        {/if}

        <!-- Role announcement floating text -->
        <div
          class="absolute text-sm font-bold text-cyan-300 whitespace-nowrap pointer-events-none"
          style="
            left: 50%;
            transform: translateX(-50%) translateY({-30 - bot.conjureProgress * 20}px);
            opacity: {roleAnnounceOpacity};
            text-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
          "
        >
          + {cleanAgentName(bot.agent.name) || 'agent'}
        </div>
      </div>
    {/if}
  {/each}

  <!-- Conductor summoning glow when spawning subagents -->
  {#if bots.some(b => b.spawning && b.agent.type === 'subagent')}
    <div
      class="absolute rounded-full bg-blue-400/20 animate-pulse"
      style="
        left: {conductorX - 10}px;
        top: {conductorY - 10}px;
        width: 60px;
        height: 60px;
        filter: blur(10px);
      "
    />
  {/if}

  <!-- Speech bubbles layer (rendered separately to avoid transform issues) -->
  <!-- DESIGN: NOTHING SHOULD OVERLAP - bubbles are staggered vertically if needed -->
  {#each bots as bot, botIndex (bot.agent.id + '-bubble')}
    {#if bot.bubbleText && bot.scale > 0.5}
      {@const displayText = truncateForDisplay(bot.bubbleText, bubbleCharLimit)}
      {@const needsMarquee = !bubbleAllowWrap && displayText.length > marqueeThreshold}
      {@const botCenterX = bot.x + BOT_SIZE / 2}
      {@const bubbleWidth = Math.min(bubbleMaxWidth, containerWidth - 20)}
      {@const bubbleLeft = Math.max(10, Math.min(containerWidth - bubbleWidth - 10, botCenterX - bubbleWidth / 2))}
      {@const tailOffset = botCenterX - bubbleLeft - bubbleWidth / 2}
      {@const bubbleYOffset = getBubbleYOffset(botIndex)}
      <div
        class="absolute px-3 py-1.5 rounded-lg {bubbleTextClass}
               backdrop-blur shadow-lg overflow-hidden pointer-events-none
               {bot.agent.status === 'blocked'
                 ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                 : bot.agent.status === 'complete'
                   ? 'bg-green-500/30 text-green-200 border border-green-500/40'
                   : 'bg-white/10 text-white/90 border border-white/20'}"
        style="
          left: {bubbleLeft}px;
          top: {bot.y - 8 + bubbleYOffset}px;
          transform: translateY(-100%);
          width: {bubbleWidth}px;
          z-index: {1000 + Math.floor(bot.y) - bubbleYOffset};
        "
      >
        <div
          class="{bubbleAllowWrap ? 'whitespace-normal' : 'whitespace-nowrap'} {needsMarquee ? 'animate-marquee' : ''}"
          style={needsMarquee ? `--marquee-offset: ${bubbleWidth - 40}px` : ''}
        >
          {displayText}
        </div>
        <!-- Bubble tail - positioned to point at bot -->
        <div
          class="absolute top-full w-0 h-0
                 border-l-4 border-r-4 border-t-4 border-transparent
                 {bot.agent.status === 'blocked'
                   ? 'border-t-amber-500/40'
                   : bot.agent.status === 'complete'
                     ? 'border-t-green-500/40'
                     : 'border-t-white/20'}"
          style="left: calc(50% + {Math.max(-bubbleWidth/2 + 15, Math.min(bubbleWidth/2 - 15, tailOffset))}px); transform: translateX(-50%);"
        />
      </div>
    {/if}
  {/each}

  <!-- Bots -->
  {#each bots as bot (bot.agent.id)}
    <div
      class="absolute transition-transform duration-100"
      style="
        left: {bot.x}px;
        top: {bot.y}px;
        transform: scaleX({bot.direction === 'left' ? -1 : 1}) scale({bot.scale});
        z-index: {Math.floor(bot.y)};
      "
    >
      <!-- Bot using CuteBot component -->
      <div style="width: {BOT_SIZE}px; height: {BOT_SIZE}px;">
        <CuteBot
          status={bot.agent.status}
          role={getRole(bot.agent)}
          size="lg"
        />
      </div>

      <!-- Name tag with spawn animation -->
      <div
        class="absolute top-full left-1/2 mt-1 text-xs whitespace-nowrap text-center transition-all duration-500"
        class:text-cyan-300={bot.spawning}
        class:text-gray-400={!bot.spawning}
        class:font-medium={bot.spawning}
        class:scale-110={bot.spawning}
        style="transform: translateX(-50%) scaleX({bot.direction === 'left' ? -1 : 1})"
      >
        {bot.agent.type === 'main' ? 'conductor' : cleanAgentName(bot.agent.name) || 'worker'}
        {#if bot.spawning}
          <span class="animate-pulse"> ✨</span>
        {/if}
      </div>
    </div>
  {/each}

  <!-- DESIGN: "Needs input" shown via conductor's speech bubble only, no extra overlay -->
  <!-- Removed redundant blocked overlay - max 2 notifications rule -->
</div>

<style>
  .conjure-sparkle {
    position: absolute;
    transform: translate(-50%, -50%);
  }

  /* Marquee animation for long text in speech bubbles */
  @keyframes marquee {
    0%, 15% {
      transform: translateX(0);
    }
    45%, 55% {
      transform: translateX(calc(-100% + var(--marquee-offset, 140px)));
    }
    85%, 100% {
      transform: translateX(0);
    }
  }

  .animate-marquee {
    animation: marquee 10s ease-in-out infinite;
    display: inline-block;
    padding-right: 30px;
  }

  /* Portal spin animation */
  @keyframes spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
</style>
