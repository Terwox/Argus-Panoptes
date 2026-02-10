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
  import {
    CONDUCTOR_POSITION,
    CONJURE_ANIMATIONS,
    BOT_REACTIONS,
    HAPPY_EMOJIS,
    CLUSTERING,
    type ConjureAnimation,
    type BotReaction,
  } from '../lib/cuteWorldConfig';
  import { overloadMode, prefersReducedMotion } from '../stores/state';
  import { selectBiome, getBiomeBackgroundSVG, getCurrentTimeOfDay, getTimeOverlayColor, getWeatherForStatus, type BiomeDef, type WeatherState } from '../lib/biomes';
  import { AmbientManager } from '../lib/ambientEffects';
  import { InteractionQueue, detectInteraction, getInteractionTransform, getInteractionOverlay } from '../lib/interactions';
  import { getBubbleStyle, getEffectiveBubbleStyleId } from '../lib/bubbleStyles';

  export let agents: Agent[];
  export let height: number = 280;
  export let fillHeight: boolean = false; // If true, fill parent container
  export let projectPath: string = ''; // Project path for opening in VS Code
  export let compact: boolean = false; // Compact mode: smaller bots, tighter layout

  // Biome system - deterministic per project
  $: biome = selectBiome(projectPath);
  $: biomeBackgroundSVG = containerWidth > 0 && containerHeight > 0
    ? getBiomeBackgroundSVG(biome, containerWidth, containerHeight)
    : '';
  $: timeOfDay = getCurrentTimeOfDay();
  $: timeOverlay = getTimeOverlayColor(timeOfDay);

  // Weather from project status
  $: primaryStatus = agents.length > 0 ? agents[0].status : 'idle';
  $: weather = getWeatherForStatus(primaryStatus, biome) as WeatherState;
  $: isCalm = agents.every(a => a.status === 'complete' || a.status === 'idle' || a.status === 'sleeping');

  // Ambient effects system
  const ambientManager = new AmbientManager();
  let ambientSVG = '';

  // Interaction choreography
  const interactionQueue = new InteractionQueue();
  let _prevAgentStatuses = new Map<string, string>();
  let interactionOverlays: { x: number; y: number; emoji: string; opacity: number; scale: number }[] = [];
  let interactionParticleItems: { x: number; y: number; emoji: string; opacity: number; scale: number }[] = [];

  // Track last animation used for no-repeat logic
  let lastConjureAnimation: ConjureAnimation | null = null;

  function getRandomReaction(): BotReaction {
    return BOT_REACTIONS[Math.floor(Math.random() * BOT_REACTIONS.length)];
  }

  function getRandomEmoji(): string {
    return HAPPY_EMOJIS[Math.floor(Math.random() * HAPPY_EMOJIS.length)];
  }

  function handleBotClick(botId: string) {
    const botIndex = bots.findIndex(b => b.agent.id === botId);
    if (botIndex === -1) return;

    const bot = bots[botIndex];

    // ALWAYS trigger bobble animation
    bot.bobble = true;
    setTimeout(() => {
      if (bots[botIndex]) {
        bots[botIndex].bobble = false;
        bots = bots;
      }
    }, 400); // Match bobble animation duration

    // If blocked, open VS Code
    if (bot.agent.status === 'blocked' && projectPath) {
      const vscodeUri = `vscode://file/${projectPath}`;
      window.open(vscodeUri, '_blank');
    }

    // Force show bubble temporarily if it was suppressed (in decision mode but not blocked)
    if (!bot.forceShowBubble && decisionMode && bot.agent.status !== 'blocked') {
      bot.forceShowBubble = true;
      bots = bots;
      // Auto-hide after 5 seconds
      setTimeout(() => {
        if (bots[botIndex]) {
          bots[botIndex].forceShowBubble = false;
          bots = bots;
        }
      }, 5000);
    }

    // Don't react if already reacting
    if (bot.reaction) return;

    const reaction = getRandomReaction();
    const emoji = reaction === 'emoji' ? getRandomEmoji() : '';

    bot.reaction = reaction;
    bot.reactionEmoji = emoji;
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

  // Tired threshold: 30+ minutes of working time
  const TIRED_THRESHOLD = 30 * 60 * 1000;
  function isBotTired(agent: Agent): boolean {
    if (agent.status === 'complete' || !agent.workingTime) return false;
    return agent.workingTime >= TIRED_THRESHOLD;
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
    bobble: boolean; // Bobble animation trigger
    forceShowBubble: boolean; // Temporarily force bubble visible when clicked
    previousBubbleText: string; // Track previous text for floating-away animation
    previousStatus: string; // Track previous status to detect transitions
  }

  interface FloatingThought {
    id: number;
    text: string;
    x: number; // Bubble left position when thought was replaced
    y: number; // Bubble top position when thought was replaced
    createdAt: number;
    width: number; // Bubble width for text sizing
  }

  interface CelebrationParticle {
    id: number;
    x: number; // Starting X position (bot center)
    y: number; // Starting Y position (bot center)
    angle: number; // Direction to float (in radians)
    emoji: string; // ⭐ or ✨
  }

  let bots: BotState[] = [];
  let floatingThoughts: FloatingThought[] = [];
  let floatingThoughtIdCounter = 0;
  let celebrationParticles: CelebrationParticle[] = [];
  let celebrationParticleIdCounter = 0;
  let containerWidth = 300;
  let containerHeight = height;
  let animationFrame: number;
  let frameCount = 0;
  let hoveredBubbleId: string | null = null; // Track which bubble is being hovered
  let hoverTimeout: number | null = null; // Timeout for delayed unhover

  const BOT_SIZE = 56; // Bigger bots
  // DESIGN PRINCIPLE: NO VISIBLE TIMERS - no "47s ago" anxiety counters
  // DESIGN PRINCIPLE: Bubbles always visible - toggling is distracting
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Bot distance must be large enough that speech bubbles don't collide
  const MIN_BOT_DISTANCE = 90; // Reduced to allow closer spacing

  // Conductor positions computed from desk positions (reactive)
  // Multiple conductors now supported - each has their own position
  $: conductorX = DESK_POSITIONS.conductor_0.xPct * containerWidth;
  $: conductorY = DESK_POSITIONS.conductor_0.yPct * containerHeight;
  // Exclusion zone around ALL conductor positions - subagents shouldn't spawn too close
  const CONDUCTOR_EXCLUSION_DISTANCE = 100;

  // MULTIPLE CONDUCTORS: Support multiple Claude Code sessions in same project
  // Each conductor gets a staggered horizontal position
  const CONDUCTOR_POSITIONS = [
    { xPct: CONDUCTOR_POSITION.X_PCT, yPct: CONDUCTOR_POSITION.Y_PCT },         // First: 10%
    { xPct: CONDUCTOR_POSITION.X_PCT + 0.18, yPct: CONDUCTOR_POSITION.Y_PCT },   // Second: 28%
    { xPct: CONDUCTOR_POSITION.X_PCT + 0.36, yPct: CONDUCTOR_POSITION.Y_PCT },   // Third: 46%
  ];
  const MAX_CONDUCTORS = CONDUCTOR_POSITIONS.length;

  // Track which conductor positions are taken (by sessionId)
  let conductorAssignments: Map<string, number> = new Map(); // agentId -> conductor index

  // EXPERIMENT: Organic desk building - bots find open space and build desks there
  // Conductors get fixed positions; subagents find their own spot
  const BASE_DESK_POSITIONS: Record<string, { xPct: number; yPct: number }> = {
    // First conductor position from config
    conductor_0: CONDUCTOR_POSITIONS[0],
    conductor_1: CONDUCTOR_POSITIONS[1],
    conductor_2: CONDUCTOR_POSITIONS[2],
  };

  // Dynamic desk positions - bots add their own desks when they spawn
  let DESK_POSITIONS: Record<string, { xPct: number; yPct: number }> = { ...BASE_DESK_POSITIONS };

  // Find open space for a new desk (avoiding existing desks and bots)
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Desk spacing must guarantee MIN_BOT_DISTANCE in pixels, not just percentages
  function findOpenSpaceForDesk(): { xPct: number; yPct: number } {
    const minXPct = 0.12; // Closer to edges
    const maxXPct = 0.92;
    const minYPct = 0.05;
    const maxYPct = 0.75; // Use more vertical space

    // CRITICAL: Calculate minimum distance as percentage based on container size
    // Must ensure MIN_BOT_DISTANCE (90px) + BOT_SIZE (56px) spacing in pixels
    // Use the smaller dimension to be conservative
    const minPixelDistance = MIN_BOT_DISTANCE + BOT_SIZE + 10; // Extra 10px buffer
    const effectiveContainerSize = Math.min(containerWidth, containerHeight);
    const minDistPct = Math.max(0.15, minPixelDistance / effectiveContainerSize);
    const conductorExclusionPct = Math.max(0.20, (CONDUCTOR_EXCLUSION_DISTANCE + BOT_SIZE) / effectiveContainerSize);

    // Also check against CURRENT bot positions, not just desk positions
    // This prevents spawning on top of wandering bots
    const botPositionsPct = bots
      .filter(b => b.scale > 0.5) // Only consider visible bots
      .map(b => ({
        xPct: b.x / containerWidth,
        yPct: b.y / containerHeight,
        isMain: b.agent.type === 'main'
      }));

    // Try random positions, check for overlap
    for (let attempt = 0; attempt < 50; attempt++) {
      const xPct = minXPct + Math.random() * (maxXPct - minXPct);
      const yPct = minYPct + Math.random() * (maxYPct - minYPct);

      let hasOverlap = false;

      // Check against existing desks
      for (const [deskKey, desk] of Object.entries(DESK_POSITIONS)) {
        const dx = desk.xPct - xPct;
        const dy = desk.yPct - yPct;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Use larger exclusion distance for ALL conductor positions
        const minDist = deskKey.startsWith('conductor_') ? conductorExclusionPct : minDistPct;
        if (dist < minDist) {
          hasOverlap = true;
          break;
        }
      }

      // Also check against current bot positions
      if (!hasOverlap) {
        for (const botPos of botPositionsPct) {
          const dx = botPos.xPct - xPct;
          const dy = botPos.yPct - yPct;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = botPos.isMain ? conductorExclusionPct : minDistPct;
          if (dist < minDist) {
            hasOverlap = true;
            break;
          }
        }
      }

      if (!hasOverlap) {
        return { xPct, yPct };
      }
    }

    // Fallback: grid position based on desk count (offset past conductor slots)
    // Use spacing that guarantees MIN_BOT_DISTANCE
    const gridSpacingPct = Math.max(0.15, minDistPct);
    const subagentDeskCount = Object.keys(DESK_POSITIONS).filter(k => !k.startsWith('conductor_')).length;
    const col = subagentDeskCount % 3;
    const row = Math.floor(subagentDeskCount / 3);
    return {
      xPct: Math.min(0.55 + col * gridSpacingPct, maxXPct), // Start further right to avoid conductor zone
      yPct: Math.min(0.15 + row * gridSpacingPct, maxYPct),
    };
  }

  // Decision Mode: when any agent is blocked, enter focused mode
  $: decisionMode = bots.some(b => b.agent.status === 'blocked');
  $: blockedAgents = bots.filter(b => b.agent.status === 'blocked');
  $: primaryBlockedAgent = blockedAgents[0];
  $: blockedQueueCount = blockedAgents.length;

  // === COLLABORATION CLUSTERING ===
  // Detect which subagents are actively collaborating with their parent conductor.
  // A subagent "clusters" when:
  //   1. It has a parentId matching a working conductor
  //   2. The conductor is actively delegating (delegatingTo is set), OR
  //   3. The subagent is working (actively receiving/processing delegated work)
  // Returns a Map of subagent bot index -> parent conductor bot index
  interface ClusterLink {
    subagentIdx: number;
    conductorIdx: number;
    conductorId: string;
  }

  $: clusterLinks = (() => {
    const links: ClusterLink[] = [];
    // Build a lookup of conductor bots by agent id
    const conductorMap = new Map<string, number>(); // agentId -> bot index
    for (let i = 0; i < bots.length; i++) {
      if (bots[i].agent.type === 'main' && bots[i].agent.status === 'working') {
        conductorMap.set(bots[i].agent.id, i);
      }
    }

    for (let i = 0; i < bots.length; i++) {
      const bot = bots[i];
      if (bot.agent.type !== 'subagent') continue;
      if (bot.agent.status !== 'working') continue;
      if (!bot.agent.parentId) continue;

      const parentIdx = conductorMap.get(bot.agent.parentId);
      if (parentIdx === undefined) continue;

      const conductor = bots[parentIdx];
      // Cluster when conductor is delegating or subagent is actively working
      // (subagent existence during "working" status implies active collaboration)
      if (conductor.agent.delegatingTo || bot.agent.status === 'working') {
        links.push({
          subagentIdx: i,
          conductorIdx: parentIdx,
          conductorId: bot.agent.parentId,
        });
      }
    }
    return links;
  })();

  // Quick lookup: is this bot index part of a cluster?
  $: clusteringBotIndices = new Set(clusterLinks.flatMap(l => [l.subagentIdx, l.conductorIdx]));

  // For a given subagent bot index, get its conductor bot index (or -1)
  function getClusterConductorIdx(botIdx: number): number {
    const link = clusterLinks.find(l => l.subagentIdx === botIdx);
    return link ? link.conductorIdx : -1;
  }

  // Are two bots in the same cluster? (for softer collision)
  function areInSameCluster(idxA: number, idxB: number): boolean {
    for (const link of clusterLinks) {
      if ((link.subagentIdx === idxA && link.conductorIdx === idxB) ||
          (link.subagentIdx === idxB && link.conductorIdx === idxA)) {
        return true;
      }
      // Two subagents with the same conductor
      const otherLink = clusterLinks.find(l =>
        l.conductorId === link.conductorId &&
        ((l.subagentIdx === idxA && link.subagentIdx === idxB) ||
         (l.subagentIdx === idxB && link.subagentIdx === idxA))
      );
      if (otherLink) return true;
    }
    return false;
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

  // Decision mode expanded bubble settings
  $: decisionBubbleWidth = Math.min(600, containerWidth - 60);
  $: decisionBubbleHeight = 80; // Larger bubble for expanded text

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

  // Multiple conductors now supported - get first for backward compatibility
  $: mainAgent = agents.find(a => a.type === 'main');
  $: allMainAgents = agents.filter(a => a.type === 'main');

  // DEBUG: Log conductor count (multiple is now expected for multi-terminal support)
  $: {
    if (allMainAgents.length > MAX_CONDUCTORS) {
      console.log('[CuteWorld] Conductors exceeding visual slots:', allMainAgents.length, '/', MAX_CONDUCTORS);
    }
  }

  // Initialize/update bots when agents change
  $: {
    const existingIds = new Set(bots.map(b => b.agent.id));
    const newAgentIds = new Set(agents.map(a => a.id));

    // Remove departed agents (with fade out)
    bots = bots.filter(b => newAgentIds.has(b.agent.id));

    // Clean up conductor assignments for departed agents
    for (const [agentId, _] of conductorAssignments) {
      if (!newAgentIds.has(agentId)) {
        conductorAssignments.delete(agentId);
      }
    }

    // Count current conductors
    const currentConductorCount = bots.filter(b => b.agent.type === 'main').length;

    // Add new agents with conjuring animation
    for (const agent of agents) {
      if (!existingIds.has(agent.id)) {
        const isMain = agent.type === 'main';

        // MULTIPLE CONDUCTORS: Assign staggered positions instead of preventing duplicates
        let conductorIndex = -1;
        if (isMain) {
          // Find next available conductor slot
          const usedSlots = new Set(conductorAssignments.values());
          for (let i = 0; i < MAX_CONDUCTORS; i++) {
            if (!usedSlots.has(i)) {
              conductorIndex = i;
              conductorAssignments.set(agent.id, i);
              break;
            }
          }
          // If all slots taken, overflow to last position (will stack)
          if (conductorIndex === -1) {
            conductorIndex = MAX_CONDUCTORS - 1;
            conductorAssignments.set(agent.id, conductorIndex);
            console.log('[CuteWorld] Conductor overflow, stacking at position:', conductorIndex);
          }
        }

        const conjureAnim = getRandomConjureAnimation();

        // Find desk position - conductors use staggered positions, others find space
        const spawnPos = isMain
          ? getDeskPosition(`conductor_${conductorIndex}`)
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
          forceShowBubble: false, // Set to true when clicked to temporarily show bubble
          bubbleText: getTaskText(agent),
          scale: $prefersReducedMotion ? 1 : 0, // Instant appearance if reduced motion
          spawning: !$prefersReducedMotion, // Skip spawn animation if reduced motion
          conjureAnimation: conjureAnim,
          conjureProgress: $prefersReducedMotion ? 1 : 0, // Instant if reduced motion
          reaction: null,
          reactionEmoji: '',
          bounceTimer: 0,
          bounceThreshold: Math.max(5000, randomGaussian(10000, 5000)), // Personal patience level (min 5s)
          isRelocating: false,
          relocateTargetX: 0,
          relocateTargetY: 0,
          bobble: false,
          forceShowBubble: false,
          previousBubbleText: '',
          previousStatus: agent.status,
        }];
      } else {
        // Update existing bot's agent data and bubble text
        bots = bots.map(b => {
          if (b.agent.id === agent.id) {
            const newBubbleText = getTaskText(agent);
            const oldText = b.bubbleText;
            const oldStatus = b.previousStatus || b.agent.status;

            // Spawn floating thought if text meaningfully changed
            if (oldText && newBubbleText !== oldText && oldText !== 'Working...' && oldText !== 'Paused') {
              spawnFloatingThought(b, oldText);
            }

            // Spawn celebration particles if status changed to 'complete'
            if (oldStatus !== 'complete' && agent.status === 'complete') {
              spawnCelebrationParticles(b);
            }

            return {
              ...b,
              agent,
              // Ensure velocity exists (for bots from before physics update)
              vx: b.vx ?? 0,
              vy: b.vy ?? 0,
              wanderTimer: b.wanderTimer ?? 1000,
              bubbleText: newBubbleText,
              previousBubbleText: oldText,
              previousStatus: agent.status,
              showBubble: true, // Always visible
            };
          }
          return b;
        });
      }
    }

    // DEBUG: Log conductor count (multiple is now expected for multi-terminal support)
    const conductorBots = bots.filter(b => b.agent.type === 'main');
    if (conductorBots.length > MAX_CONDUCTORS && frameCount % 100 === 0) {
      console.log('[CuteWorld] Conductors exceeding max slots:', conductorBots.length, '/', MAX_CONDUCTORS);
    }

    // Detect interactions from agent state changes
    if (!$prefersReducedMotion) {
      const currentStates = agents.map(a => ({ id: a.id, status: a.status, parentId: a.parentId }));
      const conductorAgent = agents.find(a => a.type === 'main');
      const detected = detectInteraction(_prevAgentStatuses, currentStates, conductorAgent?.id);
      if (detected) {
        interactionQueue.enqueue(detected.type, detected.primaryId, detected.secondaryId);
      }
    }
    _prevAgentStatuses = new Map(agents.map(a => [a.id, a.status]));
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
  // Conductors get staggered positions (conductor_0, conductor_1, etc.)
  // Returns both position AND which desk was assigned (for responsive repositioning)
  function getDeskPosition(role: string): { x: number; y: number; deskKey: string } {
    // Conductors get their assigned staggered position
    if (role.startsWith('conductor_')) {
      const desk = DESK_POSITIONS[role];
      if (desk) {
        return { x: desk.xPct * containerWidth, y: desk.yPct * containerHeight, deskKey: role };
      }
      // Fallback to first conductor position
      const fallback = DESK_POSITIONS.conductor_0;
      return { x: fallback.xPct * containerWidth, y: fallback.yPct * containerHeight, deskKey: 'conductor_0' };
    }

    // ORGANIC: Find open space and create a new desk there
    const deskCount = Object.keys(DESK_POSITIONS).length;
    const deskKey = `desk${deskCount}`; // desk4, desk5, etc.

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

  // Check if text is truncated (for enabling hover-expand)
  function isTruncated(text: string, limit: number): boolean {
    return text.length > limit;
  }

  // Handle bubble hover with delayed unhover
  function handleBubbleEnter(botId: string) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    hoveredBubbleId = botId;
  }

  function handleBubbleLeave() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    hoverTimeout = window.setTimeout(() => {
      hoveredBubbleId = null;
      hoverTimeout = null;
    }, 200);
  }

  // Spawn a floating thought that drifts upward and fades when bubble text changes
  const MAX_FLOATING_THOUGHTS = 4;
  const FLOATING_THOUGHT_DURATION = 2500; // ms

  function spawnFloatingThought(bot: BotState, oldText: string): void {
    // Skip floating thoughts if reduced motion preferred
    if ($prefersReducedMotion) return;

    // Get current bubble position for this bot
    const computed = getBubblePosition(bot.agent.id);
    if (!computed) return;

    const bubbleWidth = computed.width;
    const botCenterX = bot.x + BOT_SIZE / 2;
    const idealLeft = botCenterX - bubbleWidth / 2;
    const bubbleLeft = Math.max(5, Math.min(containerWidth - bubbleWidth - 5, idealLeft));
    const bubbleTop = bot.y - 30; // Approximate bubble top position

    // Truncate to keep it glanceable
    const truncated = oldText.length > 50 ? oldText.slice(0, 47) + '...' : oldText;

    floatingThoughts = [
      ...floatingThoughts,
      {
        id: floatingThoughtIdCounter++,
        text: truncated,
        x: bubbleLeft,
        y: bubbleTop,
        createdAt: Date.now(),
        width: Math.min(bubbleWidth, 200),
      }
    ];

    // Cap max floating thoughts (remove oldest)
    if (floatingThoughts.length > MAX_FLOATING_THOUGHTS) {
      floatingThoughts = floatingThoughts.slice(-MAX_FLOATING_THOUGHTS);
    }

    // Auto-remove after animation completes
    const thoughtId = floatingThoughtIdCounter - 1;
    setTimeout(() => {
      floatingThoughts = floatingThoughts.filter(t => t.id !== thoughtId);
    }, FLOATING_THOUGHT_DURATION);
  }

  // Spawn celebration particles when agent completes
  const CELEBRATION_PARTICLE_COUNT = 10; // 8-12 particles
  const CELEBRATION_DURATION = 1000; // ms

  function spawnCelebrationParticles(bot: BotState): void {
    // Skip particles if reduced motion preferred
    if ($prefersReducedMotion) return;

    const botCenterX = bot.x + BOT_SIZE / 2;
    const botCenterY = bot.y + BOT_SIZE / 2;
    const emojis = ['⭐', '✨'];

    // Create particles in a circle around the bot, floating upward and outward
    const particles: CelebrationParticle[] = [];
    for (let i = 0; i < CELEBRATION_PARTICLE_COUNT; i++) {
      const angle = (i / CELEBRATION_PARTICLE_COUNT) * Math.PI * 2;
      particles.push({
        id: celebrationParticleIdCounter++,
        x: botCenterX,
        y: botCenterY,
        angle: angle,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
      });
    }

    celebrationParticles = [...celebrationParticles, ...particles];

    // Auto-remove after animation completes
    const particleIds = particles.map(p => p.id);
    setTimeout(() => {
      celebrationParticles = celebrationParticles.filter(p => !particleIds.includes(p.id));
    }, CELEBRATION_DURATION);
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

  // Format TODO progress for display (matches ProjectCard format)
  function formatTodoProgress(todos: Agent['todos']): string {
    if (!todos || todos.items.length === 0) return '';
    const { counts } = todos;
    const total = counts.pending + counts.inProgress + counts.completed;
    const inProgressItem = todos.items.find(t => t.status === 'in_progress');
    const currentTask = inProgressItem?.activeForm || inProgressItem?.content || '';
    if (counts.inProgress === 0 && counts.completed === 0) {
      return `${total} tasks planned`;
    }
    const remaining = counts.pending + counts.inProgress;
    const taskText = currentTask ? currentTask.slice(0, 50) : 'Working';
    return `${taskText}${currentTask.length > 50 ? '...' : ''} (${counts.completed} done, ${remaining} left)`;
  }

  function animate() {
    frameCount++;

    // Accessibility: skip physics when reduced motion is preferred
    // Bots snap to home positions, no wandering or conjure animations
    if ($prefersReducedMotion) {
      for (const bot of bots) {
        if (bot.spawning) {
          bot.spawning = false;
          bot.scale = 1;
          bot.conjureProgress = 1;
        }
        bot.x = bot.homeX;
        bot.y = bot.homeY;
        bot.vx = 0;
        bot.vy = 0;
      }
      bots = bots;
      animationFrame = requestAnimationFrame(animate);
      return;
    }

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
      const deskKey = bot.assignedDesk || (isMain ? 'conductor_0' : null);
      // Use desk position if found, otherwise use center-right as fallback
      const fallbackPos = { xPct: 0.6, yPct: 0.4 };
      const deskPos = (deskKey && DESK_POSITIONS[deskKey]) || fallbackPos;
      bot.homeX = deskPos.xPct * containerWidth;
      bot.homeY = deskPos.yPct * containerHeight;

      // Conductor positioning - MULTIPLE CONDUCTORS SUPPORTED
      if (isMain) {
        // Get this conductor's assigned position
        const conductorIdx = conductorAssignments.get(bot.agent.id) ?? 0;
        const conductorPos = CONDUCTOR_POSITIONS[conductorIdx] ?? CONDUCTOR_POSITIONS[0];
        bot.homeX = conductorPos.xPct * containerWidth;
        bot.homeY = conductorPos.yPct * containerHeight;

        // In decision mode when blocked, position conductor to align with bubble tail
        // Only the PRIMARY blocked conductor gets repositioned
        const isPrimaryBlocked = decisionMode && bot.agent.status === 'blocked' && bot === primaryBlockedAgent;
        if (isPrimaryBlocked) {
          // Position conductor centered horizontally and below the bubble
          const decisionBubbleLeft = (containerWidth - decisionBubbleWidth) / 2;
          const bubbleCenterX = decisionBubbleLeft + decisionBubbleWidth / 2;
          bot.x = bubbleCenterX - BOT_SIZE / 2;
          // Keep Y at normal podium position - bubble will be positioned above
          bot.y = bot.homeY;
        } else {
          // Normal podium position (staggered for multiple conductors)
          bot.x = bot.homeX;
          bot.y = bot.homeY;
        }
        continue;
      }

      // === WANDERING PHYSICS FOR SUBAGENTS ===
      const botIdx = bots.indexOf(bot); // Compute once for clustering checks below

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

        // === CLUSTERING: Pull collaborating subagents toward conductor ===
        const clusterConductorIdx = getClusterConductorIdx(botIdx);

        if (clusterConductorIdx >= 0) {
          // This bot is collaborating with a conductor - pull toward conductor
          const conductor = bots[clusterConductorIdx];
          const clusterTargetX = conductor.x + BOT_SIZE / 2;
          const clusterTargetY = conductor.y + BOT_SIZE / 2;

          // Calculate offset position within cluster radius (don't target conductor center directly)
          // Use bot's home position as a bias to spread bots around the conductor
          const angleToHome = Math.atan2(bot.homeY - conductor.y, bot.homeX - conductor.x);
          const offsetX = Math.cos(angleToHome) * CLUSTERING.CLUSTER_RADIUS * 0.6;
          const offsetY = Math.sin(angleToHome) * CLUSTERING.CLUSTER_RADIUS * 0.6;

          const targetX = clusterTargetX + offsetX;
          const targetY = clusterTargetY + offsetY;

          const clusterDistX = targetX - bot.x;
          const clusterDistY = targetY - bot.y;

          // Stronger pull toward cluster center than normal home pull
          bot.vx += clusterDistX * CLUSTERING.CLUSTER_PULL;
          bot.vy += clusterDistY * CLUSTERING.CLUSTER_PULL;
        } else {
          // Normal: Gentle pull towards home desk
          const homeDistX = bot.homeX - bot.x;
          const homeDistY = bot.homeY - bot.y;
          bot.vx += homeDistX * HOME_PULL;
          bot.vy += homeDistY * HOME_PULL;
        }
      }

      // Bounce off other bots (billiard ball physics)
      // CLUSTERING: Softer collisions between collaborating bots
      let hadCollision = false;
      for (let otherIdx = 0; otherIdx < bots.length; otherIdx++) {
        const other = bots[otherIdx];
        if (other === bot) continue;

        const dx = bot.x - other.x;
        const dy = bot.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // CLUSTERING: Use shorter distance for collaborating pairs
        const inCluster = areInSameCluster(botIdx, otherIdx);
        const baseMinDist = other.agent.type === 'main' ? CONDUCTOR_EXCLUSION_DISTANCE : MIN_BOT_DISTANCE;
        const minDist = inCluster
          ? CLUSTERING.MIN_CLUSTER_DISTANCE
          : baseMinDist;

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
            // CLUSTERING: Softer bounce for collaborating bots
            const repulsionFactor = inCluster ? CLUSTERING.CLUSTER_REPULSION_FACTOR : 1.0;
            const impulse = -dvn * BOUNCE * 1.5 * repulsionFactor;

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
          // CLUSTERING: Gentler separation for collaborating pairs
          const baseSeparation = other.agent.type === 'main' ? 1.0 : 0.5;
          const separationStrength = inCluster ? baseSeparation * CLUSTERING.CLUSTER_REPULSION_FACTOR : baseSeparation;
          const separationX = nx * overlap * separationStrength;
          const separationY = ny * overlap * separationStrength;
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
      // CLUSTERING: Skip restlessness when bot is clustering (intentionally far from home desk)
      const isClustering = getClusterConductorIdx(botIdx) >= 0;
      if (!bot.isRelocating && !isClustering) {
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

      // HARD CONSTRAINT: Force ALL non-conductor bots away from other bots
      // This runs EVERY frame to ensure no overlap
      // CLUSTERING: Use softer distance for collaborating pairs
      for (let otherIdx2 = 0; otherIdx2 < bots.length; otherIdx2++) {
        const otherBot = bots[otherIdx2];
        if (otherBot === bot) continue;
        const dx = bot.x - otherBot.x;
        const dy = bot.y - otherBot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inCluster2 = areInSameCluster(botIdx, otherIdx2);
        const minDist = inCluster2
          ? CLUSTERING.MIN_CLUSTER_DISTANCE
          : (otherBot.agent.type === 'main' ? CONDUCTOR_EXCLUSION_DISTANCE : MIN_BOT_DISTANCE);

        if (dist < minDist && dist > 0) {
          // Force this bot away
          const angle = Math.atan2(dy, dx);
          bot.x = otherBot.x + Math.cos(angle) * minDist;
          bot.y = otherBot.y + Math.sin(angle) * minDist;
        }
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

    // Update ambient effects (weather particles, creatures)
    if (containerWidth > 0 && containerHeight > 0 && frameCount % 2 === 0) {
      ambientSVG = ambientManager.update(biome, weather, containerWidth, containerHeight, isCalm);
    }

    // Update interaction choreography
    const interactionTick = interactionQueue.tick();
    if (interactionTick.interaction) {
      const primaryBot = bots.find(b => b.agent.id === interactionTick.interaction!.primaryBotId);
      const secondaryBot = interactionTick.interaction.secondaryBotId
        ? bots.find(b => b.agent.id === interactionTick.interaction!.secondaryBotId)
        : undefined;

      if (primaryBot) {
        interactionOverlays = getInteractionOverlay(
          interactionTick.interaction,
          interactionTick.progress,
          primaryBot.x + BOT_SIZE / 2, primaryBot.y + BOT_SIZE / 2,
          secondaryBot ? secondaryBot.x + BOT_SIZE / 2 : undefined,
          secondaryBot ? secondaryBot.y + BOT_SIZE / 2 : undefined,
        );
      }
    } else {
      interactionOverlays = [];
    }

    // Map interaction particles to screen positions
    interactionParticleItems = interactionTick.particles.map(p => {
      const pBot = bots.find(b => b.agent.id === interactionTick.interaction?.primaryBotId);
      return {
        x: (pBot?.x ?? containerWidth / 2) + BOT_SIZE / 2 + p.x * 10,
        y: (pBot?.y ?? containerHeight / 2) + BOT_SIZE / 2 + p.y * 10,
        emoji: p.emoji,
        opacity: p.opacity,
        scale: p.scale,
      };
    });

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

  // ============ BUBBLE COLLISION AVOIDANCE ============
  // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
  // Pre-compute bubble positions to avoid bots, names, and other bubbles

  interface BubbleRect {
    left: number;
    top: number;
    width: number;
    height: number;
    botId: string;
    bubbleBelow: boolean;
  }

  function rectsOverlap(a: BubbleRect, b: { left: number; top: number; width: number; height: number }): boolean {
    return !(a.left + a.width < b.left ||
             b.left + b.width < a.left ||
             a.top + a.height < b.top ||
             b.top + b.height < a.top);
  }

  // Compute all bubble positions with collision avoidance
  // DESIGN: NOTHING SHOULD OVERLAP - if we can't find room, don't show the bubble
  $: computedBubbles = (() => {
    const results: BubbleRect[] = [];
    const NAME_TAG_HEIGHT = 24;
    const NAME_TAG_WIDTH = 90;
    const BUBBLE_MARGIN = 14; // Clear separation between elements
    const TAIL_HEIGHT = 10;
    const COLLISION_PADDING = 8; // Extra padding for collision detection

    // MULTIPLE CONDUCTORS: Count how many conductors for zone allocation
    const conductorCount = bots.filter(b => b.agent.type === 'main').length;
    const hasMultipleConductors = conductorCount > 1;

    // OVERLOAD MODE: Show ALL bubbles! CHAOS!
    // DECISION MODE: Only show bubbles for blocked agents (or clicked bots temporarily)
    const visibleBots = $overloadMode
      ? bots // Show EVERYTHING
      : decisionMode
        ? bots.filter(b => b.agent.status === 'blocked' || b.forceShowBubble)
        : bots;

    // Build list of obstacles: all bots, their name tags, and desks
    const obstacles: { left: number; top: number; width: number; height: number }[] = [];
    const DESK_WIDTH = 50;
    const DESK_HEIGHT = 30;

    for (const bot of bots) {
      if (bot.scale < 0.5) continue;
      // Bot body (with padding)
      obstacles.push({
        left: bot.x - COLLISION_PADDING,
        top: bot.y - COLLISION_PADDING,
        width: BOT_SIZE + COLLISION_PADDING * 2,
        height: BOT_SIZE + COLLISION_PADDING * 2,
      });
      // Bot name tag (below bot, centered, with padding)
      obstacles.push({
        left: bot.x + BOT_SIZE / 2 - NAME_TAG_WIDTH / 2 - COLLISION_PADDING,
        top: bot.y + BOT_SIZE + 2,
        width: NAME_TAG_WIDTH + COLLISION_PADDING * 2,
        height: NAME_TAG_HEIGHT + COLLISION_PADDING,
      });
      // Desk below bot (if not conductor - conductor has podium)
      if (bot.agent.type !== 'main') {
        obstacles.push({
          left: bot.x - 8 - COLLISION_PADDING,
          top: bot.y + BOT_SIZE + NAME_TAG_HEIGHT + 4,
          width: DESK_WIDTH + COLLISION_PADDING * 2,
          height: DESK_HEIGHT + COLLISION_PADDING,
        });
      }
    }

    // Process conductor FIRST (always gets a bubble), then other bots by Y position (top to bottom)
    const sortedBots = [...visibleBots].sort((a, b) => {
      if (a.agent.type === 'main') return -1;
      if (b.agent.type === 'main') return 1;
      return a.y - b.y; // Top bots get priority
    });

    // Limit how many subagent bubbles we show to prevent crowding (unless in decision/overload mode)
    const MAX_SUBAGENT_BUBBLES = $overloadMode ? 999 : decisionMode ? 10 : 3;
    let subagentBubblesShown = 0;

    for (const bot of sortedBots) {
      if (!bot.showBubble || !bot.bubbleText || bot.scale < 0.5) continue;

      const isConductor = bot.agent.type === 'main';
      const isBlocked = bot.agent.status === 'blocked';
      const isPrimaryBlocked = decisionMode && isBlocked && bot === primaryBlockedAgent;

      // Skip subagent bubbles if we've shown enough
      if (!isConductor && !isPrimaryBlocked && subagentBubblesShown >= MAX_SUBAGENT_BUBBLES) continue;

      const botCenterX = bot.x + BOT_SIZE / 2;
      const botCenterY = bot.y + BOT_SIZE / 2;

      // MULTIPLE CONDUCTORS: Get this conductor's index for zone allocation
      const thisConductorIndex = isConductor ? (conductorAssignments.get(bot.agent.id) ?? 0) : 0;

      // SOLO CONDUCTOR: When there's only one conductor, give them a much larger bubble
      // since there's plenty of room in the card for it
      const isSoloConductor = isConductor && conductorCount === 1 && !isPrimaryBlocked;

      // Calculate bubble dimensions - expanded for primary blocked agent OR solo conductor
      // MULTIPLE CONDUCTORS: Reduce width when there are multiple conductors
      const singleConductorBubbleWidth = Math.min(400, containerWidth - 40);
      const multiConductorBubbleWidth = Math.min(280, (containerWidth / conductorCount) - 30);
      // Solo conductor gets 75% of container width (generous space for text)
      const soloConductorBubbleWidth = Math.min(600, Math.floor(containerWidth * 0.75));
      const conductorBubbleWidth = isSoloConductor
        ? soloConductorBubbleWidth
        : (hasMultipleConductors ? multiConductorBubbleWidth : singleConductorBubbleWidth);
      // Solo conductor gets taller bubble for text wrapping (80px vs 48px)
      let bubbleBodyHeight = isSoloConductor ? 80 : (isConductor ? 48 : 28);
      let width = isConductor ? conductorBubbleWidth : Math.min(bubbleMaxWidth, containerWidth - 20);

      // DECISION MODE: Expand bubble for primary blocked agent
      if (isPrimaryBlocked) {
        width = decisionBubbleWidth;
        bubbleBodyHeight = decisionBubbleHeight;
      }

      const height = bubbleBodyHeight + TAIL_HEIGHT;

      // Calculate horizontal position - center bubble on bot
      // MULTIPLE CONDUCTORS: Each conductor's bubble stays above/near their position
      // Don't center - position relative to the bot's actual location
      // In decision mode with expanded bubble, center horizontally in container
      // Otherwise, position bubble centered on the bot (with edge clamping)
      let idealLeft: number;
      if (isPrimaryBlocked) {
        idealLeft = (containerWidth - width) / 2;
      } else if (isConductor && hasMultipleConductors) {
        // MULTIPLE CONDUCTORS: Position bubble centered on this conductor's position
        // with zone boundaries to prevent overlap
        const zoneWidth = containerWidth / conductorCount;
        const zoneStart = thisConductorIndex * zoneWidth;
        const zoneEnd = (thisConductorIndex + 1) * zoneWidth;
        const centerOnBot = botCenterX - width / 2;
        // Clamp to stay within this conductor's zone
        idealLeft = Math.max(zoneStart + 5, Math.min(zoneEnd - width - 5, centerOnBot));
      } else {
        idealLeft = Math.max(10, Math.min(containerWidth - width - 10, botCenterX - width / 2));
      }

      // Determine vertical positions
      const isTopHalf = botCenterY < containerHeight * 0.4;
      const aboveY = bot.y - height - BUBBLE_MARGIN;
      const belowY = bot.y + BOT_SIZE + NAME_TAG_HEIGHT + BUBBLE_MARGIN + 4;

      // Decision mode: position bubble above bot so tail points at bot
      // Conductor: prefer above, but go below if not enough room above
      // Others: prefer below if in top half of container
      const preferBelow = isPrimaryBlocked ? false : isConductor ? (aboveY < 10) : (isTopHalf || aboveY < 10);

      // Check for collisions
      const hasCollision = (rect: { left: number; top: number; width: number; height: number }) => {
        // Check against static obstacles (bots + name tags)
        for (const obs of obstacles) {
          if (rectsOverlap(rect as BubbleRect, obs)) return true;
        }
        // Check against already-placed bubbles
        for (const placed of results) {
          if (rectsOverlap(rect as BubbleRect, placed)) return true;
        }
        // Check container bounds
        if (rect.top < 5 || rect.top + rect.height > containerHeight - 5) return true;
        if (rect.left < 5 || rect.left + rect.width > containerWidth - 5) return true;
        return false;
      };

      // Try positions in order of preference
      const positions: Array<{ left: number; top: number; bubbleBelow: boolean }> = [];

      // Primary position
      positions.push({
        left: idealLeft,
        top: preferBelow ? belowY : aboveY,
        bubbleBelow: preferBelow
      });

      // Opposite vertical
      positions.push({
        left: idealLeft,
        top: preferBelow ? aboveY : belowY,
        bubbleBelow: !preferBelow
      });

      // Horizontal shifts with both vertical positions
      const hShifts = [-50, 50, -100, 100, -150, 150];
      for (const hShift of hShifts) {
        const shiftedLeft = Math.max(10, Math.min(containerWidth - width - 10, idealLeft + hShift));
        positions.push({ left: shiftedLeft, top: preferBelow ? belowY : aboveY, bubbleBelow: preferBelow });
        positions.push({ left: shiftedLeft, top: preferBelow ? aboveY : belowY, bubbleBelow: !preferBelow });
      }

      // Vertical shifts
      const vShifts = [-25, 25, -50, 50, -75, 75];
      for (const vShift of vShifts) {
        const baseTop = preferBelow ? belowY : aboveY;
        const shiftedTop = Math.max(10, Math.min(containerHeight - height - 10, baseTop + vShift));
        positions.push({ left: idealLeft, top: shiftedTop, bubbleBelow: preferBelow });
      }

      // Find first non-colliding position
      let foundPosition: { left: number; top: number; bubbleBelow: boolean } | null = null;
      for (const pos of positions) {
        const testRect = {
          left: pos.left - COLLISION_PADDING,
          top: pos.top - COLLISION_PADDING,
          width: width + COLLISION_PADDING * 2,
          height: height + COLLISION_PADDING * 2,
        };
        if (!hasCollision(testRect)) {
          foundPosition = pos;
          break;
        }
      }

      // DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP
      // DESIGN PRINCIPLE: BOUNDARY CONTAINMENT - bubbles must stay inside container
      // If no non-colliding position found:
      // - Conductor/primary blocked: show anyway (user needs to see these), but CLAMP to bounds
      // - Subagents: skip the bubble to avoid overlap
      if (!foundPosition) {
        if (isConductor || isPrimaryBlocked) {
          // Must show conductor/blocked bubbles - clamp to container bounds
          const clampedLeft = Math.max(5, Math.min(containerWidth - width - 5, idealLeft));
          const rawTop = preferBelow ? belowY : aboveY;
          const clampedTop = Math.max(5, Math.min(containerHeight - height - 5, rawTop));
          foundPosition = { left: clampedLeft, top: clampedTop, bubbleBelow: preferBelow };
        } else {
          // Skip subagent bubble to avoid overlap
          continue;
        }
      }

      // Add to results
      results.push({
        left: foundPosition.left,
        top: foundPosition.top,
        width: width,
        height: height,
        botId: bot.agent.id,
        bubbleBelow: foundPosition.bubbleBelow,
      });

      if (!isConductor) subagentBubblesShown++;
    }

    return results;
  })();

  // Helper to get computed bubble position for a bot
  function getBubblePosition(botId: string): BubbleRect | undefined {
    return computedBubbles.find(b => b.botId === botId);
  }

  // Expose state for visual testing (used by scripts/visual-test.mjs)
  // This allows Puppeteer to extract bot positions, velocities, and bubble data
  // Using a getter function to capture current state on access
  onMount(() => {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, '__argusTestState', {
        get() {
          return {
            bots: bots.map(b => ({
              id: b.agent.id,
              type: b.agent.type,
              name: b.agent.name,
              x: b.x,
              y: b.y,
              vx: b.vx,
              vy: b.vy,
              homeX: b.homeX,
              homeY: b.homeY,
              direction: b.direction,
              scale: b.scale,
              spawning: b.spawning,
              isRelocating: b.isRelocating,
            })),
            bubbles: computedBubbles,
            clusterLinks: clusterLinks,
            bounds: {
              width: containerWidth,
              height: containerHeight,
              botMinY,
              botMaxY,
            },
          };
        },
        configurable: true,
      });
    }
  });
</script>

<!-- DESIGN PRINCIPLE: NOTHING SHOULD OVERLAP -->
<!-- Use clip-path instead of overflow-hidden to allow name tags to extend below bots -->
<div
  class="relative rounded-lg overflow-hidden {fillHeight ? 'h-full' : ''}"
  style="{fillHeight ? '' : `height: ${height}px`} clip-path: inset(-50px 0 -30px 0); border: 1px solid {biome.accentColor}22;"
  bind:clientWidth={containerWidth}
  bind:clientHeight={containerHeight}
>
  <!-- Biome background -->
  {#if containerWidth > 0 && containerHeight > 0}
    <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 {containerWidth} {containerHeight}" preserveAspectRatio="none">
      {@html biomeBackgroundSVG}
    </svg>
  {/if}

  <!-- Time-of-day overlay -->
  <div class="absolute inset-0 pointer-events-none" style="background: {timeOverlay};"></div>

  <!-- Ambient effects (weather particles, creatures) -->
  {#if ambientSVG && !$prefersReducedMotion}
    <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 4;" viewBox="0 0 {containerWidth} {containerHeight}" preserveAspectRatio="none">
      {@html ambientSVG}
    </svg>
  {/if}

  <!-- Desk furniture with role-specific items -->
  {#each Object.entries(DESK_POSITIONS) as [deskKey, pos]}
    {@const deskX = pos.xPct * containerWidth}
    {@const deskY = pos.yPct * containerHeight}
    {@const occupyingBot = bots.find(b => b.assignedDesk === deskKey)}
    {@const isOccupied = !!occupyingBot}
    {@const isSpawning = occupyingBot?.spawning}
    {@const botRole = occupyingBot ? getRoleCategory(occupyingBot.agent.name) : null}
    {#if !deskKey.startsWith('conductor_')}
      <!-- Desk surface (for non-conductor bots) -->
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
      <!-- Conductor gets a podium instead of a desk (all conductor positions) -->
      {@const hasConductorHere = bots.some(b => b.assignedDesk === deskKey)}
      {#if hasConductorHere}
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
        {:else if bot.conjureAnimation === 'assembly'}
          <!-- Assembly - magical sparkles + rotating parts -->
          <!-- Outer sparkle ring -->
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20"
            style="
              opacity: {effectIntensity * 0.8};
              transform: translate(-50%, -50%) rotate({bot.conjureProgress * 360}deg);
            "
          >
            {#each [0, 60, 120, 180, 240, 300] as angle}
              <div
                class="absolute w-2 h-2 rounded-full bg-cyan-300"
                style="
                  left: 50%;
                  top: 50%;
                  transform: translate(-50%, -50%) rotate({angle}deg) translateY(-35px);
                  opacity: {0.5 + Math.sin(bot.conjureProgress * Math.PI * 2 + angle * 0.01) * 0.5};
                "
              />
            {/each}
          </div>
          <!-- Inner construction glow -->
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-lg"
            style="
              opacity: {effectIntensity};
              background: radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%);
              transform: translate(-50%, -50%) scale({0.8 + bot.conjureProgress * 0.4});
              filter: blur(4px);
            "
          />
          <!-- Assembly sparks flying in -->
          {#each [0, 1, 2, 3] as i}
            <div
              class="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
              style="
                left: {50 + (Math.cos((i * 90 + bot.conjureProgress * 180) * Math.PI / 180) * (1 - bot.conjureProgress) * 60)}%;
                top: {50 + (Math.sin((i * 90 + bot.conjureProgress * 180) * Math.PI / 180) * (1 - bot.conjureProgress) * 60)}%;
                opacity: {effectIntensity * (1 - bot.conjureProgress * 0.5)};
                transform: scale({0.5 + bot.conjureProgress});
              "
            />
          {/each}
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
  <!-- DESIGN: NOTHING SHOULD OVERLAP - bubbles positioned via collision avoidance -->
  <!-- DESIGN: Pre-computed positions avoid bots, names, and other bubbles -->
  {#each bots as bot (bot.agent.id + '-bubble')}<!-- eslint-disable-line -->
    {#if bot.showBubble && bot.bubbleText && bot.scale > 0.5}
      {@const computed = getBubblePosition(bot.agent.id)}
      {#if computed}
        {@const isConductor = bot.agent.type === 'main'}
        {@const isBlocked = bot.agent.status === 'blocked'}
        {@const isPrimaryBlocked = decisionMode && isBlocked && bot === primaryBlockedAgent}
        {@const conductorCount = bots.filter(b => b.agent.type === 'main').length}
        {@const isSoloConductor = isConductor && conductorCount === 1}
        <!-- SINGLE CONDUCTOR: When there's only one conductor, show full text (plenty of room) -->
        {@const charLimit = isConductor ? bubbleCharLimit + 100 : bubbleCharLimit}
        {@const isHovered = hoveredBubbleId === bot.agent.id}
        {@const canExpand = !isPrimaryBlocked && !isSoloConductor && isTruncated(bot.bubbleText, charLimit)}
        {@const displayText = isPrimaryBlocked || isSoloConductor || (isHovered && canExpand)
          ? truncateForDisplay(bot.bubbleText, 300) // Show up to 300 chars on hover
          : truncateForDisplay(bot.bubbleText, charLimit)}
        {@const needsMarquee = !isPrimaryBlocked && !bubbleAllowWrap && !isConductor && displayText.length > marqueeThreshold}
        <!-- DESIGN: Bubbles travel WITH their bots, tail always points at bot -->
        <!-- Use current bot position for bubble placement, clamp to container bounds -->
        {@const actualBotCenterX = isPrimaryBlocked
          ? (containerWidth - decisionBubbleWidth) / 2 + decisionBubbleWidth / 2
          : bot.x + BOT_SIZE / 2}
        <!-- Expand bubble width on hover to fit more text -->
        {@const baseWidth = computed.width}
        {@const expandedWidth = Math.min(bubbleMaxWidth, baseWidth * 1.5)}
        {@const bubbleWidth = isHovered && canExpand ? expandedWidth : baseWidth}
        <!-- Position bubble centered on bot, clamped to container bounds -->
        {@const idealBubbleLeft = actualBotCenterX - bubbleWidth / 2}
        {@const bubbleLeft = Math.max(5, Math.min(containerWidth - bubbleWidth - 5, idealBubbleLeft))}
        {@const bubbleBelow = computed.bubbleBelow}
        <!-- Compute bubble top based on current bot Y position, clamped to container -->
        <!-- Expand bubble height on hover to fit more text -->
        {@const baseHeight = isPrimaryBlocked ? decisionBubbleHeight : isSoloConductor ? 80 : (isConductor ? 48 : 28)}
        {@const expandedHeight = isConductor ? 80 : 60}
        {@const bubbleHeight = isHovered && canExpand ? expandedHeight : baseHeight}
        {@const tailHeightForCalc = 10}
        {@const totalHeight = bubbleHeight + tailHeightForCalc}
        {@const idealBubbleTop = bubbleBelow
          ? bot.y + BOT_SIZE + 24 + 14 + 4
          : bot.y - totalHeight - 14}
        {@const clampedBubbleTop = Math.max(5, Math.min(containerHeight - totalHeight - 5, idealBubbleTop))}
        <!-- Tail points directly at bot center - minimal offset since bubble follows bot -->
        {@const tailOffset = actualBotCenterX - bubbleLeft - bubbleWidth / 2}
        {@const tailX = Math.max(-bubbleWidth/2 + 20, Math.min(bubbleWidth/2 - 20, tailOffset))}
        {@const effectiveStyleId = getEffectiveBubbleStyleId(biome.bubbleStyle, bot.agent.status)}
        {@const bubbleStyleConfig = getBubbleStyle(effectiveStyleId, biome.isDark)}
        {@const bubbleFill = bot.agent.status === 'blocked'
          ? 'rgba(245, 158, 11, 0.3)'
          : bot.agent.status === 'complete'
            ? 'rgba(34, 197, 94, 0.3)'
            : bubbleStyleConfig.fill}
        {@const bubbleStroke = bot.agent.status === 'blocked'
          ? 'rgba(245, 158, 11, 0.4)'
          : bot.agent.status === 'complete'
            ? 'rgba(34, 197, 94, 0.4)'
            : bubbleStyleConfig.stroke}
        {@const bubbleRotation = bubbleStyleConfig.rotation}
        <!-- SVG Speech Bubble - single path for seamless border around bubble+tail -->
        <!-- Solo conductor gets taller bubble (80px) for text wrapping -->
        <!-- bubbleHeight already computed above for positioning -->
        {@const tailHeight = 10}
        {@const tailWidth = 16}
        {@const radius = 8}
        {@const svgWidth = bubbleWidth}
        {@const svgHeight = bubbleHeight + tailHeight}
        {@const tailCenterX = bubbleWidth / 2 + tailX}
        <!-- Clamp tail position to stay within bubble bounds -->
        {@const clampedTailX = Math.max(radius + tailWidth/2 + 2, Math.min(bubbleWidth - radius - tailWidth/2 - 2, tailCenterX))}
        <!-- SVG path for rounded rect with tail - all one continuous shape -->
        {@const pathDown = `
          M ${radius} 0
          L ${svgWidth - radius} 0
          Q ${svgWidth} 0 ${svgWidth} ${radius}
          L ${svgWidth} ${bubbleHeight - radius}
          Q ${svgWidth} ${bubbleHeight} ${svgWidth - radius} ${bubbleHeight}
          L ${clampedTailX + tailWidth/2} ${bubbleHeight}
          L ${clampedTailX} ${bubbleHeight + tailHeight}
          L ${clampedTailX - tailWidth/2} ${bubbleHeight}
          L ${radius} ${bubbleHeight}
          Q 0 ${bubbleHeight} 0 ${bubbleHeight - radius}
          L 0 ${radius}
          Q 0 0 ${radius} 0
          Z
        `}
        {@const pathUp = `
          M ${radius} ${tailHeight}
          L ${clampedTailX - tailWidth/2} ${tailHeight}
          L ${clampedTailX} 0
          L ${clampedTailX + tailWidth/2} ${tailHeight}
          L ${svgWidth - radius} ${tailHeight}
          Q ${svgWidth} ${tailHeight} ${svgWidth} ${tailHeight + radius}
          L ${svgWidth} ${svgHeight - radius}
          Q ${svgWidth} ${svgHeight} ${svgWidth - radius} ${svgHeight}
          L ${radius} ${svgHeight}
          Q 0 ${svgHeight} 0 ${svgHeight - radius}
          L 0 ${tailHeight + radius}
          Q 0 ${tailHeight} ${radius} ${tailHeight}
          Z
        `}
        <!-- FUTURE: Bubble click → transcript navigation (not yet working, needs VS Code terminal scrollback API) -->
        {@const baseZIndex = 1000 + (bubbleBelow ? Math.floor(bot.y) + 100 : Math.floor(containerHeight - bot.y))}
        <div
          class="absolute transition-all duration-200 {canExpand ? 'pointer-events-auto' : 'pointer-events-none'}"
          style="
            left: {bubbleLeft}px;
            top: {clampedBubbleTop}px;
            z-index: {isHovered ? 5000 : baseZIndex};
            {bubbleRotation ? `transform: rotate(${bubbleRotation}deg);` : ''}
          "
          on:mouseenter={() => canExpand && handleBubbleEnter(bot.agent.id)}
          on:mouseleave={() => canExpand && handleBubbleLeave()}
          role="tooltip"
          aria-label={canExpand ? bot.bubbleText : undefined}
        >
          <!-- SVG background shape with seamless border -->
          <svg
            width="{svgWidth}"
            height="{svgHeight}"
            class="{isConductor ? 'backdrop-blur-xl' : 'backdrop-blur'} transition-all duration-200"
            style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));"
          >
            <path
              d="{bubbleBelow ? pathUp : pathDown}"
              fill="{bubbleFill}"
              stroke="{bubbleStroke}"
              stroke-width="{bubbleStyleConfig.strokeWidth}"
            />
            {@html bubbleStyleConfig.decorSVG(svgWidth, svgHeight)}
          </svg>
          <!-- Text content positioned over the SVG -->
          <div
            class="absolute {isConductor ? 'text-base' : isPrimaryBlocked ? 'text-sm' : bubbleTextClass} overflow-hidden transition-all duration-200
                   {bot.agent.status === 'blocked'
                     ? 'text-amber-200'
                     : bot.agent.status === 'complete'
                       ? 'text-green-200'
                       : ''}"
            style="
              left: 12px;
              top: {bubbleBelow ? tailHeight + 6 : 6}px;
              width: {bubbleWidth - 24}px;
              max-height: {bubbleHeight - 12}px;
              {bot.agent.status !== 'blocked' && bot.agent.status !== 'complete' ? `color: ${bubbleStyleConfig.textColor};` : ''}
              {bubbleStyleConfig.fontFamily ? `font-family: ${bubbleStyleConfig.fontFamily};` : ''}
              {bubbleStyleConfig.fontSizeFactor !== 1.0 ? `font-size: ${bubbleStyleConfig.fontSizeFactor}em;` : ''}
            "
          >
            <div
              class="{isPrimaryBlocked || isConductor || bubbleAllowWrap || (isHovered && canExpand) ? 'whitespace-normal' : 'whitespace-nowrap'} {needsMarquee && !isHovered && !$prefersReducedMotion ? 'animate-marquee' : ''}"
              style={needsMarquee && !isHovered && !$prefersReducedMotion ? `--marquee-offset: ${bubbleWidth - 40}px` : ''}
            >
              {displayText}
            </div>
          </div>
        </div>
      {/if}
    {/if}
  {/each}

  <!-- Floating old thoughts - drift upward and fade when bubble text changes -->
  {#each floatingThoughts as thought (thought.id)}
    <div
      class="absolute pointer-events-none animate-thought-float"
      style="
        left: {thought.x}px;
        top: {thought.y}px;
        z-index: 900;
        max-width: {thought.width}px;
      "
    >
      <div class="text-xs text-white/50 whitespace-nowrap overflow-hidden text-ellipsis">
        {thought.text}
      </div>
    </div>
  {/each}

  <!-- Celebration particles - spawn when agent completes -->
  {#each celebrationParticles as particle (particle.id)}
    <div
      class="absolute pointer-events-none animate-celebration-sparkle"
      style="
        left: {particle.x}px;
        top: {particle.y}px;
        z-index: 950;
        --particle-angle: {particle.angle}rad;
      "
    >
      <div class="text-base">
        {particle.emoji}
      </div>
    </div>
  {/each}

  <!-- Queue indicator when multiple agents are blocked -->
  {#if decisionMode && blockedQueueCount > 1}
    {@const queueText = `+${blockedQueueCount - 1} more waiting`}
    {@const queueLeft = (containerWidth - 180) / 2}
    {@const queueTop = containerHeight - 40}
    <div
      class="absolute pointer-events-none"
      style="
        left: {queueLeft}px;
        top: {queueTop}px;
        z-index: 2000;
      "
    >
      <div class="px-4 py-2 bg-amber-500/20 backdrop-blur-sm border border-amber-400/40 rounded-full">
        <div class="text-xs text-amber-200 font-medium whitespace-nowrap">
          {queueText}
        </div>
      </div>
    </div>
  {/if}

  <!-- TODO Progress Display (below conductor's speech bubble) -->
  {#if bots.length > 0}
    {@const conductorBot = bots.find(b => b.agent.type === 'main')}
    {#if conductorBot && conductorBot.agent.todos && (conductorBot.agent.todos.counts.inProgress > 0 || conductorBot.agent.todos.counts.pending > 0)}
    {@const conductorBubble = computedBubbles.find(b => b.botId === conductorBot.agent.id)}
    <!-- Skip rendering in decision mode (blocked state has priority for screen space) -->
    {#if conductorBubble && !decisionMode}
      {@const todoProgressText = formatTodoProgress(conductorBot.agent.todos)}
      {@const hasInProgress = conductorBot.agent.todos.counts.inProgress > 0}
      <!-- Position below the bubble -->
      {@const todoTop = conductorBubble.top + conductorBubble.height + 10}
      {@const todoWidth = conductorBubble.width}
      {@const todoLeft = conductorBubble.left}
      <!-- Ensure it stays within container boundaries -->
      {@const clampedTodoTop = Math.min(todoTop, containerHeight - 35)}
      <div
        class="absolute pointer-events-none"
        style="
          left: {todoLeft}px;
          top: {clampedTodoTop}px;
          width: {todoWidth}px;
          z-index: 1500;
        "
      >
        <div class="bg-[var(--bg-muted)] rounded-lg border border-[var(--border-subtle)] px-2 py-1">
          <div class="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <!-- Status icon: blue dot for in-progress, gray dot for pending only -->
            <span class="{hasInProgress ? 'text-blue-400' : 'text-[var(--text-muted)]'}">
              {hasInProgress ? '●' : '○'}
            </span>
            <span class="truncate">{todoProgressText}</span>
          </div>
        </div>
      </div>
    {/if}
    {/if}
  {/if}

  <!-- Collaboration connector lines - subtle dotted lines between clustered bots -->
  {#if clusterLinks.length > 0}
    <svg
      class="absolute inset-0 pointer-events-none"
      width="{containerWidth}"
      height="{containerHeight}"
      style="z-index: 3;"
    >
      {#each clusterLinks as link (link.subagentIdx + '-' + link.conductorIdx)}
        {@const sub = bots[link.subagentIdx]}
        {@const con = bots[link.conductorIdx]}
        {#if sub && con && sub.scale > 0.5 && con.scale > 0.5}
          {@const subCenterX = sub.x + BOT_SIZE / 2}
          {@const subCenterY = sub.y + BOT_SIZE / 2}
          {@const conCenterX = con.x + BOT_SIZE / 2}
          {@const conCenterY = con.y + BOT_SIZE / 2}
          {@const dist = Math.sqrt((subCenterX - conCenterX) ** 2 + (subCenterY - conCenterY) ** 2)}
          <!-- Only show line if bots are within reasonable proximity (within 2x cluster radius) -->
          {#if dist < CLUSTERING.CLUSTER_RADIUS * 2.5}
            <!-- Fade line opacity based on distance - closer = more visible -->
            {@const distFactor = Math.max(0, 1 - dist / (CLUSTERING.CLUSTER_RADIUS * 2.5))}
            {@const lineOpacity = CLUSTERING.CONNECTOR_OPACITY * distFactor}
            <line
              x1="{subCenterX}"
              y1="{subCenterY}"
              x2="{conCenterX}"
              y2="{conCenterY}"
              stroke="currentColor"
              stroke-width="{CLUSTERING.CONNECTOR_WIDTH}"
              stroke-dasharray="{CLUSTERING.CONNECTOR_DASH}"
              opacity="{lineOpacity}"
              class="text-cyan-400 cluster-connector-line"
            />
          {/if}
        {/if}
      {/each}
    </svg>
  {/if}

  <!-- Bots -->
  {#each bots as bot (bot.agent.id)}
    <!-- MULTIPLE CONDUCTORS: If only one conductor remains, use index 0 (primary blue) -->
    {@const currentConductorCount = bots.filter(b => b.agent.type === 'main').length}
    {@const effectiveConductorIndex = bot.agent.type === 'main' && currentConductorCount > 1
      ? (conductorAssignments.get(bot.agent.id) ?? 0)
      : 0}
    <div
      class="absolute transition-transform duration-100
             {bot.agent.status === 'blocked' ? 'cursor-pointer hover:scale-110' : 'cursor-pointer'}
             {bot.reaction === 'wave' && !$prefersReducedMotion ? 'animate-bot-wave' : ''}
             {bot.reaction === 'bounce' && !$prefersReducedMotion ? 'animate-bot-bounce' : ''}
             {bot.reaction === 'spin' && !$prefersReducedMotion ? 'animate-bot-spin' : ''}
             {bot.reaction === 'giggle' && !$prefersReducedMotion ? 'animate-bot-giggle' : ''}
             {bot.reaction === 'flip' && !$prefersReducedMotion ? 'animate-bot-flip' : ''}
             {bot.reaction === 'somersault' && !$prefersReducedMotion ? 'animate-bot-somersault' : ''}"
      style="
        left: {bot.x}px;
        top: {bot.y}px;
        transform: scaleX({bot.direction === 'left' ? -1 : 1}) scale({bot.scale});
        z-index: {Math.floor(bot.y)};
      "
      role="button"
      tabindex="0"
      aria-label="{bot.agent.name || bot.agent.type} - {bot.agent.status}"
      on:click|stopPropagation={() => handleBotClick(bot.agent.id)}
      on:keydown|stopPropagation={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBotClick(bot.agent.id); }}
    >
      <!-- Bot using CuteBot component -->
      <div style="width: {BOT_SIZE}px; height: {BOT_SIZE}px;">
        <CuteBot
          status={bot.agent.status}
          isTired={isBotTired(bot.agent)}
          role={getRole(bot.agent)}
          conductorIndex={effectiveConductorIndex}
          size={compact ? 'md' : 'lg'}
          conjuring={bot.spawning}
          conjureAnimation={bot.conjureAnimation}
          conjureProgress={bot.conjureProgress}
          bobble={bot.bobble}
          agentId={bot.agent.id}
        />
      </div>

      <!-- Name tag with spawn animation -->
      <!-- MULTIPLE CONDUCTORS: Show numbering when there are multiple (conductor 1, conductor 2) -->
      <div
        class="absolute top-full left-1/2 mt-1 text-xs whitespace-nowrap text-center transition-all duration-500"
        class:text-cyan-300={bot.spawning}
        class:text-amber-300={bot.isRelocating}
        class:font-medium={bot.spawning || bot.isRelocating}
        class:scale-110={bot.spawning}
        style="transform: translateX(-50%) scaleX({bot.direction === 'left' ? -1 : 1}); {!bot.spawning && !bot.isRelocating ? 'color: var(--text-secondary)' : ''}"
      >
        {bot.agent.type === 'main'
          ? (currentConductorCount > 1 ? `conductor ${effectiveConductorIndex + 1}` : 'conductor')
          : cleanAgentName(bot.agent.name) || 'worker'}
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
          class="absolute left-1/2 -top-4 text-2xl {$prefersReducedMotion ? '' : 'animate-emoji-float'} pointer-events-none"
          style="transform: translateX(-50%) scaleX({bot.direction === 'left' ? -1 : 1})"
        >
          {bot.reactionEmoji}
        </div>
      {/if}
    </div>
  {/each}

  <!-- Interaction overlays (emojis during bot-to-bot interactions) -->
  {#each interactionOverlays as overlay}
    <div
      class="absolute pointer-events-none text-lg"
      style="
        left: {overlay.x}px;
        top: {overlay.y}px;
        opacity: {overlay.opacity};
        transform: translate(-50%, -50%) scale({overlay.scale});
        z-index: 3000;
      "
    >
      {overlay.emoji}
    </div>
  {/each}

  <!-- Interaction particles (sparkles after interactions complete) -->
  {#each interactionParticleItems as particle}
    <div
      class="absolute pointer-events-none text-sm"
      style="
        left: {particle.x}px;
        top: {particle.y}px;
        opacity: {particle.opacity};
        transform: translate(-50%, -50%) scale({particle.scale});
        z-index: 3000;
      "
    >
      {particle.emoji}
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

  /* Floating old thoughts - gentle upward drift and fade */
  @keyframes thought-float-away {
    0% {
      opacity: 0.6;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(-40px);
    }
  }

  .animate-thought-float {
    animation: thought-float-away 2.5s ease-out forwards;
  }

  /* Celebration sparkles - float upward and outward in a gentle arc */
  @keyframes celebration-sparkle {
    0% {
      opacity: 0;
      transform: translate(0, 0) scale(0.5);
    }
    20% {
      opacity: 1;
      transform: translate(
        calc(cos(var(--particle-angle)) * 10px),
        calc(sin(var(--particle-angle)) * 10px)
      ) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(
        calc(cos(var(--particle-angle)) * 35px),
        calc(sin(var(--particle-angle)) * 35px - 25px)
      ) scale(0.8);
    }
  }

  .animate-celebration-sparkle {
    animation: celebration-sparkle 1s ease-out forwards;
  }

  /* Collaboration connector lines - subtle drifting dash animation */
  @keyframes connector-drift {
    from { stroke-dashoffset: 0; }
    to { stroke-dashoffset: 20; }
  }

  .cluster-connector-line {
    animation: connector-drift 3s linear infinite;
  }

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .cluster-connector-line {
      animation: none;
    }
  }
</style>
