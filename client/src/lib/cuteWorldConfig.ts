/**
 * CuteWorld Physics & Animation Configuration
 *
 * Centralized configuration for the bot simulation. Tuning these values
 * affects bot behavior, movement feel, and visual timing.
 */

/** Physics constants for bot movement */
export const PHYSICS = {
  /** Velocity decay per frame (0.98 = 2% loss per frame) */
  FRICTION: 0.98,

  /** Energy retained when bouncing off walls/bots (0.7 = 30% energy loss) */
  BOUNCE: 0.7,

  /** Strength of pull toward home desk (higher = snappier return) */
  HOME_PULL: 0.002,

  /** Random wandering impulse magnitude (lower = calmer movement) */
  WANDER_FORCE: 0.025,

  /** How hard bots push each other on collision */
  BOT_REPULSION: 0.15,

  /** Maximum velocity cap (lower = slower movement) */
  MAX_VELOCITY: 0.7,

  /** Velocity threshold for direction flip (hysteresis to reduce spinning) */
  DIRECTION_FLIP_THRESHOLD: 0.6,

  /** Margin from container edges in pixels */
  EDGE_MARGIN: 8,
} as const;

/** Bot spacing and collision */
export const SPACING = {
  /** Minimum distance between bots in pixels */
  MIN_BOT_DISTANCE: 90,

  /** Exclusion zone around conductor */
  CONDUCTOR_EXCLUSION: 100,

  /** Minimum distance between desks as % of container */
  MIN_DESK_DISTANCE_PCT: 0.18,
} as const;

/** Desk positioning bounds (as % of container) */
export const DESK_BOUNDS = {
  MIN_X: 0.12,
  MAX_X: 0.92,
  MIN_Y: 0.05,
  MAX_Y: 0.75,
} as const;

/** Bot vertical wandering bounds (as % of container height) */
export const WANDER_BOUNDS = {
  MIN_Y_PCT: 0.10,
  MAX_Y_PCT: 0.85,
} as const;

/** Conductor position (as % of container) */
export const CONDUCTOR_POSITION = {
  X_PCT: 0.10,
  Y_PCT: 0.12,
} as const;

/** Restlessness detection for desk relocation */
export const RESTLESSNESS = {
  /** Distance from home (px) that counts as "far" */
  FAR_FROM_HOME_THRESHOLD: 40,

  /** Velocity that counts as "moving fast" */
  MOVING_FAST_THRESHOLD: 0.3,

  /** Mean frustration threshold in ms (Gaussian center) */
  FRUSTRATION_MEAN_MS: 10000,

  /** Std deviation for frustration threshold */
  FRUSTRATION_STDDEV_MS: 5000,

  /** Minimum frustration threshold (floor) */
  FRUSTRATION_MIN_MS: 5000,

  /** Frustration buildup rate (ms per frame when restless) */
  FRUSTRATION_BUILDUP_RATE: 16,

  /** Frustration cooldown rate (ms per frame when settled) */
  FRUSTRATION_COOLDOWN_RATE: 32,
} as const;

/** Relocation animation */
export const RELOCATION = {
  /** Pull strength when walking to new desk */
  WALK_SPEED: 0.008,

  /** Distance threshold to consider "arrived" at new desk */
  ARRIVAL_THRESHOLD: 10,
} as const;

/** Spawn/conjure animation */
export const CONJURE = {
  /** Animation speed (lower = slower, 0.003 ≈ 5 seconds at 60fps) */
  SPEED: 0.003,

  /** Bot size in pixels */
  BOT_SIZE: 56,
} as const;

/** Wandering behavior */
export const WANDER = {
  /** Min time between direction changes (ms) */
  MIN_INTERVAL: 500,

  /** Max additional random time (ms) */
  MAX_ADDITIONAL_INTERVAL: 1500,
} as const;

/** Click reaction emojis */
export const HAPPY_EMOJIS = [
  '🎵', '✨', '💫', '🌟', '💖', '🎶', '🌈', '⭐', '🎀', '🍀', '🌸', '😊', '🥰', '💕'
] as const;

/** Available conjure animation styles */
export const CONJURE_ANIMATIONS = [
  'classic', 'teleport', 'factory', 'inflate', 'pixel', 'spring'
] as const;

export type ConjureAnimation = typeof CONJURE_ANIMATIONS[number];

/** Available click reaction types */
export const BOT_REACTIONS = ['wave', 'bounce', 'giggle', 'emoji'] as const;

export type BotReaction = typeof BOT_REACTIONS[number];
