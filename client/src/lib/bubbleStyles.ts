/**
 * Speech Bubble Styles - Visual variety in communication
 *
 * Each biome maps to a bubble style. Status can override the style
 * (e.g., planning always uses thought-cloud). All styles maintain
 * readability with ≥4.5:1 contrast ratio.
 */

export type BubbleStyleId = 'default' | 'handwritten' | 'thought-cloud' | 'post-it' | 'terminal' | 'scroll';

export interface BubbleStyleConfig {
  /** Background fill */
  fill: string;
  /** Border/stroke color */
  stroke: string;
  /** Stroke width */
  strokeWidth: number;
  /** Border radius for the rect (0 for sharp corners) */
  borderRadius: number;
  /** Text color */
  textColor: string;
  /** Font family override (null = inherit) */
  fontFamily: string | null;
  /** Font size adjustment factor (1.0 = normal) */
  fontSizeFactor: number;
  /** Rotation in degrees (for slight tilt effects) */
  rotation: number;
  /** Extra SVG elements to render inside the bubble (decorative) */
  decorSVG: (w: number, h: number) => string;
  /** Custom path generator for non-rectangular shapes (null = use rect) */
  pathGenerator: ((w: number, h: number) => string) | null;
  /** Opacity of the fill */
  fillOpacity: number;
}

function defaultDecor(): string { return ''; }

const STYLES: Record<BubbleStyleId, (isDark: boolean) => BubbleStyleConfig> = {
  'default': (isDark) => ({
    fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    strokeWidth: 1,
    borderRadius: 8,
    textColor: isDark ? '#fff' : '#1f2937',
    fontFamily: null,
    fontSizeFactor: 1.0,
    rotation: 0,
    decorSVG: defaultDecor,
    pathGenerator: null,
    fillOpacity: 1,
  }),

  'handwritten': (isDark) => ({
    fill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    stroke: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)',
    strokeWidth: 1.5,
    borderRadius: 12,
    textColor: isDark ? '#fef3c7' : '#1c1917',
    fontFamily: null,
    fontSizeFactor: 0.95,
    rotation: 0,
    decorSVG: defaultDecor,
    pathGenerator: (w: number, h: number) => {
      // Wobbly rounded rectangle
      const m = 4; // wobble magnitude
      return `M ${m},${h * 0.15}
        Q ${m + 2},${-m} ${w * 0.3},${m}
        Q ${w * 0.5},${-m + 2} ${w * 0.7},${m + 1}
        Q ${w - m},${-m} ${w - m},${h * 0.2}
        Q ${w + m - 2},${h * 0.5} ${w - m},${h * 0.8}
        Q ${w + m},${h + m} ${w * 0.7},${h - m}
        Q ${w * 0.5},${h + m - 1} ${w * 0.3},${h - m + 1}
        Q ${m - 2},${h + m} ${m},${h * 0.8}
        Q ${-m + 1},${h * 0.5} ${m},${h * 0.15} Z`;
    },
    fillOpacity: 1,
  }),

  'thought-cloud': (isDark) => ({
    fill: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    stroke: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
    strokeWidth: 1,
    borderRadius: 20,
    textColor: isDark ? '#e0e7ff' : '#1e1b4b',
    fontFamily: null,
    fontSizeFactor: 0.95,
    rotation: 0,
    decorSVG: defaultDecor,
    pathGenerator: (w: number, h: number) => {
      // Scalloped cloud shape
      const r = Math.min(w, h) * 0.15;
      return `M ${r},${h * 0.5}
        Q ${0},${h * 0.3} ${r},${r}
        Q ${r},${0} ${w * 0.25},${r * 0.5}
        Q ${w * 0.35},${-r * 0.3} ${w * 0.5},${r * 0.5}
        Q ${w * 0.65},${-r * 0.3} ${w * 0.75},${r * 0.5}
        Q ${w - r},${0} ${w - r},${r}
        Q ${w},${h * 0.3} ${w - r},${h * 0.5}
        Q ${w},${h * 0.7} ${w - r},${h - r}
        Q ${w - r},${h} ${w * 0.75},${h - r * 0.5}
        Q ${w * 0.65},${h + r * 0.3} ${w * 0.5},${h - r * 0.5}
        Q ${w * 0.35},${h + r * 0.3} ${w * 0.25},${h - r * 0.5}
        Q ${r},${h} ${r},${h - r}
        Q ${0},${h * 0.7} ${r},${h * 0.5} Z`;
    },
    fillOpacity: 1,
  }),

  'post-it': (isDark) => ({
    fill: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.25)',
    stroke: isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(180, 140, 20, 0.3)',
    strokeWidth: 0.5,
    borderRadius: 2,
    textColor: isDark ? '#fef3c7' : '#451a03',
    fontFamily: null,
    fontSizeFactor: 0.9,
    rotation: -1.5,
    decorSVG: (w: number, h: number) => {
      // Folded corner
      return `<path d="M ${w - 12},${h} L ${w},${h - 12} L ${w},${h} Z" fill="${isDark ? 'rgba(251,191,36,0.1)' : 'rgba(200,160,30,0.15)'}" />`;
    },
    pathGenerator: null,
    fillOpacity: 1,
  }),

  'terminal': (isDark) => ({
    fill: 'rgba(0, 0, 0, 0.6)',
    stroke: isDark ? 'rgba(74, 222, 128, 0.4)' : 'rgba(22, 163, 74, 0.5)',
    strokeWidth: 1,
    borderRadius: 4,
    textColor: '#4ade80',
    fontFamily: "'Courier New', Courier, monospace",
    fontSizeFactor: 0.85,
    rotation: 0,
    decorSVG: (w: number) => {
      // Terminal header with dots
      return `
        <line x1="4" y1="4" x2="${w - 4}" y2="4" stroke="rgba(74,222,128,0.2)" stroke-width="0.5" />
        <circle cx="8" cy="2" r="1.5" fill="#ef4444" opacity="0.5" />
        <circle cx="14" cy="2" r="1.5" fill="#fbbf24" opacity="0.5" />
        <circle cx="20" cy="2" r="1.5" fill="#4ade80" opacity="0.5" />
      `;
    },
    pathGenerator: null,
    fillOpacity: 1,
  }),

  'scroll': (isDark) => ({
    fill: isDark ? 'rgba(120, 53, 15, 0.2)' : 'rgba(254, 243, 199, 0.5)',
    stroke: isDark ? 'rgba(180, 120, 60, 0.3)' : 'rgba(120, 53, 15, 0.25)',
    strokeWidth: 1,
    borderRadius: 6,
    textColor: isDark ? '#fde68a' : '#451a03',
    fontFamily: null,
    fontSizeFactor: 0.95,
    rotation: 0,
    decorSVG: (w: number, h: number) => {
      // Scroll curl at top and bottom
      return `
        <path d="M 0,4 Q ${w * 0.5},0 ${w},4" fill="none" stroke="${isDark ? 'rgba(180,120,60,0.2)' : 'rgba(120,53,15,0.15)'}" stroke-width="1" />
        <path d="M 0,${h - 4} Q ${w * 0.5},${h} ${w},${h - 4}" fill="none" stroke="${isDark ? 'rgba(180,120,60,0.2)' : 'rgba(120,53,15,0.15)'}" stroke-width="1" />
      `;
    },
    pathGenerator: null,
    fillOpacity: 1,
  }),
};

export function getBubbleStyle(styleId: BubbleStyleId, isDark: boolean): BubbleStyleConfig {
  return STYLES[styleId](isDark);
}

/**
 * Get the effective bubble style for a given biome + agent status.
 * Status can override the biome's default style.
 */
export function getEffectiveBubbleStyleId(
  biomeStyle: BubbleStyleId,
  agentStatus: string,
): BubbleStyleId {
  // Planning/thinking always uses thought-cloud
  if (agentStatus === 'plan_mode') return 'thought-cloud';
  // Otherwise use biome default
  return biomeStyle;
}
