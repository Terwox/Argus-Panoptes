/**
 * Bot Body Parts - Composable visual variants for CuteBot
 *
 * Each bot gets a deterministic appearance based on a hash of its agent ID.
 * Role color + held tool remain fixed as anchors for role identification.
 *
 * Combinatorial variety: 6×4×5×4×4×6×4 = 46,080 unique silhouettes.
 */

// --- Types ---

export type BodyShape = 'rounded-rect' | 'pill' | 'circle' | 'trapezoid' | 'hexagon' | 'tapered';
export type HeadStyle = 'integrated' | 'round' | 'flat-top' | 'dome';
export type AntennaStyle = 'ball' | 'double' | 'dish' | 'lightning' | 'leaf';
export type ArmStyle = 'noodle' | 'mechanical' | 'stubby' | 'dangly';
export type LegStyle = 'standard' | 'wheels' | 'hover' | 'springy';
export type EyeStyle = 'dots' | 'anime' | 'visor' | 'led' | 'mismatched' | 'sleepy';
export type MouthStyle = 'line' | 'toothy' | 'speaker' | 'beak';

export interface BotAppearance {
  body: BodyShape;
  head: HeadStyle;
  antenna: AntennaStyle;
  arms: ArmStyle;
  legs: LegStyle;
  eyes: EyeStyle;
  mouth: MouthStyle;
}

// --- Variant Arrays ---

const BODY_SHAPES: BodyShape[] = ['rounded-rect', 'pill', 'circle', 'trapezoid', 'hexagon', 'tapered'];
const HEAD_STYLES: HeadStyle[] = ['integrated', 'round', 'flat-top', 'dome'];
const ANTENNA_STYLES: AntennaStyle[] = ['ball', 'double', 'dish', 'lightning', 'leaf'];
const ARM_STYLES: ArmStyle[] = ['noodle', 'mechanical', 'stubby', 'dangly'];
const LEG_STYLES: LegStyle[] = ['standard', 'wheels', 'hover', 'springy'];
const EYE_STYLES: EyeStyle[] = ['dots', 'anime', 'visor', 'led', 'mismatched', 'sleepy'];
const MOUTH_STYLES: MouthStyle[] = ['line', 'toothy', 'speaker', 'beak'];

// --- Hash Function (djb2) ---

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Use different primes for each part to decorrelate selections
export function selectBotAppearance(agentId: string): BotAppearance {
  const h = hashString(agentId || 'default-bot');
  return {
    body: BODY_SHAPES[h % BODY_SHAPES.length],
    head: HEAD_STYLES[Math.floor(h / 7) % HEAD_STYLES.length],
    antenna: ANTENNA_STYLES[Math.floor(h / 31) % ANTENNA_STYLES.length],
    arms: ARM_STYLES[Math.floor(h / 127) % ARM_STYLES.length],
    legs: LEG_STYLES[Math.floor(h / 509) % LEG_STYLES.length],
    eyes: EYE_STYLES[Math.floor(h / 2053) % EYE_STYLES.length],
    mouth: MOUTH_STYLES[Math.floor(h / 8209) % MOUTH_STYLES.length],
  };
}

// --- Shape Descriptors ---

export type ShapeDescriptor =
  | { type: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { type: 'path'; d: string }
  | { type: 'polygon'; points: string };

// --- Anchors ---
// Where other parts attach relative to the 100×100 viewBox

export interface Anchors {
  eyeLeftX: number; eyeLeftY: number;
  eyeRightX: number; eyeRightY: number;
  eyeScale: number;
  mouthX: number; mouthY: number;
  antennaBaseX: number; antennaBaseY: number;
  armLeftX: number; armLeftY: number;
  armRightX: number; armRightY: number;
  legLeftX: number; legLeftY: number;
  legRightX: number; legRightY: number;
  bodyCenterX: number; bodyCenterY: number;
  bodyTopY: number; // Top edge of body for head placement
}

// --- Body Shapes ---

export function getBodyShape(body: BodyShape): ShapeDescriptor {
  switch (body) {
    case 'rounded-rect':
      return { type: 'rect', x: 20, y: 30, w: 60, h: 50, rx: 10 };
    case 'pill':
      return { type: 'rect', x: 22, y: 26, w: 56, h: 56, rx: 28 };
    case 'circle':
      return { type: 'ellipse', cx: 50, cy: 55, rx: 30, ry: 28 };
    case 'trapezoid':
      return { type: 'path', d: 'M 30,28 L 70,28 L 82,80 L 18,80 Z' };
    case 'hexagon':
      return { type: 'polygon', points: '50,25 80,38 80,68 50,82 20,68 20,38' };
    case 'tapered':
      return { type: 'path', d: 'M 35,28 Q 50,24 65,28 L 80,80 Q 50,84 20,80 Z' };
  }
}

export function getAnchors(body: BodyShape): Anchors {
  switch (body) {
    case 'rounded-rect':
      return {
        eyeLeftX: 37, eyeLeftY: 50, eyeRightX: 63, eyeRightY: 50, eyeScale: 1,
        mouthX: 50, mouthY: 67,
        antennaBaseX: 50, antennaBaseY: 30,
        armLeftX: 8, armLeftY: 50, armRightX: 78, armRightY: 48,
        legLeftX: 30, legLeftY: 78, legRightX: 60, legRightY: 78,
        bodyCenterX: 50, bodyCenterY: 55, bodyTopY: 30,
      };
    case 'pill':
      return {
        eyeLeftX: 38, eyeLeftY: 52, eyeRightX: 62, eyeRightY: 52, eyeScale: 0.9,
        mouthX: 50, mouthY: 68,
        antennaBaseX: 50, antennaBaseY: 26,
        armLeftX: 10, armLeftY: 52, armRightX: 76, armRightY: 50,
        legLeftX: 32, legLeftY: 80, legRightX: 58, legRightY: 80,
        bodyCenterX: 50, bodyCenterY: 54, bodyTopY: 26,
      };
    case 'circle':
      return {
        eyeLeftX: 39, eyeLeftY: 50, eyeRightX: 61, eyeRightY: 50, eyeScale: 0.85,
        mouthX: 50, mouthY: 64,
        antennaBaseX: 50, antennaBaseY: 27,
        armLeftX: 10, armLeftY: 54, armRightX: 76, armRightY: 52,
        legLeftX: 34, legLeftY: 80, legRightX: 58, legRightY: 80,
        bodyCenterX: 50, bodyCenterY: 55, bodyTopY: 27,
      };
    case 'trapezoid':
      return {
        eyeLeftX: 40, eyeLeftY: 48, eyeRightX: 60, eyeRightY: 48, eyeScale: 1,
        mouthX: 50, mouthY: 64,
        antennaBaseX: 50, antennaBaseY: 28,
        armLeftX: 6, armLeftY: 55, armRightX: 80, armRightY: 48,
        legLeftX: 28, legLeftY: 78, legRightX: 62, legRightY: 78,
        bodyCenterX: 50, bodyCenterY: 54, bodyTopY: 28,
      };
    case 'hexagon':
      return {
        eyeLeftX: 37, eyeLeftY: 50, eyeRightX: 63, eyeRightY: 50, eyeScale: 0.95,
        mouthX: 50, mouthY: 66,
        antennaBaseX: 50, antennaBaseY: 25,
        armLeftX: 8, armLeftY: 53, armRightX: 78, armRightY: 48,
        legLeftX: 30, legLeftY: 80, legRightX: 60, legRightY: 80,
        bodyCenterX: 50, bodyCenterY: 53, bodyTopY: 25,
      };
    case 'tapered':
      return {
        eyeLeftX: 40, eyeLeftY: 48, eyeRightX: 60, eyeRightY: 48, eyeScale: 0.9,
        mouthX: 50, mouthY: 64,
        antennaBaseX: 50, antennaBaseY: 28,
        armLeftX: 8, armLeftY: 54, armRightX: 78, armRightY: 48,
        legLeftX: 28, legLeftY: 80, legRightX: 62, legRightY: 80,
        bodyCenterX: 50, bodyCenterY: 56, bodyTopY: 28,
      };
  }
}

// --- Head Shape SVG Data ---

export interface HeadData {
  shape: ShapeDescriptor | null; // null = integrated (no separate head)
  antennaOffsetY: number; // How much higher to push antenna
}

export function getHeadData(head: HeadStyle, anchors: Anchors): HeadData {
  const topY = anchors.bodyTopY;
  const cx = anchors.antennaBaseX;

  switch (head) {
    case 'integrated':
      return { shape: null, antennaOffsetY: 0 };
    case 'round':
      return {
        shape: { type: 'ellipse', cx, cy: topY - 6, rx: 14, ry: 12 },
        antennaOffsetY: -16,
      };
    case 'flat-top':
      return {
        shape: { type: 'rect', x: cx - 16, y: topY - 10, w: 32, h: 12, rx: 3 },
        antennaOffsetY: -10,
      };
    case 'dome':
      return {
        shape: { type: 'path', d: `M ${cx - 16},${topY} Q ${cx - 16},${topY - 18} ${cx},${topY - 18} Q ${cx + 16},${topY - 18} ${cx + 16},${topY} Z` },
        antennaOffsetY: -16,
      };
  }
}

// --- Antenna SVG Fragments ---
// Returns SVG string for the antenna, positioned at the given base point

export function getAntennaSVG(style: AntennaStyle, baseX: number, baseY: number, color: string, pulseClass: string, glowClass: string): string {
  const topY = baseY - 18;

  switch (style) {
    case 'ball':
      return `
        <line x1="${baseX}" y1="${baseY}" x2="${baseX}" y2="${topY + 3}" stroke="${color}" stroke-width="4" stroke-linecap="round" />
        <circle cx="${baseX}" cy="${topY}" r="8" fill="${color}" class="${glowClass}" />
        <circle cx="${baseX}" cy="${topY}" r="5" fill="${color}" class="${pulseClass}" />
        <circle cx="${baseX - 2}" cy="${topY - 2}" r="2" fill="white" opacity="0.7" />
      `;
    case 'double':
      return `
        <line x1="${baseX - 8}" y1="${baseY}" x2="${baseX - 12}" y2="${topY + 2}" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        <line x1="${baseX + 8}" y1="${baseY}" x2="${baseX + 12}" y2="${topY + 2}" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        <circle cx="${baseX - 12}" cy="${topY}" r="4" fill="${color}" class="${glowClass}" />
        <circle cx="${baseX + 12}" cy="${topY}" r="4" fill="${color}" class="${glowClass}" />
        <circle cx="${baseX - 13}" cy="${topY - 2}" r="1.5" fill="white" opacity="0.7" />
        <circle cx="${baseX + 11}" cy="${topY - 2}" r="1.5" fill="white" opacity="0.7" />
      `;
    case 'dish':
      return `
        <line x1="${baseX}" y1="${baseY}" x2="${baseX}" y2="${topY + 6}" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        <path d="M ${baseX - 12},${topY + 4} Q ${baseX},${topY - 4} ${baseX + 12},${topY + 4}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        <circle cx="${baseX}" cy="${topY - 2}" r="3" fill="${color}" class="${pulseClass}" />
        <circle cx="${baseX - 1}" cy="${topY - 3}" r="1" fill="white" opacity="0.7" />
      `;
    case 'lightning':
      return `
        <polyline points="${baseX},${baseY} ${baseX + 4},${topY + 8} ${baseX - 2},${topY + 6} ${baseX + 6},${topY - 2}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${baseX + 6}" cy="${topY - 2}" r="3" fill="#fbbf24" class="${glowClass}" />
      `;
    case 'leaf':
      return `
        <line x1="${baseX}" y1="${baseY}" x2="${baseX}" y2="${topY + 6}" stroke="${color}" stroke-width="3" stroke-linecap="round" />
        <path d="M ${baseX},${topY + 6} Q ${baseX + 10},${topY - 2} ${baseX},${topY - 4} Q ${baseX - 10},${topY - 2} ${baseX},${topY + 6} Z" fill="#4ade80" stroke="#16a34a" stroke-width="1" />
        <line x1="${baseX}" y1="${topY + 4}" x2="${baseX}" y2="${topY - 2}" stroke="#16a34a" stroke-width="0.8" opacity="0.6" />
      `;
  }
}

// --- Arm SVG Fragments ---

export function getLeftArmSVG(style: ArmStyle, x: number, y: number, color: string): string {
  switch (style) {
    case 'noodle':
      return `<rect x="${x}" y="${y}" width="14" height="6" rx="3" fill="${color}" />`;
    case 'mechanical':
      return `
        <rect x="${x}" y="${y}" width="8" height="5" rx="1" fill="${color}" />
        <circle cx="${x + 8}" cy="${y + 2.5}" r="3" fill="${color}" stroke="#333" stroke-width="0.5" />
        <rect x="${x + 8}" y="${y}" width="6" height="5" rx="1" fill="${color}" />
      `;
    case 'stubby':
      return `<rect x="${x + 2}" y="${y - 1}" width="10" height="8" rx="4" fill="${color}" />`;
    case 'dangly':
      return `<path d="M ${x + 12},${y} Q ${x + 4},${y + 12} ${x},${y + 8}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" />`;
  }
}

export function getRightArmSVG(style: ArmStyle, x: number, y: number, color: string): string {
  switch (style) {
    case 'noodle':
      return `<rect x="${x}" y="${y}" width="14" height="6" rx="3" fill="${color}" />`;
    case 'mechanical':
      return `
        <rect x="${x}" y="${y}" width="8" height="5" rx="1" fill="${color}" />
        <circle cx="${x + 8}" cy="${y + 2.5}" r="3" fill="${color}" stroke="#333" stroke-width="0.5" />
        <rect x="${x + 8}" y="${y}" width="6" height="5" rx="1" fill="${color}" />
      `;
    case 'stubby':
      return `<rect x="${x + 2}" y="${y - 1}" width="10" height="8" rx="4" fill="${color}" />`;
    case 'dangly':
      return `<path d="M ${x},${y} Q ${x + 8},${y + 12} ${x + 14},${y + 8}" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" />`;
  }
}

// --- Leg SVG Fragments ---

export function getLegsSVG(style: LegStyle, leftX: number, leftY: number, rightX: number, rightY: number, pantsColor: string): string {
  switch (style) {
    case 'standard':
      return `
        <rect x="${leftX}" y="${leftY}" width="10" height="12" rx="3" fill="${pantsColor}" />
        <rect x="${rightX}" y="${rightY}" width="10" height="12" rx="3" fill="${pantsColor}" />
      `;
    case 'wheels':
      return `
        <rect x="${leftX}" y="${leftY}" width="10" height="6" rx="2" fill="${pantsColor}" />
        <circle cx="${leftX + 5}" cy="${leftY + 10}" r="5" fill="#374151" stroke="${pantsColor}" stroke-width="1.5" />
        <circle cx="${leftX + 5}" cy="${leftY + 10}" r="2" fill="#6b7280" />
        <rect x="${rightX}" y="${rightY}" width="10" height="6" rx="2" fill="${pantsColor}" />
        <circle cx="${rightX + 5}" cy="${rightY + 10}" r="5" fill="#374151" stroke="${pantsColor}" stroke-width="1.5" />
        <circle cx="${rightX + 5}" cy="${rightY + 10}" r="2" fill="#6b7280" />
      `;
    case 'hover':
      return `
        <ellipse cx="${(leftX + rightX + 10) / 2}" cy="${leftY + 6}" rx="24" ry="4" fill="${pantsColor}" opacity="0.8" />
        <ellipse cx="${(leftX + rightX + 10) / 2}" cy="${leftY + 10}" rx="20" ry="2" fill="${pantsColor}" opacity="0.3" />
        <ellipse cx="${(leftX + rightX + 10) / 2}" cy="${leftY + 13}" rx="16" ry="1.5" fill="${pantsColor}" opacity="0.15" />
      `;
    case 'springy':
      return `
        <path d="M ${leftX + 5},${leftY} Q ${leftX - 2},${leftY + 4} ${leftX + 10},${leftY + 6} Q ${leftX - 2},${leftY + 8} ${leftX + 5},${leftY + 12}" fill="none" stroke="${pantsColor}" stroke-width="3" stroke-linecap="round" />
        <circle cx="${leftX + 5}" cy="${leftY + 14}" r="3" fill="${pantsColor}" />
        <path d="M ${rightX + 5},${rightY} Q ${rightX - 2},${rightY + 4} ${rightX + 10},${rightY + 6} Q ${rightX - 2},${rightY + 8} ${rightX + 5},${rightY + 12}" fill="none" stroke="${pantsColor}" stroke-width="3" stroke-linecap="round" />
        <circle cx="${rightX + 5}" cy="${rightY + 14}" r="3" fill="${pantsColor}" />
      `;
  }
}

// --- Eye SVG Fragments ---
// Status-aware: each style adapts to blocked/error/idle/etc.

export type EyeStatus = 'normal' | 'tired' | 'sleeping' | 'blocked' | 'error' | 'rate_limited' | 'server_running' | 'complete' | 'idle';

export function getEyesSVG(
  style: EyeStyle,
  eyeStatus: EyeStatus,
  lx: number, ly: number, rx: number, ry: number,
  scale: number,
  eyeColor: string
): string {
  const s = scale;

  // Status overrides apply to all eye styles
  if (eyeStatus === 'sleeping') {
    return `
      <line x1="${lx - 5 * s}" y1="${ly}" x2="${lx + 5 * s}" y2="${ly}" stroke="${eyeColor}" stroke-width="3" stroke-linecap="round" />
      <line x1="${rx - 5 * s}" y1="${ry}" x2="${rx + 5 * s}" y2="${ry}" stroke="${eyeColor}" stroke-width="3" stroke-linecap="round" />
    `;
  }
  if (eyeStatus === 'complete') {
    return `
      <path d="M ${lx - 5 * s} ${ly} Q ${lx} ${ly - 5 * s} ${lx + 5 * s} ${ly}" stroke="${eyeColor}" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M ${rx - 5 * s} ${ry} Q ${rx} ${ry - 5 * s} ${rx + 5 * s} ${ry}" stroke="${eyeColor}" stroke-width="3" fill="none" stroke-linecap="round" />
    `;
  }
  if (eyeStatus === 'tired') {
    return `
      <line x1="${lx - 5 * s}" y1="${ly}" x2="${lx + 5 * s}" y2="${ly + 2}" stroke="${eyeColor}" stroke-width="3" stroke-linecap="round" />
      <line x1="${rx - 5 * s}" y1="${ry + 2}" x2="${rx + 5 * s}" y2="${ry}" stroke="${eyeColor}" stroke-width="3" stroke-linecap="round" />
    `;
  }

  // Style + status combinations
  switch (style) {
    case 'dots':
      return getDotsEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
    case 'anime':
      return getAnimeEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
    case 'visor':
      return getVisorEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
    case 'led':
      return getLedEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
    case 'mismatched':
      return getMismatchedEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
    case 'sleepy':
      return getSleepyEyes(eyeStatus, lx, ly, rx, ry, s, eyeColor);
  }
}

function getDotsEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  switch (status) {
    case 'blocked':
      return `
        <circle cx="${lx}" cy="${ly}" r="${8 * s}" fill="${c}" /><circle cx="${rx}" cy="${ry}" r="${8 * s}" fill="${c}" />
        <circle cx="${lx}" cy="${ly}" r="${4 * s}" fill="#333" /><circle cx="${rx}" cy="${ry}" r="${4 * s}" fill="#333" />
      `;
    case 'error':
      return `
        <circle cx="${lx}" cy="${ly - 2}" r="${6 * s}" fill="${c}" /><circle cx="${rx}" cy="${ry + 2}" r="${6 * s}" fill="${c}" />
        <circle cx="${lx}" cy="${ly - 2}" r="${3 * s}" fill="#333" /><circle cx="${rx}" cy="${ry + 2}" r="${3 * s}" fill="#333" />
      `;
    case 'rate_limited':
      return `
        <ellipse cx="${lx}" cy="${ly}" rx="${5 * s}" ry="${4 * s}" fill="${c}" />
        <ellipse cx="${rx}" cy="${ry}" rx="${5 * s}" ry="${4 * s}" fill="${c}" />
        <circle cx="${lx + 1}" cy="${ly + 1}" r="${2 * s}" fill="#333" />
        <circle cx="${rx + 1}" cy="${ry + 1}" r="${2 * s}" fill="#333" />
      `;
    case 'server_running':
      return `
        <circle cx="${lx}" cy="${ly}" r="${6 * s}" fill="${c}" /><circle cx="${rx}" cy="${ry}" r="${6 * s}" fill="${c}" />
        <circle cx="${lx + 1}" cy="${ly}" r="${3 * s}" fill="#10b981" /><circle cx="${rx + 1}" cy="${ry}" r="${3 * s}" fill="#10b981" />
      `;
    case 'idle':
      return `
        <ellipse cx="${lx}" cy="${ly}" rx="${6 * s}" ry="${5 * s}" fill="${c}" />
        <ellipse cx="${rx}" cy="${ry}" rx="${6 * s}" ry="${5 * s}" fill="${c}" />
        <ellipse cx="${lx}" cy="${ly + 1}" rx="${3.5 * s}" ry="${3 * s}" fill="#444" />
        <ellipse cx="${rx}" cy="${ry + 1}" rx="${3.5 * s}" ry="${3 * s}" fill="#444" />
        <circle cx="${lx - 2}" cy="${ly - 1}" r="${1.5 * s}" fill="rgba(255,255,255,0.6)" />
        <circle cx="${rx - 2}" cy="${ry - 1}" r="${1.5 * s}" fill="rgba(255,255,255,0.6)" />
      `;
    default: // normal/working
      return `
        <circle cx="${lx}" cy="${ly}" r="${6 * s}" fill="${c}" /><circle cx="${rx}" cy="${ry}" r="${6 * s}" fill="${c}" />
        <circle cx="${lx + 1}" cy="${ly + 1}" r="${3 * s}" fill="#333" /><circle cx="${rx + 1}" cy="${ry + 1}" r="${3 * s}" fill="#333" />
      `;
  }
}

function getAnimeEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  // Larger, rounder eyes with inner highlights and shine
  switch (status) {
    case 'blocked':
      return `
        <ellipse cx="${lx}" cy="${ly}" rx="${9 * s}" ry="${10 * s}" fill="${c}" />
        <ellipse cx="${rx}" cy="${ry}" rx="${9 * s}" ry="${10 * s}" fill="${c}" />
        <ellipse cx="${lx}" cy="${ly + 1}" rx="${5 * s}" ry="${6 * s}" fill="#333" />
        <ellipse cx="${rx}" cy="${ry + 1}" rx="${5 * s}" ry="${6 * s}" fill="#333" />
        <circle cx="${lx - 2}" cy="${ly - 3}" r="${2.5 * s}" fill="white" opacity="0.9" />
        <circle cx="${rx - 2}" cy="${ry - 3}" r="${2.5 * s}" fill="white" opacity="0.9" />
      `;
    case 'error':
      return `
        <ellipse cx="${lx}" cy="${ly - 2}" rx="${8 * s}" ry="${7 * s}" fill="${c}" />
        <ellipse cx="${rx}" cy="${ry + 2}" rx="${8 * s}" ry="${7 * s}" fill="${c}" />
        <ellipse cx="${lx}" cy="${ly - 1}" rx="${4 * s}" ry="${4 * s}" fill="#333" />
        <ellipse cx="${rx}" cy="${ry + 3}" rx="${4 * s}" ry="${4 * s}" fill="#333" />
        <circle cx="${lx - 3}" cy="${ly - 4}" r="${2 * s}" fill="white" opacity="0.8" />
        <circle cx="${rx - 3}" cy="${ry}" r="${2 * s}" fill="white" opacity="0.8" />
      `;
    default:
      return `
        <ellipse cx="${lx}" cy="${ly}" rx="${8 * s}" ry="${9 * s}" fill="${c}" />
        <ellipse cx="${rx}" cy="${ry}" rx="${8 * s}" ry="${9 * s}" fill="${c}" />
        <ellipse cx="${lx + 1}" cy="${ly + 2}" rx="${4 * s}" ry="${5 * s}" fill="#333" />
        <ellipse cx="${rx + 1}" cy="${ry + 2}" rx="${4 * s}" ry="${5 * s}" fill="#333" />
        <circle cx="${lx - 2}" cy="${ly - 3}" r="${2.5 * s}" fill="white" opacity="0.9" />
        <circle cx="${rx - 2}" cy="${ry - 3}" r="${2.5 * s}" fill="white" opacity="0.9" />
        <circle cx="${lx + 2}" cy="${ly}" r="${1 * s}" fill="white" opacity="0.5" />
        <circle cx="${rx + 2}" cy="${ry}" r="${1 * s}" fill="white" opacity="0.5" />
      `;
  }
}

function getVisorEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  // Single horizontal visor band across face
  const cx = (lx + rx) / 2;
  const cy = (ly + ry) / 2;
  const w = (rx - lx) + 16 * s;
  const h = 8 * s;
  const visorColor = status === 'blocked' ? '#fbbf24' : status === 'error' ? '#c084fc' : status === 'server_running' ? '#10b981' : '#60a5fa';

  return `
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${3 * s}" fill="#1f2937" stroke="#374151" stroke-width="1" />
    <rect x="${cx - w / 2 + 3}" y="${cy - h / 2 + 2}" width="${w - 6}" height="${h - 4}" rx="${2 * s}" fill="${visorColor}" opacity="${status === 'idle' ? 0.3 : 0.7}" />
    ${status === 'blocked' ? `
      <circle cx="${lx}" cy="${cy}" r="${2 * s}" fill="white" />
      <circle cx="${rx}" cy="${cy}" r="${2 * s}" fill="white" />
    ` : `
      <rect x="${lx - 2}" y="${cy - 1}" width="${4 * s}" height="${2 * s}" fill="white" opacity="0.8" rx="1" />
      <rect x="${rx - 2}" y="${cy - 1}" width="${4 * s}" height="${2 * s}" fill="white" opacity="0.8" rx="1" />
    `}
  `;
}

function getLedEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  // 3x2 LED dot matrix per eye
  const dotR = 1.5 * s;
  const gap = 4 * s;
  const ledColor = status === 'blocked' ? '#fbbf24' : status === 'error' ? '#c084fc' : status === 'server_running' ? '#10b981' : c;
  const brightness = status === 'idle' ? 0.4 : 0.9;

  function ledGrid(cx: number, cy: number) {
    const dots = [];
    for (let row = -1; row <= 0; row++) {
      for (let col = -1; col <= 1; col++) {
        const on = status === 'blocked' || (status !== 'error' || (row + col) % 2 === 0);
        dots.push(`<circle cx="${cx + col * gap}" cy="${cy + row * gap}" r="${dotR}" fill="${on ? ledColor : '#333'}" opacity="${on ? brightness : 0.2}" />`);
      }
    }
    return dots.join('');
  }

  return `
    <rect x="${lx - gap - 2}" y="${ly - gap - 2}" width="${gap * 2 + 4 + dotR * 2}" height="${gap + 4 + dotR * 2}" rx="2" fill="#111" opacity="0.3" />
    <rect x="${rx - gap - 2}" y="${ry - gap - 2}" width="${gap * 2 + 4 + dotR * 2}" height="${gap + 4 + dotR * 2}" rx="2" fill="#111" opacity="0.3" />
    ${ledGrid(lx, ly)}
    ${ledGrid(rx, ry)}
  `;
}

function getMismatchedEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  // One big eye, one small eye
  const bigR = 8 * s;
  const smallR = 4 * s;

  switch (status) {
    case 'blocked':
      return `
        <circle cx="${lx}" cy="${ly}" r="${bigR}" fill="${c}" />
        <circle cx="${rx}" cy="${ry}" r="${smallR + 2}" fill="${c}" />
        <circle cx="${lx}" cy="${ly}" r="${bigR * 0.5}" fill="#333" />
        <circle cx="${rx}" cy="${ry}" r="${smallR * 0.5}" fill="#333" />
      `;
    case 'error':
      return `
        <circle cx="${lx}" cy="${ly - 3}" r="${bigR}" fill="${c}" />
        <circle cx="${rx}" cy="${ry + 1}" r="${smallR}" fill="${c}" />
        <circle cx="${lx}" cy="${ly - 3}" r="${bigR * 0.4}" fill="#333" />
        <circle cx="${rx}" cy="${ry + 1}" r="${smallR * 0.4}" fill="#333" />
      `;
    default:
      return `
        <circle cx="${lx}" cy="${ly}" r="${bigR}" fill="${c}" />
        <circle cx="${rx}" cy="${ry}" r="${smallR}" fill="${c}" />
        <circle cx="${lx + 1}" cy="${ly + 1}" r="${bigR * 0.4}" fill="#333" />
        <circle cx="${rx + 0.5}" cy="${ry + 0.5}" r="${smallR * 0.4}" fill="#333" />
        <circle cx="${lx - 2}" cy="${ly - 2}" r="${2 * s}" fill="white" opacity="0.6" />
      `;
  }
}

function getSleepyEyes(status: EyeStatus, lx: number, ly: number, rx: number, ry: number, s: number, c: string): string {
  // Half-lid default with droopy upper lids
  if (status === 'blocked') {
    // Wake up wide for blocked
    return getDotsEyes('blocked', lx, ly, rx, ry, s, c);
  }

  const lidOffset = status === 'idle' ? 3 : 2;
  return `
    <ellipse cx="${lx}" cy="${ly}" rx="${6 * s}" ry="${5 * s}" fill="${c}" />
    <ellipse cx="${rx}" cy="${ry}" rx="${6 * s}" ry="${5 * s}" fill="${c}" />
    <ellipse cx="${lx + 1}" cy="${ly + 1}" rx="${3 * s}" ry="${2.5 * s}" fill="#333" />
    <ellipse cx="${rx + 1}" cy="${ry + 1}" rx="${3 * s}" ry="${2.5 * s}" fill="#333" />
    <path d="M ${lx - 7 * s},${ly - 2} Q ${lx},${ly - 6 * s + lidOffset} ${lx + 7 * s},${ly - 2}" fill="#333" opacity="0.15" />
    <path d="M ${rx - 7 * s},${ry - 2} Q ${rx},${ry - 6 * s + lidOffset} ${rx + 7 * s},${ry - 2}" fill="#333" opacity="0.15" />
  `;
}

// --- Mouth SVG Fragments ---

export type MouthStatus = 'normal' | 'blocked' | 'error' | 'rate_limited' | 'server_running' | 'complete' | 'sleeping' | 'tired' | 'idle';

export function getMouthSVG(style: MouthStyle, status: MouthStatus, cx: number, cy: number): string {
  // Status overrides for all styles
  if (status === 'blocked') return getMouthBlocked(style, cx, cy);
  if (status === 'error') return getMouthError(style, cx, cy);
  if (status === 'complete') return getMouthComplete(style, cx, cy);

  switch (style) {
    case 'line':
      return getMouthLine(status, cx, cy);
    case 'toothy':
      return getMouthToothy(status, cx, cy);
    case 'speaker':
      return getMouthSpeaker(status, cx, cy);
    case 'beak':
      return getMouthBeak(status, cx, cy);
  }
}

function getMouthBlocked(style: MouthStyle, cx: number, cy: number): string {
  if (style === 'beak') {
    return `<path d="M ${cx - 6},${cy - 2} L ${cx},${cy + 6} L ${cx + 6},${cy - 2} Z" fill="#333" opacity="0.8" />`;
  }
  if (style === 'speaker') {
    return `
      <rect x="${cx - 8}" y="${cy - 5}" width="16" height="10" rx="2" fill="#333" opacity="0.6" />
      <line x1="${cx - 4}" y1="${cy}" x2="${cx + 4}" y2="${cy}" stroke="#666" stroke-width="1" />
    `;
  }
  // Default worried O mouth
  return `<ellipse cx="${cx}" cy="${cy}" rx="8" ry="6" fill="#333" />`;
}

function getMouthError(style: MouthStyle, cx: number, cy: number): string {
  if (style === 'beak') {
    return `<path d="M ${cx - 5},${cy} L ${cx},${cy + 4} L ${cx + 5},${cy}" fill="none" stroke="#333" stroke-width="2" />`;
  }
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="5" ry="6" fill="none" stroke="#333" stroke-width="2.5" />
    <text x="${cx + 23}" y="${cy - 8}" font-size="10" fill="#a855f7" opacity="0.6">?</text>
  `;
}

function getMouthComplete(style: MouthStyle, cx: number, cy: number): string {
  if (style === 'toothy') {
    return `
      <path d="M ${cx - 12},${cy - 2} Q ${cx},${cy + 12} ${cx + 12},${cy - 2}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />
      <rect x="${cx - 6}" y="${cy}" width="4" height="3" rx="0.5" fill="white" />
      <rect x="${cx + 2}" y="${cy}" width="4" height="3" rx="0.5" fill="white" />
    `;
  }
  if (style === 'beak') {
    return `<path d="M ${cx - 6},${cy - 1} L ${cx},${cy + 5} L ${cx + 6},${cy - 1}" fill="#fbbf24" stroke="#92400e" stroke-width="1" />`;
  }
  return `<path d="M ${cx - 15},${cy - 2} Q ${cx},${cy + 13} ${cx + 15},${cy - 2}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />`;
}

function getMouthLine(status: MouthStatus, cx: number, cy: number): string {
  if (status === 'rate_limited' || status === 'server_running') {
    return `<path d="M ${cx - 8},${cy - 1} Q ${cx},${cy + 4} ${cx + 8},${cy - 1}" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round" />`;
  }
  if (status === 'sleeping' || status === 'idle' || status === 'tired') {
    return `<line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" stroke="#333" stroke-width="3" stroke-linecap="round" />`;
  }
  // Working - determined smile
  return `<path d="M ${cx - 10},${cy - 2} Q ${cx},${cy + 7} ${cx + 10},${cy - 2}" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round" />`;
}

function getMouthToothy(status: MouthStatus, cx: number, cy: number): string {
  if (status === 'sleeping' || status === 'idle' || status === 'tired') {
    return `<line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" stroke="#333" stroke-width="3" stroke-linecap="round" />`;
  }
  // Toothy grin
  return `
    <path d="M ${cx - 10},${cy - 2} Q ${cx},${cy + 7} ${cx + 10},${cy - 2}" stroke="#333" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <rect x="${cx - 5}" y="${cy}" width="3" height="2.5" rx="0.5" fill="white" />
    <rect x="${cx + 2}" y="${cy}" width="3" height="2.5" rx="0.5" fill="white" />
  `;
}

function getMouthSpeaker(status: MouthStatus, cx: number, cy: number): string {
  // Grille/vent pattern
  const opacity = status === 'idle' || status === 'sleeping' ? 0.3 : 0.6;
  return `
    <rect x="${cx - 8}" y="${cy - 4}" width="16" height="8" rx="2" fill="#333" opacity="${opacity}" />
    <line x1="${cx - 5}" y1="${cy - 1}" x2="${cx + 5}" y2="${cy - 1}" stroke="#555" stroke-width="0.8" />
    <line x1="${cx - 5}" y1="${cy + 1}" x2="${cx + 5}" y2="${cy + 1}" stroke="#555" stroke-width="0.8" />
  `;
}

function getMouthBeak(status: MouthStatus, cx: number, cy: number): string {
  if (status === 'sleeping' || status === 'idle') {
    return `<path d="M ${cx - 5},${cy} L ${cx},${cy + 3} L ${cx + 5},${cy}" fill="#fbbf24" stroke="#92400e" stroke-width="1" />`;
  }
  // Open beak
  return `
    <path d="M ${cx - 6},${cy - 1} L ${cx},${cy - 4} L ${cx + 6},${cy - 1}" fill="#fbbf24" stroke="#92400e" stroke-width="1" />
    <path d="M ${cx - 5},${cy + 1} L ${cx},${cy + 4} L ${cx + 5},${cy + 1}" fill="#f59e0b" stroke="#92400e" stroke-width="1" />
  `;
}

// --- Accessories ---

export type AccessorySlot = 'head' | 'eyes' | 'neck' | 'back';

export interface AccessoryDef {
  id: string;
  slot: AccessorySlot;
  name: string;
}

const HEAD_ACCESSORIES: AccessoryDef[] = [
  { id: 'hard-hat', slot: 'head', name: 'Hard Hat' },
  { id: 'beret', slot: 'head', name: 'Beret' },
  { id: 'top-hat', slot: 'head', name: 'Top Hat' },
  { id: 'beanie', slot: 'head', name: 'Beanie' },
  { id: 'crown', slot: 'head', name: 'Crown' },
  { id: 'chef-hat', slot: 'head', name: 'Chef Hat' },
  { id: 'cowboy-hat', slot: 'head', name: 'Cowboy Hat' },
  { id: 'party-hat', slot: 'head', name: 'Party Hat' },
  { id: 'headband', slot: 'head', name: 'Headband' },
  { id: 'flower-crown', slot: 'head', name: 'Flower Crown' },
];

const EYE_ACCESSORIES: AccessoryDef[] = [
  { id: 'glasses', slot: 'eyes', name: 'Glasses' },
  { id: 'monocle', slot: 'eyes', name: 'Monocle' },
  { id: 'sunglasses', slot: 'eyes', name: 'Sunglasses' },
  { id: 'welding-goggles', slot: 'eyes', name: 'Welding Goggles' },
  { id: 'vr-headset', slot: 'eyes', name: 'VR Headset' },
  { id: 'reading-glasses', slot: 'eyes', name: 'Reading Glasses' },
];

const NECK_ACCESSORIES: AccessoryDef[] = [
  { id: 'scarf', slot: 'neck', name: 'Scarf' },
  { id: 'bowtie', slot: 'neck', name: 'Bowtie' },
  { id: 'bandana', slot: 'neck', name: 'Bandana' },
  { id: 'medal', slot: 'neck', name: 'Medal' },
];

const BACK_ACCESSORIES: AccessoryDef[] = [
  { id: 'backpack', slot: 'back', name: 'Backpack' },
  { id: 'cape', slot: 'back', name: 'Cape' },
  { id: 'jetpack', slot: 'back', name: 'Jetpack' },
  { id: 'wings', slot: 'back', name: 'Wings' },
];

const ALL_ACCESSORIES = [...HEAD_ACCESSORIES, ...EYE_ACCESSORIES, ...NECK_ACCESSORIES, ...BACK_ACCESSORIES];

export function selectAccessories(agentId: string): AccessoryDef[] {
  const h = hashString((agentId || '') + '-acc');
  const count = h % 5; // 0, 1, or 2 accessories (weighted: 0=20%, 1=40%, 2=40%)
  const numAccessories = count < 1 ? 0 : count < 3 ? 1 : 2;

  if (numAccessories === 0) return [];

  const results: AccessoryDef[] = [];
  const usedSlots = new Set<AccessorySlot>();

  for (let i = 0; i < numAccessories; i++) {
    const idx = Math.floor(h / (97 * (i + 1))) % ALL_ACCESSORIES.length;
    const acc = ALL_ACCESSORIES[idx];
    if (!usedSlots.has(acc.slot)) {
      results.push(acc);
      usedSlots.add(acc.slot);
    }
  }

  return results;
}

// --- Accessory SVG Rendering ---

export function getAccessorySVG(acc: AccessoryDef, anchors: Anchors, bodyColor: string): string {
  const topY = anchors.bodyTopY;
  const cx = anchors.bodyCenterX;
  const ely = anchors.eyeLeftY;
  const elx = anchors.eyeLeftX;
  const erx = anchors.eyeRightX;

  switch (acc.id) {
    // --- Head ---
    case 'hard-hat':
      return `
        <rect x="${cx - 18}" y="${topY - 12}" width="36" height="8" rx="2" fill="#fbbf24" />
        <rect x="${cx - 14}" y="${topY - 18}" width="28" height="10" rx="4" fill="#f59e0b" />
        <rect x="${cx - 4}" y="${topY - 20}" width="8" height="4" rx="2" fill="#fbbf24" />
      `;
    case 'beret':
      return `
        <ellipse cx="${cx + 4}" cy="${topY - 6}" rx="16" ry="8" fill="#991b1b" />
        <circle cx="${cx + 4}" cy="${topY - 12}" r="3" fill="#991b1b" />
      `;
    case 'top-hat':
      return `
        <rect x="${cx - 16}" y="${topY - 6}" width="32" height="4" rx="2" fill="#1f2937" />
        <rect x="${cx - 10}" y="${topY - 24}" width="20" height="20" rx="2" fill="#1f2937" />
        <rect x="${cx - 8}" y="${topY - 16}" width="16" height="2" fill="#6366f1" />
      `;
    case 'beanie':
      return `
        <path d="M ${cx - 14},${topY - 2} Q ${cx - 14},${topY - 14} ${cx},${topY - 14} Q ${cx + 14},${topY - 14} ${cx + 14},${topY - 2}" fill="#3b82f6" />
        <rect x="${cx - 14}" y="${topY - 4}" width="28" height="4" rx="1" fill="#1d4ed8" />
        <circle cx="${cx}" cy="${topY - 16}" r="3" fill="#60a5fa" />
      `;
    case 'crown':
      return `
        <polygon points="${cx - 12},${topY - 2} ${cx - 14},${topY - 14} ${cx - 8},${topY - 8} ${cx},${topY - 16} ${cx + 8},${topY - 8} ${cx + 14},${topY - 14} ${cx + 12},${topY - 2}" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
        <circle cx="${cx}" cy="${topY - 10}" r="2" fill="#ef4444" />
        <circle cx="${cx - 8}" cy="${topY - 6}" r="1.5" fill="#3b82f6" />
        <circle cx="${cx + 8}" cy="${topY - 6}" r="1.5" fill="#22c55e" />
      `;
    case 'chef-hat':
      return `
        <rect x="${cx - 12}" y="${topY - 6}" width="24" height="8" rx="2" fill="white" />
        <ellipse cx="${cx}" cy="${topY - 10}" rx="14" ry="10" fill="white" />
        <path d="M ${cx - 12},${topY - 6} Q ${cx - 14},${topY - 18} ${cx},${topY - 20} Q ${cx + 14},${topY - 18} ${cx + 12},${topY - 6}" fill="white" stroke="#e5e7eb" stroke-width="0.5" />
      `;
    case 'cowboy-hat':
      return `
        <path d="M ${cx - 22},${topY - 4} Q ${cx - 12},${topY - 8} ${cx},${topY - 16} Q ${cx + 12},${topY - 8} ${cx + 22},${topY - 4} Q ${cx + 14},${topY - 2} ${cx},${topY - 2} Q ${cx - 14},${topY - 2} ${cx - 22},${topY - 4} Z" fill="#92400e" />
        <rect x="${cx - 12}" y="${topY - 4}" width="24" height="3" rx="1" fill="#78350f" />
      `;
    case 'party-hat':
      return `
        <polygon points="${cx - 10},${topY - 2} ${cx},${topY - 22} ${cx + 10},${topY - 2}" fill="#ec4899" stroke="#db2777" stroke-width="0.5" />
        <circle cx="${cx}" cy="${topY - 23}" r="3" fill="#fbbf24" />
        <line x1="${cx - 5}" y1="${topY - 8}" x2="${cx + 5}" y2="${topY - 8}" stroke="#fbbf24" stroke-width="1" />
        <line x1="${cx - 3}" y1="${topY - 14}" x2="${cx + 3}" y2="${topY - 14}" stroke="#3b82f6" stroke-width="1" />
      `;
    case 'headband':
      return `
        <rect x="${cx - 16}" y="${topY - 4}" width="32" height="4" rx="1" fill="#ef4444" />
      `;
    case 'flower-crown':
      return `
        <path d="M ${cx - 14},${topY - 4} Q ${cx},${topY - 10} ${cx + 14},${topY - 4}" fill="none" stroke="#16a34a" stroke-width="2" />
        <circle cx="${cx - 10}" cy="${topY - 6}" r="3" fill="#f472b6" /><circle cx="${cx - 10}" cy="${topY - 6}" r="1" fill="#fbbf24" />
        <circle cx="${cx}" cy="${topY - 8}" r="3.5" fill="#fb923c" /><circle cx="${cx}" cy="${topY - 8}" r="1.2" fill="#fbbf24" />
        <circle cx="${cx + 10}" cy="${topY - 6}" r="3" fill="#a78bfa" /><circle cx="${cx + 10}" cy="${topY - 6}" r="1" fill="#fbbf24" />
      `;

    // --- Eyes ---
    case 'glasses':
      return `
        <circle cx="${elx}" cy="${ely}" r="${8}" fill="none" stroke="#374151" stroke-width="1.5" />
        <circle cx="${erx}" cy="${ely}" r="${8}" fill="none" stroke="#374151" stroke-width="1.5" />
        <line x1="${elx + 8}" y1="${ely}" x2="${erx - 8}" y2="${ely}" stroke="#374151" stroke-width="1.5" />
        <line x1="${elx - 8}" y1="${ely}" x2="${elx - 14}" y2="${ely - 2}" stroke="#374151" stroke-width="1.5" />
        <line x1="${erx + 8}" y1="${ely}" x2="${erx + 14}" y2="${ely - 2}" stroke="#374151" stroke-width="1.5" />
      `;
    case 'monocle':
      return `
        <circle cx="${erx}" cy="${ely}" r="${9}" fill="none" stroke="#d4a574" stroke-width="2" />
        <line x1="${erx}" y1="${ely + 9}" x2="${erx + 2}" y2="${ely + 20}" stroke="#d4a574" stroke-width="1" />
      `;
    case 'sunglasses':
      return `
        <rect x="${elx - 9}" y="${ely - 5}" width="18" height="10" rx="2" fill="#1f2937" opacity="0.85" />
        <rect x="${erx - 9}" y="${ely - 5}" width="18" height="10" rx="2" fill="#1f2937" opacity="0.85" />
        <line x1="${elx + 9}" y1="${ely}" x2="${erx - 9}" y2="${ely}" stroke="#374151" stroke-width="2" />
        <rect x="${elx - 7}" y="${ely - 3}" width="6" height="2" rx="1" fill="white" opacity="0.15" />
        <rect x="${erx - 7}" y="${ely - 3}" width="6" height="2" rx="1" fill="white" opacity="0.15" />
      `;
    case 'welding-goggles':
      return `
        <rect x="${elx - 12}" y="${ely - 7}" width="${erx - elx + 24}" height="14" rx="4" fill="#374151" stroke="#6b7280" stroke-width="1" />
        <circle cx="${elx}" cy="${ely}" r="7" fill="#1f2937" stroke="#4ade80" stroke-width="1.5" opacity="0.8" />
        <circle cx="${erx}" cy="${ely}" r="7" fill="#1f2937" stroke="#4ade80" stroke-width="1.5" opacity="0.8" />
      `;
    case 'vr-headset':
      return `
        <rect x="${elx - 14}" y="${ely - 8}" width="${erx - elx + 28}" height="16" rx="5" fill="#1f2937" stroke="#6366f1" stroke-width="1" />
        <rect x="${cx - 4}" y="${ely - 4}" width="8" height="8" rx="2" fill="#4f46e5" opacity="0.6" />
      `;
    case 'reading-glasses':
      return `
        <ellipse cx="${elx}" cy="${ely + 2}" rx="8" ry="6" fill="none" stroke="#9ca3af" stroke-width="1" />
        <ellipse cx="${erx}" cy="${ely + 2}" rx="8" ry="6" fill="none" stroke="#9ca3af" stroke-width="1" />
        <line x1="${elx + 8}" y1="${ely + 2}" x2="${erx - 8}" y2="${ely + 2}" stroke="#9ca3af" stroke-width="1" />
      `;

    // --- Neck ---
    case 'scarf':
      return `
        <path d="M ${cx - 20},${anchors.mouthY + 6} Q ${cx},${anchors.mouthY + 10} ${cx + 20},${anchors.mouthY + 6}" fill="#ef4444" />
        <rect x="${cx + 10}" y="${anchors.mouthY + 6}" width="6" height="14" rx="2" fill="#dc2626" />
      `;
    case 'bowtie':
      return `
        <polygon points="${cx - 8},${anchors.mouthY + 6} ${cx},${anchors.mouthY + 3} ${cx},${anchors.mouthY + 9}" fill="#6366f1" />
        <polygon points="${cx + 8},${anchors.mouthY + 6} ${cx},${anchors.mouthY + 3} ${cx},${anchors.mouthY + 9}" fill="#6366f1" />
        <circle cx="${cx}" cy="${anchors.mouthY + 6}" r="2" fill="#4f46e5" />
      `;
    case 'bandana':
      return `
        <path d="M ${cx - 18},${anchors.mouthY + 4} Q ${cx},${anchors.mouthY + 8} ${cx + 18},${anchors.mouthY + 4}" fill="#22c55e" opacity="0.8" />
        <path d="M ${cx - 12},${anchors.mouthY + 8} L ${cx - 14},${anchors.mouthY + 14}" stroke="#16a34a" stroke-width="2" fill="none" />
      `;
    case 'medal':
      return `
        <line x1="${cx}" y1="${anchors.mouthY + 4}" x2="${cx}" y2="${anchors.mouthY + 14}" stroke="#6366f1" stroke-width="2" />
        <circle cx="${cx}" cy="${anchors.mouthY + 16}" r="5" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
        <text x="${cx}" y="${anchors.mouthY + 18}" font-size="5" fill="#92400e" text-anchor="middle">★</text>
      `;

    // --- Back ---
    case 'backpack':
      return `
        <rect x="${anchors.armLeftX - 2}" y="${anchors.armLeftY - 8}" width="12" height="18" rx="3" fill="#7c3aed" />
        <rect x="${anchors.armLeftX}" y="${anchors.armLeftY - 4}" width="8" height="6" rx="1" fill="#6d28d9" />
        <rect x="${anchors.armLeftX + 2}" y="${anchors.armLeftY - 10}" width="2" height="4" rx="1" fill="#5b21b6" />
        <rect x="${anchors.armLeftX + 6}" y="${anchors.armLeftY - 10}" width="2" height="4" rx="1" fill="#5b21b6" />
      `;
    case 'cape':
      return `
        <path d="M ${anchors.armLeftX + 12},${anchors.armLeftY - 4} Q ${anchors.armLeftX - 6},${anchors.armLeftY + 20} ${anchors.armLeftX + 4},${anchors.legLeftY + 8}" fill="#dc2626" opacity="0.7" />
      `;
    case 'jetpack':
      return `
        <rect x="${anchors.armLeftX - 4}" y="${anchors.armLeftY - 6}" width="14" height="20" rx="3" fill="#6b7280" />
        <circle cx="${anchors.armLeftX}" cy="${anchors.armLeftY + 2}" r="4" fill="#374151" stroke="#9ca3af" stroke-width="1" />
        <circle cx="${anchors.armLeftX + 6}" cy="${anchors.armLeftY + 2}" r="4" fill="#374151" stroke="#9ca3af" stroke-width="1" />
        <path d="M ${anchors.armLeftX - 1},${anchors.armLeftY + 14} L ${anchors.armLeftX + 1},${anchors.armLeftY + 22}" stroke="#f59e0b" stroke-width="2" opacity="0.6" />
        <path d="M ${anchors.armLeftX + 5},${anchors.armLeftY + 14} L ${anchors.armLeftX + 7},${anchors.armLeftY + 22}" stroke="#f59e0b" stroke-width="2" opacity="0.6" />
      `;
    case 'wings':
      return `
        <path d="M ${anchors.armLeftX + 10},${anchors.armLeftY - 2} Q ${anchors.armLeftX - 12},${anchors.armLeftY - 10} ${anchors.armLeftX - 8},${anchors.armLeftY + 8} Q ${anchors.armLeftX - 4},${anchors.armLeftY + 2} ${anchors.armLeftX + 10},${anchors.armLeftY}" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" stroke-width="0.5" />
        <path d="M ${anchors.armRightX + 4},${anchors.armRightY - 2} Q ${anchors.armRightX + 26},${anchors.armRightY - 10} ${anchors.armRightX + 22},${anchors.armRightY + 8} Q ${anchors.armRightX + 18},${anchors.armRightY + 2} ${anchors.armRightX + 4},${anchors.armRightY}" fill="rgba(255,255,255,0.3)" stroke="rgba(255,255,255,0.5)" stroke-width="0.5" />
      `;

    default:
      return '';
  }
}
