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

  // Conjuring animation types - 6 distinct styles
  type ConjureAnimation = 'classic' | 'teleport' | 'factory' | 'inflate' | 'pixel' | 'spring';
  const CONJURE_ANIMATIONS: ConjureAnimation[] = ['classic', 'teleport', 'factory', 'inflate', 'pixel', 'spring'];

  // Track last animation used for no-repeat logic
  let lastConjureAnimation: ConjureAnimation | null = null;

  // Bot click reactions (spin removed - too flashy for random selection)
  type BotReaction = 'wave' | 'bounce' | 'giggle' | 'emoji';
  const BOT_REACTIONS: BotReaction[] = ['wave', 'bounce', 'giggle', 'emoji'];
  const HAPPY_EMOJIS = ['🎵', '✨', '💫', '🌟', '💖', '🎶', '🌈', '⭐', '🎀', '🍀', '🌸', '😊', '🥰', '💕'];

  function getRandomReaction(): BotReaction {
    return BOT_REACTIONS[Math.floor(Math.random() * BOT_REACTIONS.length)];
  }

  function getRandomEmoji(): string {
    return HAPPY_EMOJIS[Math.floor(Math.random() * HAPPY_EMOJIS.length)];
  }

  function handleBotClick(botId: string) {
    const botIndex = bots.findIndex(b => b.agent.id === botId);
    if (botIndex === -1) return;

    // Don't react if already reacting
    if (bots[botIndex].reaction) return;

    const reaction = getRandomReaction();
    const emoji = reaction === 'emoji' ? getRandomEmoji() : '';

    bots[botIndex].reaction = reaction;
    bots[botIndex].reactionEmoji = emoji;
    bots = bots; // Trigger reactivity

    // Clear reaction after animation completes
    setTimeout(() => {
      if (bots[botIndex]) {
        bots[botIndex].reaction = null;
        bots[botIndex].reactionEmoji = '';
        bots = bots;
      }
    }, 600);
  }

  function getRandomConjureAnimation(): ConjureAnimation {
    if (CONJURE_ANIMATIONS.length === 1) return CONJURE_ANIMATIONS[0];

    let next: ConjureAnimation;
    do {
      next = CONJURE_ANIMATIONS[Math.floor(Math.random() * CONJURE_ANIMATIONS.length)];
    } while (next === lastConjureAnimation);

    lastConjureAnimation = next;
    return next;
  }

  // Box-Muller transform for normally distributed random numbers
  function randomGaussian(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  interface BotState {
    agent: Agent;
    x: number;
    y: number;
    vx: number; // Velocity X for bouncy physics
    vy: number; // Velocity Y for bouncy physics
    homeX: number; // Home position (desk) to gravitate towards
    homeY: number;
    assignedDesk: string; // Which desk this bot is assigned to (for spreading out same-role bots)
    direction: 'left' | 'right';
    wanderTimer: number; // Time until next random direction change
    bubbleTimer: number;
    showBubble: boolean;
    bubbleText: string;
    scale: number;
    spawning: boolean;
    conjureAnimation: ConjureAnimation;
    conjureProgress: number; // 0-1 for animation
    reaction: BotReaction | null; // Current click reaction
    reactionEmoji: string; // Emoji to show for 'emoji' reaction
    bounceTimer: number; // Time spent bouncing off others (ms) - relocate desk if too long
    bounceThreshold: number; // Personal frustration threshold (varies per bot)
    isRelocating: boolean; // Currently pushing desk to new location
    relocateTargetX: number; // Target X when relocating
    relocateTargetY: number; // Target Y when relocating
  }

  let bots: BotState[] = [];
  let containerWidth = 300;
  let containerHeight = height;
  let animationFrame: number;
  let frameCount = 0;

  const BOT_SIZE = 56; // Bigger bots
  // DESIGN PRINCIPLE: NO VISIBLE TIMERS - no "47s ago" anxiety counters
  // DESIGN PRINCIPLE: Bubbles always visible - toggling is distracting
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Bot distance must be large enough that speech bubbles don't collide
  const MIN_BOT_DISTANCE = 90; // Reduced to allow closer spacing

  // Conductor position computed from desk position (reactive)
  $: conductorX = DESK_POSITIONS.conductor.xPct * containerWidth;
  $: conductorY = DESK_POSITIONS.conductor.yPct * containerHeight;
  // Exclusion zone around conductor - subagents shouldn't spawn too close
  const CONDUCTOR_EXCLUSION_DISTANCE = 100;

  // EXPERIMENT: Organic desk building - bots find open space and build desks there
  // Only conductor has a fixed position; subagents find their own spot
  const BASE_DESK_POSITIONS: Record<string, { xPct: number; yPct: number }> = {
    // Conductor at upper-left (bubble goes below into main area)
    conductor: { xPct: 0.10, yPct: 0.12 },
  };

  // Dynamic desk positions - bots add their own desks when they spawn
  let DESK_POSITIONS: Record<string, { xPct: number; yPct: number }> = { ...BASE_DESK_POSITIONS };

  // Find open space for a new desk (avoiding existing desks and bots)
  function findOpenSpaceForDesk(): { xPct: number; yPct: number } {
    const minXPct = 0.12; // Closer to edges
    const maxXPct = 0.92;
    const minYPct = 0.05;
    const maxYPct = 0.75; // Use more vertical space
    const minDistPct = 0.18; // Allow closer desk spacing

    // Try random positions, check for overlap
    for (let attempt = 0; attempt < 50; attempt++) {
      const xPct = minXPct + Math.random() * (maxXPct - minXPct);
      const yPct = minYPct + Math.random() * (maxYPct - minYPct);

      let hasOverlap = false;
      for (const desk of Object.values(DESK_POSITIONS)) {
        const dx = desk.xPct - xPct;
        const dy = desk.yPct - yPct;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistPct) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return { xPct, yPct };
      }
    }

    // Fallback: grid position based on desk count
    const deskCount = Object.keys(DESK_POSITIONS).length;
    const col = (deskCount - 1) % 3;
    const row = Math.floor((deskCount - 1) / 3);
    return {
      xPct: Math.min(0.30 + col * 0.25, maxXPct),
      yPct: Math.min(0.15 + row * 0.25, maxYPct),
    };
  }

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
        const conjureAnim = getRandomConjureAnimation();

        // Find desk position - ALL agents use desk positions (including conductor)
        const spawnPos = isMain
          ? getDeskPosition('conductor')
          : findNonOverlappingPosition(agent.name);

        bots = [...bots, {
          agent,
          x: spawnPos.x, // Spawn directly at target position
          y: spawnPos.y,
          vx: (Math.random() - 0.5) * 0.5, // Small random initial velocity
          vy: (Math.random() - 0.5) * 0.5,
          homeX: spawnPos.x, // Remember home position for gravitation
          homeY: spawnPos.y,
          assignedDesk: spawnPos.deskKey, // Remember which desk for responsive repositioning
          direction: isMain ? 'right' : (spawnPos.x > containerWidth / 2 ? 'left' : 'right'),
          wanderTimer: 1000 + Math.random() * 2000, // Time until direction change
          bubbleTimer: 0, // Unused - bubbles always visible
          showBubble: true, // Always visible - no toggling
          bubbleText: getTaskText(agent),
          scale: 0,
          spawning: true,
          conjureAnimation: conjureAnim,
          conjureProgress: 0,
          reaction: null,
          reactionEmoji: '',
          bounceTimer: 0,
          bounceThreshold: Math.max(5000, randomGaussian(10000, 5000)), // Personal patience level (min 5s)
          isRelocating: false,
          relocateTargetX: 0,
          relocateTargetY: 0,
        }];
      } else {
        // Update existing bot's agent data and bubble text
        bots = bots.map(b => {
          if (b.agent.id === agent.id) {
            return {
              ...b,
              agent,
              // Ensure velocity exists (for bots from before physics update)
              vx: b.vx ?? 0,
              vy: b.vy ?? 0,
              wanderTimer: b.wanderTimer ?? 1000,
              bubbleText: getTaskText(agent),
              showBubble: true, // Always visible
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

  // Check if a desk is already assigned to a bot
  function isDeskAssigned(deskKey: string): boolean {
    return bots.some(b => b.assignedDesk === deskKey);
  }

  // Get desk position - ORGANIC: bots find open space and build their desk there
  // Conductor always gets 'conductor' desk (fixed position)
  // Returns both position AND which desk was assigned (for responsive repositioning)
  function getDeskPosition(role: string): { x: number; y: number; deskKey: string } {
    // Conductor always gets the conductor desk
    if (role === 'conductor') {
      const desk = DESK_POSITIONS.conductor;
      return { x: desk.xPct * containerWidth, y: desk.yPct * containerHeight, deskKey: 'conductor' };
    }

    // ORGANIC: Find open space and create a new desk there
    const deskCount = Object.keys(DESK_POSITIONS).length;
    const deskKey = `desk${deskCount}`; // desk1, desk2, etc.

    // Find open space for the new desk
    const openSpace = findOpenSpaceForDesk();

    // Register this desk position
    DESK_POSITIONS[deskKey] = openSpace;

    return {
      x: openSpace.xPct * containerWidth,
      y: openSpace.yPct * containerHeight,
      deskKey
    };
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
  function findNonOverlappingPosition(agentName?: string): { x: number; y: number; deskKey: string } {
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

    // Physics constants
    const FRICTION = 0.98; // Velocity decay
    const BOUNCE = 0.7; // Bounce energy retention
    const HOME_PULL = 0.002; // Gentle pull towards home desk
    const WANDER_FORCE = 0.025; // Random wandering impulse (slower, calmer movement)
    const BOT_REPULSION = 0.15; // How hard bots push each other
    const MARGIN = 8; // Minimal margin from container edges

    // Calculate bounds
    const minX = MARGIN;
    const maxX = containerWidth - BOT_SIZE - MARGIN;
    const minY = MARGIN;
    const maxY = containerHeight - BOT_SIZE - MARGIN;

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

      // Bubbles always visible - no toggling, less distracting
      bot.showBubble = true;

      // Update home position based on assigned desk (for responsive resizing)
      const deskKey = bot.assignedDesk?.split('-')[0] || (isMain ? 'conductor' : 'worker');
      const deskPos = DESK_POSITIONS[deskKey] || DESK_POSITIONS.worker;
      bot.homeX = deskPos.xPct * containerWidth;
      bot.homeY = deskPos.yPct * containerHeight;

      // Conductor stays at podium
      if (isMain) {
        bot.x = bot.homeX;
        bot.y = bot.homeY;
        continue;
      }

      // === WANDERING PHYSICS FOR SUBAGENTS ===

      // Handle relocating bots differently - they walk determinedly to their new spot
      if (bot.isRelocating) {
        const relocateDistX = bot.relocateTargetX - bot.x;
        const relocateDistY = bot.relocateTargetY - bot.y;
        const relocateDist = Math.sqrt(relocateDistX * relocateDistX + relocateDistY * relocateDistY);

        if (relocateDist < 10) {
          // Arrived at new desk! Settle in
          bot.isRelocating = false;
          bot.homeX = bot.relocateTargetX;
          bot.homeY = bot.relocateTargetY;
          bot.x = bot.homeX;
          bot.y = bot.homeY;
          bot.vx = 0;
          bot.vy = 0;
        } else {
          // Walk determinedly toward new location (stronger pull, no wandering)
          const relocateSpeed = 0.008; // Faster than normal home pull
          bot.vx += relocateDistX * relocateSpeed;
          bot.vy += relocateDistY * relocateSpeed;
          // Face the direction we're walking
          if (Math.abs(relocateDistX) > 5) {
            bot.direction = relocateDistX > 0 ? 'right' : 'left';
          }
        }
      } else {
        // Normal wandering behavior
        // Random direction changes (wandering)
        bot.wanderTimer -= 16;
        if (bot.wanderTimer <= 0) {
          bot.vx += (Math.random() - 0.5) * WANDER_FORCE;
          bot.vy += (Math.random() - 0.5) * WANDER_FORCE;
          bot.wanderTimer = 500 + Math.random() * 1500;
        }

        // Gentle pull towards home desk
        const homeDistX = bot.homeX - bot.x;
        const homeDistY = bot.homeY - bot.y;
        bot.vx += homeDistX * HOME_PULL;
        bot.vy += homeDistY * HOME_PULL;
      }

      // Bounce off other bots (billiard ball physics)
      let hadCollision = false;
      for (const other of bots) {
        if (other === bot) continue;

        const dx = bot.x - other.x;
        const dy = bot.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = other.agent.type === 'main' ? CONDUCTOR_EXCLUSION_DISTANCE : MIN_BOT_DISTANCE;

        if (dist < minDist && dist > 0) {
          hadCollision = true;

          // Normalize collision vector
          const nx = dx / dist;
          const ny = dy / dist;

          // Relative velocity
          const dvx = bot.vx - (other.vx || 0);
          const dvy = bot.vy - (other.vy || 0);

          // Relative velocity along collision normal
          const dvn = dvx * nx + dvy * ny;

          // Only bounce if moving towards each other
          if (dvn < 0) {
            // Bounce impulse (elastic collision)
            const impulse = -dvn * BOUNCE * 1.5;

            bot.vx += impulse * nx;
            bot.vy += impulse * ny;

            // Push the other bot too (if not conductor)
            if (other.agent.type !== 'main') {
              other.vx -= impulse * nx * 0.8;
              other.vy -= impulse * ny * 0.8;
            }
          }

          // Separate overlapping bots (prevent sticking)
          const overlap = minDist - dist;
          const separationX = nx * overlap * 0.5;
          const separationY = ny * overlap * 0.5;
          bot.x += separationX;
          bot.y += separationY;
          if (other.agent.type !== 'main') {
            other.x -= separationX * 0.5;
            other.y -= separationY * 0.5;
          }
        }
      }

      // Track restlessness - relocate desk if can't settle near home
      // Measures: distance from home + velocity (being pushed around or wandering far)
      if (!bot.isRelocating) {
        const distFromHome = Math.sqrt(
          (bot.x - bot.homeX) ** 2 + (bot.y - bot.homeY) ** 2
        );
        const velocity = Math.sqrt(bot.vx ** 2 + bot.vy ** 2);

        // Restless if far from home OR moving fast (being bounced around)
        const isRestless = distFromHome > 40 || velocity > 0.3;

        if (isRestless) {
          bot.bounceTimer += 16; // ~16ms per frame
          if (bot.bounceTimer > bot.bounceThreshold) {
            // Frustrated! Start pushing desk to a new position
            const newDesk = findOpenSpaceForDesk();
            const newDeskKey = `desk${Object.keys(DESK_POSITIONS).length}`;
            DESK_POSITIONS[newDeskKey] = newDesk;
            bot.relocateTargetX = newDesk.xPct * containerWidth;
            bot.relocateTargetY = newDesk.yPct * containerHeight;
            bot.assignedDesk = newDeskKey;
            bot.isRelocating = true;
            bot.bounceTimer = 0; // Reset frustration
            bot.bounceThreshold = Math.max(5000, randomGaussian(10000, 5000)); // New patience for next time
          }
        } else {
          // Settled near home - gradually cool down frustration
          bot.bounceTimer = Math.max(0, bot.bounceTimer - 32); // Cool down 2x faster than buildup
        }
      }

      // Apply velocity with friction
      bot.vx *= FRICTION;
      bot.vy *= FRICTION;

      // Clamp max velocity
      const maxVel = 0.7; // Slower, calmer walking speed
      const vel = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
      if (vel > maxVel) {
        bot.vx = (bot.vx / vel) * maxVel;
        bot.vy = (bot.vy / vel) * maxVel;
      }

      // Update position
      bot.x += bot.vx;
      bot.y += bot.vy;

      // Bounce off walls
      if (bot.x < minX) {
        bot.x = minX;
        bot.vx = Math.abs(bot.vx) * BOUNCE;
      }
      if (bot.x > maxX) {
        bot.x = maxX;
        bot.vx = -Math.abs(bot.vx) * BOUNCE;
      }
      if (bot.y < minY) {
        bot.y = minY;
        bot.vy = Math.abs(bot.vy) * BOUNCE;
      }
      if (bot.y > maxY) {
        bot.y = maxY;
        bot.vy = -Math.abs(bot.vy) * BOUNCE;
      }

      // Update facing direction based on velocity (with hysteresis to reduce flipping)
      // Only flip direction if moving strongly the opposite way
      const flipThreshold = 0.6; // Higher threshold = less frequent direction changes
      if (bot.direction === 'right' && bot.vx < -flipThreshold) {
        bot.direction = 'left';
      } else if (bot.direction === 'left' && bot.vx > flipThreshold) {
        bot.direction = 'right';
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

  <!-- Desk furniture with role-specific items -->
  {#each Object.entries(DESK_POSITIONS) as [deskKey, pos]}
    {@const deskX = pos.xPct * containerWidth}
    {@const deskY = pos.yPct * containerHeight}
    {@const occupyingBot = bots.find(b => b.assignedDesk === deskKey)}
    {@const isOccupied = !!occupyingBot}
    {@const isSpawning = occupyingBot?.spawning}
    {@const botRole = occupyingBot ? getRoleCategory(occupyingBot.agent.name) : null}
    {#if deskKey !== 'conductor'}
      <!-- Desk surface -->
      <div
        class="absolute pointer-events-none transition-all duration-300"
        style="
          left: {deskX - 8}px;
          top: {deskY + BOT_SIZE + 2}px;
          z-index: 2;
        "
      >
        <svg width="72" height="32" viewBox="0 0 72 32">
          <!-- Desk top -->
          <rect x="2" y="0" width="68" height="16" rx="3" fill="#5c4033" />
          <rect x="4" y="2" width="64" height="10" rx="2" fill="#6b4c35" />
          <!-- Desk legs -->
          <rect x="8" y="14" width="6" height="16" fill="#4a3728" />
          <rect x="58" y="14" width="6" height="16" fill="#4a3728" />

          <!-- Desk items: generic when empty, role-specific when occupied -->
          {#if !isOccupied || isSpawning}
            <!-- Generic empty desk: coffee and notepad -->
            <rect x="12" y="3" width="14" height="10" fill="#e5e7eb" rx="1" />
            <line x1="14" y1="5" x2="24" y2="5" stroke="#a3a3a3" stroke-width="0.5" />
            <line x1="14" y1="7" x2="22" y2="7" stroke="#a3a3a3" stroke-width="0.5" />
            <ellipse cx="54" cy="7" rx="5" ry="4" fill="#d1d5db" />
            <path d="M 58 5 Q 61 7 58 9" stroke="#9ca3af" stroke-width="1" fill="none" />
          {:else}
            <!-- Occupied desk - show the bot's tool placed on desk -->
            {#if botRole === 'architect'}
              <path d="M 50 4 L 55 12 L 60 4 Z" fill="none" stroke="#60a5fa" stroke-width="1.5" />
            {:else if botRole === 'executor'}
              <!-- Pipe wrench on desk -->
              <rect x="48" y="6" width="4" height="8" rx="1" fill="#991b1b" /> <!-- Red handle -->
              <rect x="49" y="8" width="2" height="3" fill="#fbbf24" /> <!-- Gold grip -->
              <rect x="47" y="2" width="6" height="5" rx="1" fill="#6b7280" /> <!-- Jaw -->
            {:else if botRole === 'explore' || botRole === 'explorer'}
              <circle cx="52" cy="6" r="4" fill="none" stroke="#a78bfa" stroke-width="1.5" />
              <line x1="55" y1="9" x2="59" y2="13" stroke="#a78bfa" stroke-width="2" />
            {:else if botRole === 'designer'}
              <rect x="50" y="3" width="2" height="9" fill="#92400e" />
              <ellipse cx="51" cy="2" rx="4" ry="3" fill="#f472b6" />
            {:else if botRole === 'researcher'}
              <rect x="46" y="4" width="10" height="9" rx="1" fill="#3b82f6" />
              <line x1="51" y1="4" x2="51" y2="13" stroke="#1e40af" stroke-width="0.5" />
            {:else if botRole === 'writer'}
              <rect x="48" y="3" width="3" height="10" fill="#fbbf24" />
              <polygon points="48,13 49.5,16 51,13" fill="#f97316" />
            {:else if botRole === 'tester'}
              <line x1="48" y1="12" x2="54" y2="2" stroke="#92400e" stroke-width="1.5" />
              <ellipse cx="54" cy="2" rx="5" ry="4" fill="none" stroke="#a3e635" stroke-width="1.5" />
            {:else if botRole === 'background'}
              <!-- Terminal on desk for background tasks -->
              <rect x="46" y="3" width="12" height="9" rx="1" fill="#1f2937" stroke="#10b981" stroke-width="0.5" />
              <text x="52" y="9" font-size="5" fill="#10b981" text-anchor="middle" font-family="monospace">&gt;_</text>
            {:else}
              <!-- Default: pipe wrench on desk -->
              <rect x="48" y="6" width="4" height="8" rx="1" fill="#991b1b" />
              <rect x="49" y="8" width="2" height="3" fill="#fbbf24" />
              <rect x="47" y="2" width="6" height="5" rx="1" fill="#6b7280" />
            {/if}
            <!-- Coffee mug (always present when working) -->
            <ellipse cx="20" cy="7" rx="4" ry="3" fill="#6b7280" />
            <ellipse cx="20" cy="6" rx="3" ry="2" fill="#92400e" />
          {/if}
        </svg>
      </div>

      <!-- Items falling off animation when bot takes desk -->
      {#if isSpawning && occupyingBot}
        {@const fallProgress = occupyingBot.conjureProgress}
        <div
          class="absolute pointer-events-none"
          style="
            left: {deskX + 20}px;
            top: {deskY + BOT_SIZE + 8 + fallProgress * 40}px;
            opacity: {1 - fallProgress};
            transform: rotate({fallProgress * 45}deg);
            z-index: 1;
          "
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <!-- Falling paper/item -->
            <rect x="2" y="2" width="12" height="12" fill="#e5e7eb" rx="1" transform="rotate(15 8 8)" />
          </svg>
        </div>
      {/if}
    {:else}
      <!-- Conductor gets a podium instead of a desk -->
      <div
        class="absolute pointer-events-none"
        style="
          left: {deskX - 5}px;
          top: {deskY + BOT_SIZE}px;
          z-index: 2;
        "
      >
        <svg width="66" height="24" viewBox="0 0 66 24">
          <!-- Podium -->
          <path d="M 8 2 L 58 2 L 54 22 L 12 22 Z" fill="#1e1b4b" />
          <path d="M 10 4 L 56 4 L 54 8 L 12 8 Z" fill="#312e81" />
          <!-- Baton holder -->
          <circle cx="33" cy="6" r="3" fill="#4338ca" />
        </svg>
      </div>
    {/if}
  {/each}

  <!-- Conjuring effects layer (behind bots) - ambient effects during spawn -->
  {#each bots as bot (bot.agent.id)}
    {#if bot.spawning && bot.agent.type === 'subagent'}
      {@const effectIntensity = Math.max(0, 1 - bot.conjureProgress * 1.5)}
      {@const roleAnnounceOpacity = bot.conjureProgress < 0.5 ? bot.conjureProgress * 2 : Math.max(0, 1 - (bot.conjureProgress - 0.5) * 2)}
      <div
        class="absolute pointer-events-none"
        style="left: {bot.x + BOT_SIZE/2}px; top: {bot.y + BOT_SIZE/2}px; z-index: 500;"
      >
        {#if bot.conjureAnimation === 'classic'}
          <!-- Classic assembly - gentle glow -->
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-cyan-400/20"
            style="opacity: {effectIntensity}; filter: blur(12px);"
          />
        {:else if bot.conjureAnimation === 'teleport'}
          <!-- Magic teleport - sparkles -->
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
        {:else if bot.conjureAnimation === 'factory'}
          <!-- Factory assembly - mechanical grid -->
          <div class="absolute -translate-x-1/2 -translate-y-1/2">
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-slate-400/50"
              style="opacity: {effectIntensity};"
            />
            <div
              class="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 border-2 border-slate-400/50"
              style="opacity: {effectIntensity}; transform: translate(-50%, -50%) rotate(45deg);"
            />
          </div>
        {:else if bot.conjureAnimation === 'inflate'}
          <!-- Inflate - poof cloud -->
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
        {:else if bot.conjureAnimation === 'pixel'}
          <!-- Pixel scan - scanlines -->
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent"
            style="
              opacity: {effectIntensity};
              transform: translate(-50%, {-40 + bot.conjureProgress * 80}px);
            "
          />
        {:else if bot.conjureAnimation === 'spring'}
          <!-- Spring surprise - bounce indicator -->
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-purple-400/30"
            style="
              opacity: {effectIntensity};
              filter: blur(8px);
              transform: translate(-50%, -50%) scale({1 + Math.sin(bot.conjureProgress * Math.PI * 4) * 0.3});
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
  <!-- DESIGN: NOTHING SHOULD OVERLAP - bubbles positioned to avoid each other -->
  <!-- DESIGN: Top-row bots get bubbles below, bottom-row bots get bubbles above -->
  <!-- DESIGN: Bubbles must stay inside container boundaries -->
  {#each bots as bot, botIndex (bot.agent.id + '-bubble')}
    {#if bot.showBubble && bot.bubbleText && bot.scale > 0.5}
      {@const isConductor = bot.agent.type === 'main'}
      {@const displayText = truncateForDisplay(bot.bubbleText, isConductor ? bubbleCharLimit + 100 : bubbleCharLimit)}
      {@const needsMarquee = !bubbleAllowWrap && !isConductor && displayText.length > marqueeThreshold}
      {@const botCenterX = bot.x + BOT_SIZE / 2}
      {@const botCenterY = bot.y + BOT_SIZE / 2}
      {@const conductorBubbleWidth = Math.min(400, containerWidth - 40)}
      {@const bubbleWidth = isConductor ? conductorBubbleWidth : Math.min(bubbleMaxWidth, containerWidth - 20)}
      {@const bubbleLeft = Math.max(10, Math.min(containerWidth - bubbleWidth - 10, botCenterX - bubbleWidth / 2))}
      {@const tailOffset = botCenterX - bubbleLeft - bubbleWidth / 2}
      {@const estimatedBubbleHeight = isConductor ? 60 : 32}
      <!-- Position bubble based on bot's vertical position: top-half bots get bubble below, bottom-half above -->
      <!-- Conductor always gets bubble below -->
      {@const isTopHalf = !isConductor && botCenterY < containerHeight * 0.35}
      {@const bubbleBelow = isConductor || isTopHalf}
      {@const rawBubbleTop = bubbleBelow
        ? bot.y + BOT_SIZE + 12
        : bot.y - estimatedBubbleHeight - 12}
      {@const clampedBubbleTop = Math.max(5, Math.min(containerHeight - estimatedBubbleHeight - 5, rawBubbleTop))}
      <div
        class="absolute px-3 py-1.5 rounded-lg {isConductor ? 'text-sm' : bubbleTextClass}
               {isConductor ? 'backdrop-blur-xl' : 'backdrop-blur'} shadow-lg overflow-hidden pointer-events-none
               {bot.agent.status === 'blocked'
                 ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                 : bot.agent.status === 'complete'
                   ? 'bg-green-500/30 text-green-200 border border-green-500/40'
                   : 'bg-white/10 text-white/90 border border-white/20'}"
        style="
          left: {bubbleLeft}px;
          top: {clampedBubbleTop}px;
          width: {bubbleWidth}px;
          max-height: {containerHeight - clampedBubbleTop - 10}px;
          z-index: {1000 + (bubbleBelow ? Math.floor(bot.y) + 100 : Math.floor(containerHeight - bot.y))};
        "
      >
        <div
          class="{isConductor || bubbleAllowWrap ? 'whitespace-normal' : 'whitespace-nowrap'} {needsMarquee ? 'animate-marquee' : ''}"
          style={needsMarquee ? `--marquee-offset: ${bubbleWidth - 40}px` : ''}
        >
          {displayText}
        </div>
        <!-- Bubble tail - points toward bot -->
        {#if bubbleBelow}
          <!-- Tail points UP (at top of bubble, pointing to bot above) -->
          <div
            class="absolute bottom-full w-0 h-0
                   border-l-4 border-r-4 border-b-4 border-transparent
                   {bot.agent.status === 'blocked'
                     ? 'border-b-amber-500/40'
                     : bot.agent.status === 'complete'
                       ? 'border-b-green-500/40'
                       : 'border-b-white/20'}"
            style="left: calc(50% + {Math.max(-bubbleWidth/2 + 15, Math.min(bubbleWidth/2 - 15, tailOffset))}px); transform: translateX(-50%);"
          />
        {:else}
          <!-- Tail points DOWN (at bottom of bubble, pointing to bot below) -->
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
        {/if}
      </div>
    {/if}
  {/each}

  <!-- Bots -->
  {#each bots as bot (bot.agent.id)}
    <div
      class="absolute transition-transform duration-100
             {bot.reaction === 'wave' ? 'animate-bot-wave' : ''}
             {bot.reaction === 'bounce' ? 'animate-bot-bounce' : ''}
             {bot.reaction === 'spin' ? 'animate-bot-spin' : ''}
             {bot.reaction === 'giggle' ? 'animate-bot-giggle' : ''}
             {bot.reaction === 'flip' ? 'animate-bot-flip' : ''}
             {bot.reaction === 'somersault' ? 'animate-bot-somersault' : ''}"
      style="
        left: {bot.x}px;
        top: {bot.y}px;
        transform: scaleX({bot.direction === 'left' ? -1 : 1}) scale({bot.scale});
        z-index: {Math.floor(bot.y)};
      "
      on:click|stopPropagation={() => handleBotClick(bot.agent.id)}
    >
      <!-- Bot using CuteBot component -->
      <div style="width: {BOT_SIZE}px; height: {BOT_SIZE}px;">
        <CuteBot
          status={bot.agent.status}
          role={getRole(bot.agent)}
          size="lg"
          conjuring={bot.spawning}
          conjureAnimation={bot.conjureAnimation}
          conjureProgress={bot.conjureProgress}
        />
      </div>

      <!-- Name tag with spawn animation -->
      <div
        class="absolute top-full left-1/2 mt-1 text-xs whitespace-nowrap text-center transition-all duration-500"
        class:text-cyan-300={bot.spawning}
        class:text-gray-400={!bot.spawning}
        class:text-amber-300={bot.isRelocating}
        class:font-medium={bot.spawning || bot.isRelocating}
        class:scale-110={bot.spawning}
        style="transform: translateX(-50%) scaleX({bot.direction === 'left' ? -1 : 1})"
      >
        {bot.agent.type === 'main' ? 'conductor' : cleanAgentName(bot.agent.name) || 'worker'}
        {#if bot.spawning}
          <span class="animate-pulse"> ✨</span>
        {/if}
        {#if bot.isRelocating}
          <span> 🪑💨</span>
        {/if}
      </div>

      <!-- Emoji reaction bubble -->
      {#if bot.reaction === 'emoji' && bot.reactionEmoji}
        <div
          class="absolute left-1/2 -top-4 text-2xl animate-emoji-float pointer-events-none"
          style="transform: translateX(-50%) scaleX({bot.direction === 'left' ? -1 : 1})"
        >
          {bot.reactionEmoji}
        </div>
      {/if}
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

  /* Bot click reaction animations */
  @keyframes bot-wave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    50% { transform: rotate(15deg); }
    75% { transform: rotate(-10deg); }
  }

  @keyframes bot-bounce {
    0%, 100% { transform: translateY(0); }
    25% { transform: translateY(-12px); }
    50% { transform: translateY(-6px); }
    75% { transform: translateY(-10px); }
  }

  @keyframes bot-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes bot-giggle {
    0%, 100% { transform: translateX(0) rotate(0deg); }
    20% { transform: translateX(-3px) rotate(-2deg); }
    40% { transform: translateX(3px) rotate(2deg); }
    60% { transform: translateX(-2px) rotate(-1deg); }
    80% { transform: translateX(2px) rotate(1deg); }
  }

  @keyframes bot-flip {
    0% { transform: perspective(400px) rotateY(0deg); }
    100% { transform: perspective(400px) rotateY(360deg); }
  }

  @keyframes bot-somersault {
    0% { transform: perspective(400px) rotateX(0deg); }
    100% { transform: perspective(400px) rotateX(360deg); }
  }

  @keyframes emoji-float {
    0% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(1.3); }
  }

  .animate-bot-wave {
    animation: bot-wave 0.5s ease-in-out;
  }

  .animate-bot-bounce {
    animation: bot-bounce 0.5s ease-out;
  }

  .animate-bot-spin {
    animation: bot-spin 0.5s ease-in-out;
  }

  .animate-bot-giggle {
    animation: bot-giggle 0.4s ease-in-out;
  }

  .animate-bot-flip {
    animation: bot-flip 0.6s ease-in-out;
  }

  .animate-bot-somersault {
    animation: bot-somersault 0.6s ease-in-out;
  }

  .animate-emoji-float {
    animation: emoji-float 0.6s ease-out forwards;
  }
</style>
