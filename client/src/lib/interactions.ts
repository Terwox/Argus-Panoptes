/**
 * Interaction Choreography - Rich bot-to-bot animations
 *
 * Triggered by real events (task delegation, completion, spawning, etc.)
 * Each interaction is 1-2 seconds, gentle, and never interrupts blocked state.
 *
 * Design: calm and delightful, never urgent. Queue-based with cooldowns.
 */

export type InteractionType =
  | 'handoff'       // Conductor delegates task to subagent
  | 'high-five'     // Task completed, two bots celebrate
  | 'welcome'       // New subagent spawns, others wave
  | 'farewell'      // Subagent despawns
  | 'sit-down'      // Rate limited, bot sits
  | 'campfire'      // Multiple idle bots gather
  | 'huddle'        // Planning phase
  | 'trip'          // Error state
  | 'celebration'   // All tasks complete
  | 'workshop';     // Long-running task

export interface Interaction {
  type: InteractionType;
  /** Primary bot ID (the one performing the action) */
  primaryBotId: string;
  /** Secondary bot ID (if applicable, e.g., high-five partner) */
  secondaryBotId?: string;
  /** Duration in ms */
  duration: number;
  /** Start timestamp */
  startTime: number;
}

export interface InteractionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  opacity: number;
  scale: number;
  life: number; // 0 to 1, decreasing
}

// --- Configuration ---

const COOLDOWN_MS = 3000; // Minimum time between interactions
const MAX_QUEUE_SIZE = 3;

// Interaction durations (ms)
const DURATIONS: Record<InteractionType, number> = {
  'handoff': 1500,
  'high-five': 1200,
  'welcome': 1000,
  'farewell': 1500,
  'sit-down': 2000,
  'campfire': 2500,
  'huddle': 2000,
  'trip': 1000,
  'celebration': 2000,
  'workshop': 2000,
};

// Emojis for interaction particles
const INTERACTION_EMOJIS: Record<InteractionType, string[]> = {
  'handoff': ['💫', '✨', '→'],
  'high-five': ['✋', '⭐', '✨', '🎉'],
  'welcome': ['👋', '✨', '🌟'],
  'farewell': ['👋', '💨', '✨'],
  'sit-down': ['📖', '☕', '📱'],
  'campfire': ['🔥', '✨', '🌙'],
  'huddle': ['💡', '📋', '🤔'],
  'trip': ['💫', '😵', '❗'],
  'celebration': ['🎉', '🎊', '⭐', '🌟', '✨'],
  'workshop': ['🔧', '⚙️', '🔨'],
};

// --- Interaction Queue ---

export class InteractionQueue {
  private queue: Interaction[] = [];
  private current: Interaction | null = null;
  private lastInteractionEnd: number = 0;
  private particles: InteractionParticle[] = [];

  /**
   * Try to enqueue an interaction. Returns true if accepted.
   */
  enqueue(type: InteractionType, primaryBotId: string, secondaryBotId?: string): boolean {
    const now = Date.now();

    // Respect cooldown
    if (this.current && now < this.current.startTime + this.current.duration) {
      if (this.queue.length >= MAX_QUEUE_SIZE) return false;
    }

    if (now - this.lastInteractionEnd < COOLDOWN_MS && this.current) {
      if (this.queue.length >= MAX_QUEUE_SIZE) return false;
    }

    const interaction: Interaction = {
      type,
      primaryBotId,
      secondaryBotId,
      duration: DURATIONS[type],
      startTime: 0, // Set when started
    };

    if (!this.current) {
      this.startInteraction(interaction);
    } else {
      this.queue.push(interaction);
    }

    return true;
  }

  private startInteraction(interaction: Interaction) {
    interaction.startTime = Date.now();
    this.current = interaction;
  }

  /**
   * Called each frame. Returns the current interaction (if any) and its progress (0-1).
   */
  tick(): { interaction: Interaction | null; progress: number; particles: InteractionParticle[] } {
    const now = Date.now();

    // Update particles
    this.particles = this.particles
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy - 0.02, // gentle upward drift
        opacity: p.opacity * 0.97,
        life: p.life - 0.02,
      }))
      .filter(p => p.life > 0 && p.opacity > 0.05);

    if (!this.current) {
      // Try to dequeue
      if (this.queue.length > 0 && now - this.lastInteractionEnd >= COOLDOWN_MS) {
        this.startInteraction(this.queue.shift()!);
      }
      return { interaction: null, progress: 0, particles: this.particles };
    }

    const elapsed = now - this.current.startTime;
    const progress = Math.min(1, elapsed / this.current.duration);

    if (progress >= 1) {
      // Interaction complete
      this.lastInteractionEnd = now;
      const completed = this.current;
      this.current = null;

      // Spawn completion particles
      this.spawnParticles(completed);

      // Try next in queue
      if (this.queue.length > 0 && now - this.lastInteractionEnd >= COOLDOWN_MS) {
        this.startInteraction(this.queue.shift()!);
      }

      return { interaction: null, progress: 0, particles: this.particles };
    }

    return { interaction: this.current, progress, particles: this.particles };
  }

  private spawnParticles(interaction: Interaction) {
    const emojis = INTERACTION_EMOJIS[interaction.type];
    const count = Math.min(5, emojis.length + 2);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: 0, y: 0, // Will be positioned by the renderer
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        emoji: emojis[i % emojis.length],
        opacity: 0.8,
        scale: 0.6 + Math.random() * 0.4,
        life: 1,
      });
    }
  }

  getCurrent(): Interaction | null {
    return this.current;
  }

  clear() {
    this.current = null;
    this.queue = [];
    this.particles = [];
  }
}

// --- Interaction Visual Effects ---

/**
 * Get CSS transform for a bot during an interaction.
 * Returns null if bot is not involved in any active interaction.
 */
export function getInteractionTransform(
  interaction: Interaction | null,
  progress: number,
  botId: string,
  botX: number,
  botY: number,
  partnerX?: number,
  partnerY?: number,
): { translateX: number; translateY: number; rotate: number; scale: number } | null {
  if (!interaction) return null;

  const isPrimary = interaction.primaryBotId === botId;
  const isSecondary = interaction.secondaryBotId === botId;
  if (!isPrimary && !isSecondary) return null;

  const ease = easeInOutCubic(progress);

  switch (interaction.type) {
    case 'handoff': {
      if (isPrimary) {
        // Conductor leans forward slightly
        return { translateX: 0, translateY: 0, rotate: ease < 0.5 ? -5 * ease * 2 : -5 * (1 - ease) * 2, scale: 1 };
      }
      // Subagent receives - bounce slightly
      return { translateX: 0, translateY: ease < 0.5 ? 0 : -4 * Math.sin((ease - 0.5) * 2 * Math.PI), rotate: 0, scale: 1 };
    }

    case 'high-five': {
      if (isPrimary && partnerX !== undefined) {
        const dx = Math.sign((partnerX || 0) - botX) * 6;
        return {
          translateX: ease < 0.5 ? dx * ease * 2 : dx * (1 - ease) * 2,
          translateY: ease < 0.5 ? -4 * ease * 2 : -4 * (1 - ease) * 2,
          rotate: 0, scale: 1,
        };
      }
      if (isSecondary) {
        const dx = Math.sign(botX - (partnerX || 0)) * 6;
        return {
          translateX: ease < 0.5 ? dx * ease * 2 : dx * (1 - ease) * 2,
          translateY: ease < 0.5 ? -4 * ease * 2 : -4 * (1 - ease) * 2,
          rotate: 0, scale: 1,
        };
      }
      return null;
    }

    case 'welcome': {
      if (isPrimary) {
        // New bot bounces in
        return { translateX: 0, translateY: -6 * Math.sin(progress * Math.PI), rotate: 0, scale: 1 };
      }
      // Others wave (rotate slightly)
      return { translateX: 0, translateY: 0, rotate: 5 * Math.sin(progress * Math.PI * 3), scale: 1 };
    }

    case 'farewell': {
      if (isPrimary) {
        // Departing bot fades up
        return { translateX: 0, translateY: -20 * ease, rotate: 0, scale: 1 - ease * 0.5 };
      }
      // Others wave
      return { translateX: 0, translateY: 0, rotate: 5 * Math.sin(progress * Math.PI * 2), scale: 1 };
    }

    case 'sit-down': {
      if (isPrimary) {
        // Bot sinks down to sit
        const sinkProgress = Math.min(1, progress * 3); // Sit quickly then stay
        return { translateX: 0, translateY: 8 * easeInOutCubic(sinkProgress), rotate: 0, scale: 1 };
      }
      return null;
    }

    case 'campfire': {
      // Gentle sway
      return {
        translateX: 2 * Math.sin(progress * Math.PI * 2 + (isPrimary ? 0 : Math.PI)),
        translateY: 0, rotate: 0, scale: 1,
      };
    }

    case 'huddle': {
      // Pull toward center slightly
      return { translateX: 0, translateY: 0, rotate: 0, scale: 1 - 0.05 * Math.sin(progress * Math.PI) };
    }

    case 'trip': {
      if (isPrimary) {
        // Stumble forward then recover
        const stumble = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
        return {
          translateX: 8 * stumble,
          translateY: 4 * stumble,
          rotate: -10 * stumble,
          scale: 1,
        };
      }
      return null;
    }

    case 'celebration': {
      // Everyone bounces with unique timing
      const offset = isPrimary ? 0 : Math.PI * 0.5;
      return {
        translateX: 3 * Math.sin(progress * Math.PI * 4 + offset),
        translateY: -8 * Math.abs(Math.sin(progress * Math.PI * 3 + offset)),
        rotate: 5 * Math.sin(progress * Math.PI * 6 + offset),
        scale: 1,
      };
    }

    case 'workshop': {
      if (isPrimary) {
        // Subtle hammering motion
        return {
          translateX: 0,
          translateY: 2 * Math.sin(progress * Math.PI * 8),
          rotate: 0, scale: 1,
        };
      }
      return null;
    }

    default:
      return null;
  }
}

/**
 * Get overlay emoji/SVG for the interaction (e.g., glowing orb during handoff).
 */
export function getInteractionOverlay(
  interaction: Interaction,
  progress: number,
  primaryX: number, primaryY: number,
  secondaryX?: number, secondaryY?: number,
): { x: number; y: number; emoji: string; opacity: number; scale: number }[] {
  const overlays: { x: number; y: number; emoji: string; opacity: number; scale: number }[] = [];
  const emojis = INTERACTION_EMOJIS[interaction.type];

  switch (interaction.type) {
    case 'handoff': {
      // Glowing orb traveling from primary to secondary
      if (secondaryX !== undefined && secondaryY !== undefined) {
        const t = easeInOutCubic(progress);
        overlays.push({
          x: primaryX + (secondaryX - primaryX) * t,
          y: primaryY + (secondaryY - primaryY) * t - 15 * Math.sin(t * Math.PI),
          emoji: '💫',
          opacity: 0.8,
          scale: 0.8 + 0.4 * Math.sin(t * Math.PI),
        });
      }
      break;
    }

    case 'high-five': {
      // Sparkle at contact point (midpoint at peak)
      if (progress > 0.35 && progress < 0.65 && secondaryX !== undefined && secondaryY !== undefined) {
        const sparkleProgress = (progress - 0.35) / 0.3;
        const mx = (primaryX + secondaryX) / 2;
        const my = (primaryY + secondaryY) / 2;
        emojis.slice(0, 3).forEach((emoji, i) => {
          overlays.push({
            x: mx + Math.cos(i * 2.1) * 10 * sparkleProgress,
            y: my - 15 + Math.sin(i * 2.1) * 8 * sparkleProgress,
            emoji,
            opacity: 1 - sparkleProgress,
            scale: 0.5 + sparkleProgress * 0.5,
          });
        });
      }
      break;
    }

    case 'celebration': {
      // Confetti emojis floating up
      if (progress > 0.1) {
        const confettiProgress = (progress - 0.1) / 0.9;
        emojis.forEach((emoji, i) => {
          overlays.push({
            x: primaryX + Math.sin(i * 1.5 + confettiProgress * 4) * 20,
            y: primaryY - 25 - confettiProgress * 30,
            emoji,
            opacity: 1 - confettiProgress,
            scale: 0.4 + 0.3 * Math.sin(confettiProgress * Math.PI),
          });
        });
      }
      break;
    }

    case 'sit-down': {
      // Book or phone appears when sitting
      if (progress > 0.3) {
        const itemProgress = Math.min(1, (progress - 0.3) / 0.3);
        overlays.push({
          x: primaryX + 12,
          y: primaryY + 5,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          opacity: itemProgress * 0.7,
          scale: 0.6 * itemProgress,
        });
      }
      break;
    }

    case 'campfire': {
      // Tiny fire between bots
      if (secondaryX !== undefined && secondaryY !== undefined) {
        const mx = (primaryX + secondaryX) / 2;
        const my = Math.max(primaryY, secondaryY) + 10;
        overlays.push({
          x: mx,
          y: my + Math.sin(progress * Math.PI * 4) * 2,
          emoji: '🔥',
          opacity: 0.6,
          scale: 0.5 + Math.sin(progress * Math.PI * 3) * 0.1,
        });
      }
      break;
    }

    default:
      break;
  }

  return overlays;
}

// --- Easing ---

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Event Detection ---

/**
 * Detect which interaction should trigger based on agent state changes.
 * Call this when agent states update to potentially trigger interactions.
 */
export function detectInteraction(
  prevAgents: Map<string, string>, // id -> prev status
  currentAgents: { id: string; status: string; parentId?: string }[],
  conductorId?: string,
): { type: InteractionType; primaryId: string; secondaryId?: string } | null {
  for (const agent of currentAgents) {
    const prevStatus = prevAgents.get(agent.id);
    if (!prevStatus) {
      // New agent spawned
      if (agent.parentId && conductorId) {
        return { type: 'welcome', primaryId: agent.id, secondaryId: conductorId };
      }
      continue;
    }

    // Status transitions
    if (prevStatus !== agent.status) {
      if (agent.status === 'complete' && prevStatus === 'working') {
        // Task completed - high-five with conductor
        if (conductorId && agent.id !== conductorId) {
          return { type: 'high-five', primaryId: agent.id, secondaryId: conductorId };
        }
        return { type: 'celebration', primaryId: agent.id };
      }

      if (agent.status === 'rate_limited' && prevStatus === 'working') {
        return { type: 'sit-down', primaryId: agent.id };
      }

      if (agent.status === 'error') {
        return { type: 'trip', primaryId: agent.id };
      }

      if (agent.status === 'working' && prevStatus !== 'working' && agent.parentId && conductorId) {
        // Delegation
        return { type: 'handoff', primaryId: conductorId, secondaryId: agent.id };
      }
    }
  }

  // Check for agents that disappeared (farewell)
  for (const [id, _status] of prevAgents) {
    if (!currentAgents.find(a => a.id === id)) {
      if (conductorId) {
        return { type: 'farewell', primaryId: id, secondaryId: conductorId };
      }
    }
  }

  return null;
}
