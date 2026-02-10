/**
 * World Biomes - Unique themed environments for each project card
 *
 * Each project gets a deterministic biome based on a hash of its path.
 * Biomes define background layers, ground, ambient details, and mood.
 *
 * 15 biomes × time-of-day × weather = massive environmental variety.
 */

// --- Types ---

export type BiomeId =
  | 'library' | 'space-station' | 'garden' | 'workshop' | 'aquarium'
  | 'treehouse' | 'kitchen' | 'rooftop' | 'crystal-cave' | 'arctic'
  | 'desert' | 'dojo' | 'greenhouse' | 'music-room' | 'campfire';

export type BubbleStyleId = 'default' | 'handwritten' | 'thought-cloud' | 'post-it' | 'terminal' | 'scroll';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  bubbleStyle: BubbleStyleId;
  /** Accent color for card border tint */
  accentColor: string;
  /** Whether this biome is dark (affects bubble contrast) */
  isDark: boolean;
  /** Ambient creatures that can appear */
  creatures: string[];
  /** Background gradient colors [top, bottom] */
  skyGradient: [string, string];
  /** Ground color */
  groundColor: string;
}

// --- Hash Function ---

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// --- Biome Definitions ---

const BIOMES: BiomeDef[] = [
  {
    id: 'library', name: 'Library',
    bubbleStyle: 'scroll', accentColor: '#92400e',
    isDark: true, creatures: ['dust-mote', 'moth'],
    skyGradient: ['#292018', '#1a1410'],
    groundColor: '#5c3a1e',
  },
  {
    id: 'space-station', name: 'Space Station',
    bubbleStyle: 'terminal', accentColor: '#3b82f6',
    isDark: true, creatures: ['star', 'asteroid'],
    skyGradient: ['#0a0a1a', '#050510'],
    groundColor: '#374151',
  },
  {
    id: 'garden', name: 'Garden',
    bubbleStyle: 'handwritten', accentColor: '#22c55e',
    isDark: false, creatures: ['butterfly', 'ladybug', 'bee'],
    skyGradient: ['#7dd3fc', '#bae6fd'],
    groundColor: '#4ade80',
  },
  {
    id: 'workshop', name: 'Workshop',
    bubbleStyle: 'post-it', accentColor: '#f59e0b',
    isDark: true, creatures: ['spark'],
    skyGradient: ['#292524', '#1c1917'],
    groundColor: '#78716c',
  },
  {
    id: 'aquarium', name: 'Aquarium',
    bubbleStyle: 'default', accentColor: '#06b6d4',
    isDark: true, creatures: ['fish', 'bubble', 'seahorse'],
    skyGradient: ['#083344', '#042f2e'],
    groundColor: '#d4a574',
  },
  {
    id: 'treehouse', name: 'Treehouse',
    bubbleStyle: 'handwritten', accentColor: '#84cc16',
    isDark: false, creatures: ['bird', 'squirrel'],
    skyGradient: ['#365314', '#1a2e05'],
    groundColor: '#92400e',
  },
  {
    id: 'kitchen', name: 'Kitchen',
    bubbleStyle: 'post-it', accentColor: '#f97316',
    isDark: false, creatures: ['steam'],
    skyGradient: ['#fef3c7', '#fde68a'],
    groundColor: '#d6d3d1',
  },
  {
    id: 'rooftop', name: 'Rooftop',
    bubbleStyle: 'default', accentColor: '#8b5cf6',
    isDark: true, creatures: ['pigeon', 'plane'],
    skyGradient: ['#1e1b4b', '#312e81'],
    groundColor: '#57534e',
  },
  {
    id: 'crystal-cave', name: 'Crystal Cave',
    bubbleStyle: 'terminal', accentColor: '#a78bfa',
    isDark: true, creatures: ['glow-mushroom', 'crystal-sparkle'],
    skyGradient: ['#1e1338', '#0f0a1f'],
    groundColor: '#44403c',
  },
  {
    id: 'arctic', name: 'Arctic',
    bubbleStyle: 'default', accentColor: '#67e8f9',
    isDark: false, creatures: ['snowflake', 'penguin'],
    skyGradient: ['#0c4a6e', '#164e63'],
    groundColor: '#e0f2fe',
  },
  {
    id: 'desert', name: 'Desert',
    bubbleStyle: 'scroll', accentColor: '#f59e0b',
    isDark: false, creatures: ['tumbleweed'],
    skyGradient: ['#f97316', '#ea580c'],
    groundColor: '#d4a574',
  },
  {
    id: 'dojo', name: 'Dojo',
    bubbleStyle: 'scroll', accentColor: '#dc2626',
    isDark: true, creatures: ['incense-smoke'],
    skyGradient: ['#292524', '#1c1917'],
    groundColor: '#a3e635',
  },
  {
    id: 'greenhouse', name: 'Greenhouse',
    bubbleStyle: 'handwritten', accentColor: '#4ade80',
    isDark: false, creatures: ['butterfly', 'mist-drop'],
    skyGradient: ['#d1fae5', '#a7f3d0'],
    groundColor: '#78350f',
  },
  {
    id: 'music-room', name: 'Music Room',
    bubbleStyle: 'default', accentColor: '#ec4899',
    isDark: true, creatures: ['music-note'],
    skyGradient: ['#1e1b2e', '#141225'],
    groundColor: '#78350f',
  },
  {
    id: 'campfire', name: 'Campfire',
    bubbleStyle: 'handwritten', accentColor: '#f97316',
    isDark: true, creatures: ['firefly', 'ember'],
    skyGradient: ['#0f172a', '#020617'],
    groundColor: '#57534e',
  },
];

// --- Selection ---

export function selectBiome(projectPath: string): BiomeDef {
  const h = hashString(projectPath || 'default-project');
  return BIOMES[h % BIOMES.length];
}

export function getBiomeById(id: BiomeId): BiomeDef {
  return BIOMES.find(b => b.id === id) || BIOMES[0];
}

// --- SVG Background Rendering ---

export function getBiomeBackgroundSVG(biome: BiomeDef, width: number, height: number): string {
  const w = width;
  const h = height;
  const groundY = h * 0.82;

  // Common defs
  const defs = `
    <defs>
      <linearGradient id="sky-${biome.id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${biome.skyGradient[0]}" />
        <stop offset="100%" stop-color="${biome.skyGradient[1]}" />
      </linearGradient>
    </defs>
  `;

  // Sky
  const sky = `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#sky-${biome.id})" />`;

  // Ground
  const ground = `<rect x="0" y="${groundY}" width="${w}" height="${h - groundY}" fill="${biome.groundColor}" opacity="0.6" />`;
  const groundLine = `<line x1="0" y1="${groundY}" x2="${w}" y2="${groundY}" stroke="${biome.groundColor}" stroke-width="1" opacity="0.4" />`;

  // Biome-specific scenery
  const scenery = getBiomeScenery(biome.id, w, h, groundY);

  return `${defs}${sky}${scenery}${ground}${groundLine}`;
}

function getBiomeScenery(id: BiomeId, w: number, h: number, groundY: number): string {
  switch (id) {
    case 'library':
      return `
        <!-- Bookshelves -->
        <rect x="0" y="${groundY * 0.15}" width="${w * 0.08}" height="${groundY * 0.85}" fill="#5c3a1e" opacity="0.3" />
        ${bookStack(w * 0.01, groundY * 0.2, 6)}
        ${bookStack(w * 0.01, groundY * 0.45, 5)}
        <rect x="${w * 0.92}" y="${groundY * 0.15}" width="${w * 0.08}" height="${groundY * 0.85}" fill="#5c3a1e" opacity="0.3" />
        ${bookStack(w * 0.93, groundY * 0.25, 4)}
        ${bookStack(w * 0.93, groundY * 0.55, 6)}
        <!-- Candle -->
        <rect x="${w * 0.9}" y="${groundY - 16}" width="4" height="12" fill="#fef3c7" />
        <ellipse cx="${w * 0.9 + 2}" cy="${groundY - 18}" rx="3" ry="5" fill="#f59e0b" opacity="0.6" />
        <!-- Warm glow -->
        <circle cx="${w * 0.9 + 2}" cy="${groundY - 18}" r="20" fill="#f59e0b" opacity="0.04" />
      `;

    case 'space-station':
      return `
        <!-- Stars -->
        ${stars(w, groundY, 15)}
        <!-- Control panel -->
        <rect x="${w * 0.02}" y="${groundY * 0.5}" width="${w * 0.06}" height="${groundY * 0.4}" rx="2" fill="#1f2937" stroke="#374151" stroke-width="1" opacity="0.5" />
        <circle cx="${w * 0.05}" cy="${groundY * 0.55}" r="2" fill="#22c55e" opacity="0.6" />
        <circle cx="${w * 0.05}" cy="${groundY * 0.62}" r="2" fill="#3b82f6" opacity="0.6" />
        <circle cx="${w * 0.05}" cy="${groundY * 0.69}" r="2" fill="#ef4444" opacity="0.4" />
        <!-- Distant nebula -->
        <ellipse cx="${w * 0.7}" cy="${groundY * 0.3}" rx="${w * 0.15}" ry="${groundY * 0.12}" fill="#6366f1" opacity="0.06" />
      `;

    case 'garden':
      return `
        <!-- Clouds -->
        <ellipse cx="${w * 0.2}" cy="${groundY * 0.15}" rx="30" ry="12" fill="white" opacity="0.3" />
        <ellipse cx="${w * 0.25}" cy="${groundY * 0.14}" rx="20" ry="10" fill="white" opacity="0.25" />
        <ellipse cx="${w * 0.7}" cy="${groundY * 0.22}" rx="25" ry="10" fill="white" opacity="0.25" />
        <!-- Flowers on ground -->
        ${flower(w * 0.05, groundY - 8, '#f472b6')}
        ${flower(w * 0.15, groundY - 6, '#fbbf24')}
        ${flower(w * 0.88, groundY - 7, '#a78bfa')}
        ${flower(w * 0.95, groundY - 5, '#f472b6')}
        <!-- Fence -->
        <line x1="${w * 0.92}" y1="${groundY - 20}" x2="${w * 0.92}" y2="${groundY}" stroke="#92400e" stroke-width="2" opacity="0.3" />
        <line x1="${w * 0.96}" y1="${groundY - 18}" x2="${w * 0.96}" y2="${groundY}" stroke="#92400e" stroke-width="2" opacity="0.3" />
        <line x1="${w * 0.90}" y1="${groundY - 14}" x2="${w * 0.98}" y2="${groundY - 14}" stroke="#92400e" stroke-width="2" opacity="0.3" />
      `;

    case 'workshop':
      return `
        <!-- Pegboard with tools -->
        <rect x="${w * 0.92}" y="${groundY * 0.2}" width="${w * 0.06}" height="${groundY * 0.6}" fill="#44403c" opacity="0.3" />
        <!-- Wrench outline -->
        <circle cx="${w * 0.95}" cy="${groundY * 0.3}" r="3" fill="none" stroke="#9ca3af" stroke-width="1" opacity="0.3" />
        <line x1="${w * 0.95}" y1="${groundY * 0.33}" x2="${w * 0.95}" y2="${groundY * 0.42}" stroke="#9ca3af" stroke-width="1.5" opacity="0.3" />
        <!-- Blueprint corner -->
        <rect x="${w * 0.02}" y="${groundY - 30}" width="20" height="26" fill="#dbeafe" opacity="0.15" transform="rotate(-5 ${w * 0.02} ${groundY - 30})" />
        <!-- Sawdust -->
        <circle cx="${w * 0.1}" cy="${groundY + 3}" r="1" fill="#d4a574" opacity="0.3" />
        <circle cx="${w * 0.14}" cy="${groundY + 5}" r="0.8" fill="#d4a574" opacity="0.25" />
        <circle cx="${w * 0.08}" cy="${groundY + 4}" r="0.6" fill="#d4a574" opacity="0.2" />
      `;

    case 'aquarium':
      return `
        <!-- Water caustics -->
        <path d="M 0,${groundY * 0.1} Q ${w * 0.1},${groundY * 0.05} ${w * 0.2},${groundY * 0.1} Q ${w * 0.3},${groundY * 0.15} ${w * 0.4},${groundY * 0.1} Q ${w * 0.5},${groundY * 0.05} ${w * 0.6},${groundY * 0.1} Q ${w * 0.7},${groundY * 0.15} ${w * 0.8},${groundY * 0.1} Q ${w * 0.9},${groundY * 0.05} ${w},${groundY * 0.1}" fill="none" stroke="#67e8f9" stroke-width="1" opacity="0.1" />
        <!-- Coral -->
        <path d="M ${w * 0.03},${groundY} Q ${w * 0.02},${groundY - 15} ${w * 0.05},${groundY - 20} Q ${w * 0.07},${groundY - 12} ${w * 0.08},${groundY}" fill="#f472b6" opacity="0.25" />
        <!-- Seaweed -->
        <path d="M ${w * 0.92},${groundY} Q ${w * 0.90},${groundY - 18} ${w * 0.93},${groundY - 30} Q ${w * 0.95},${groundY - 20} ${w * 0.94},${groundY}" fill="#4ade80" opacity="0.2" />
        <path d="M ${w * 0.96},${groundY} Q ${w * 0.94},${groundY - 12} ${w * 0.97},${groundY - 22}" fill="none" stroke="#4ade80" stroke-width="2" opacity="0.15" />
        <!-- Bubbles -->
        <circle cx="${w * 0.15}" cy="${groundY * 0.4}" r="3" fill="none" stroke="#67e8f9" stroke-width="0.5" opacity="0.2" />
        <circle cx="${w * 0.85}" cy="${groundY * 0.6}" r="2" fill="none" stroke="#67e8f9" stroke-width="0.5" opacity="0.15" />
      `;

    case 'treehouse':
      return `
        <!-- Branches -->
        <path d="M 0,${groundY * 0.6} Q ${w * 0.1},${groundY * 0.5} ${w * 0.15},${groundY * 0.55}" stroke="#92400e" stroke-width="6" fill="none" opacity="0.3" />
        <path d="M ${w},${groundY * 0.4} Q ${w * 0.85},${groundY * 0.35} ${w * 0.82},${groundY * 0.42}" stroke="#92400e" stroke-width="5" fill="none" opacity="0.25" />
        <!-- Leaves -->
        <ellipse cx="${w * 0.05}" cy="${groundY * 0.45}" rx="12" ry="8" fill="#4ade80" opacity="0.15" />
        <ellipse cx="${w * 0.12}" cy="${groundY * 0.5}" rx="10" ry="6" fill="#22c55e" opacity="0.12" />
        <ellipse cx="${w * 0.9}" cy="${groundY * 0.32}" rx="14" ry="8" fill="#4ade80" opacity="0.12" />
        <!-- Rope ladder -->
        <line x1="${w * 0.04}" y1="${groundY * 0.7}" x2="${w * 0.04}" y2="${groundY}" stroke="#92400e" stroke-width="1.5" opacity="0.2" />
        <line x1="${w * 0.07}" y1="${groundY * 0.7}" x2="${w * 0.07}" y2="${groundY}" stroke="#92400e" stroke-width="1.5" opacity="0.2" />
        <line x1="${w * 0.03}" y1="${groundY * 0.75}" x2="${w * 0.08}" y2="${groundY * 0.75}" stroke="#92400e" stroke-width="1" opacity="0.2" />
        <line x1="${w * 0.03}" y1="${groundY * 0.82}" x2="${w * 0.08}" y2="${groundY * 0.82}" stroke="#92400e" stroke-width="1" opacity="0.2" />
        <!-- Lantern -->
        <rect x="${w * 0.93}" y="${groundY * 0.5}" width="6" height="8" rx="1" fill="#fbbf24" opacity="0.2" />
        <circle cx="${w * 0.93 + 3}" cy="${groundY * 0.5 + 4}" r="8" fill="#fbbf24" opacity="0.04" />
      `;

    case 'kitchen':
      return `
        <!-- Shelves -->
        <line x1="${w * 0.88}" y1="${groundY * 0.3}" x2="${w}" y2="${groundY * 0.3}" stroke="#a8a29e" stroke-width="2" opacity="0.3" />
        <line x1="${w * 0.9}" y1="${groundY * 0.55}" x2="${w}" y2="${groundY * 0.55}" stroke="#a8a29e" stroke-width="2" opacity="0.3" />
        <!-- Pots on shelf -->
        <ellipse cx="${w * 0.93}" cy="${groundY * 0.28}" rx="4" ry="3" fill="#dc2626" opacity="0.25" />
        <ellipse cx="${w * 0.97}" cy="${groundY * 0.28}" rx="3" ry="2.5" fill="#2563eb" opacity="0.2" />
        <!-- Fruit bowl -->
        <ellipse cx="${w * 0.06}" cy="${groundY - 4}" rx="10" ry="5" fill="#78716c" opacity="0.2" />
        <circle cx="${w * 0.04}" cy="${groundY - 7}" r="3" fill="#ef4444" opacity="0.25" />
        <circle cx="${w * 0.07}" cy="${groundY - 8}" r="3" fill="#22c55e" opacity="0.2" />
        <circle cx="${w * 0.06}" cy="${groundY - 6}" r="2.5" fill="#f59e0b" opacity="0.2" />
        <!-- Checkered tile hint -->
        <rect x="0" y="${groundY}" width="${w}" height="${h - groundY}" fill="${'#d6d3d1'}" opacity="0.3" />
      `;

    case 'rooftop':
      return `
        <!-- City skyline -->
        <rect x="${w * 0.05}" y="${groundY * 0.4}" width="${w * 0.04}" height="${groundY * 0.6}" fill="#1e1b4b" opacity="0.2" />
        <rect x="${w * 0.1}" y="${groundY * 0.55}" width="${w * 0.03}" height="${groundY * 0.45}" fill="#1e1b4b" opacity="0.15" />
        <rect x="${w * 0.14}" y="${groundY * 0.35}" width="${w * 0.05}" height="${groundY * 0.65}" fill="#1e1b4b" opacity="0.18" />
        <rect x="${w * 0.82}" y="${groundY * 0.45}" width="${w * 0.04}" height="${groundY * 0.55}" fill="#1e1b4b" opacity="0.15" />
        <rect x="${w * 0.88}" y="${groundY * 0.3}" width="${w * 0.06}" height="${groundY * 0.7}" fill="#1e1b4b" opacity="0.2" />
        <!-- Lit windows -->
        <rect x="${w * 0.06}" y="${groundY * 0.5}" width="3" height="3" fill="#fbbf24" opacity="0.15" />
        <rect x="${w * 0.06}" y="${groundY * 0.6}" width="3" height="3" fill="#fbbf24" opacity="0.1" />
        <rect x="${w * 0.15}" y="${groundY * 0.45}" width="3" height="3" fill="#67e8f9" opacity="0.1" />
        <rect x="${w * 0.89}" y="${groundY * 0.4}" width="4" height="3" fill="#fbbf24" opacity="0.12" />
        <!-- String lights -->
        <path d="M 0,${groundY * 0.18} Q ${w * 0.25},${groundY * 0.22} ${w * 0.5},${groundY * 0.18} Q ${w * 0.75},${groundY * 0.14} ${w},${groundY * 0.18}" fill="none" stroke="#fbbf24" stroke-width="0.5" opacity="0.2" />
        <circle cx="${w * 0.15}" cy="${groundY * 0.21}" r="2" fill="#fbbf24" opacity="0.2" />
        <circle cx="${w * 0.35}" cy="${groundY * 0.21}" r="2" fill="#f472b6" opacity="0.2" />
        <circle cx="${w * 0.55}" cy="${groundY * 0.18}" r="2" fill="#4ade80" opacity="0.2" />
        <circle cx="${w * 0.75}" cy="${groundY * 0.16}" r="2" fill="#67e8f9" opacity="0.2" />
      `;

    case 'crystal-cave':
      return `
        <!-- Stalactites -->
        <polygon points="${w * 0.1},0 ${w * 0.08},${groundY * 0.2} ${w * 0.12},${groundY * 0.2}" fill="#6d28d9" opacity="0.15" />
        <polygon points="${w * 0.3},0 ${w * 0.28},${groundY * 0.15} ${w * 0.32},${groundY * 0.15}" fill="#7c3aed" opacity="0.12" />
        <polygon points="${w * 0.75},0 ${w * 0.73},${groundY * 0.25} ${w * 0.77},${groundY * 0.25}" fill="#6d28d9" opacity="0.1" />
        <polygon points="${w * 0.9},0 ${w * 0.88},${groundY * 0.18} ${w * 0.92},${groundY * 0.18}" fill="#7c3aed" opacity="0.15" />
        <!-- Crystal clusters -->
        <polygon points="${w * 0.04},${groundY} ${w * 0.02},${groundY - 18} ${w * 0.06},${groundY - 12} ${w * 0.08},${groundY}" fill="#a78bfa" opacity="0.2" />
        <polygon points="${w * 0.03},${groundY} ${w * 0.01},${groundY - 10} ${w * 0.05},${groundY}" fill="#c4b5fd" opacity="0.15" />
        <polygon points="${w * 0.94},${groundY} ${w * 0.92},${groundY - 14} ${w * 0.96},${groundY - 8} ${w * 0.98},${groundY}" fill="#a78bfa" opacity="0.18" />
        <!-- Glowing mushrooms -->
        <ellipse cx="${w * 0.08}" cy="${groundY - 3}" rx="4" ry="2.5" fill="#4ade80" opacity="0.15" />
        <rect x="${w * 0.08 - 1}" y="${groundY - 3}" width="2" height="5" fill="#166534" opacity="0.15" />
        <circle cx="${w * 0.08}" cy="${groundY - 3}" r="8" fill="#4ade80" opacity="0.03" />
      `;

    case 'arctic':
      return `
        <!-- Aurora borealis -->
        <path d="M 0,${groundY * 0.15} Q ${w * 0.2},${groundY * 0.08} ${w * 0.4},${groundY * 0.18} Q ${w * 0.6},${groundY * 0.1} ${w * 0.8},${groundY * 0.15} Q ${w * 0.9},${groundY * 0.2} ${w},${groundY * 0.12}" fill="none" stroke="#4ade80" stroke-width="8" opacity="0.06" />
        <path d="M 0,${groundY * 0.2} Q ${w * 0.3},${groundY * 0.12} ${w * 0.5},${groundY * 0.22} Q ${w * 0.7},${groundY * 0.15} ${w},${groundY * 0.18}" fill="none" stroke="#67e8f9" stroke-width="6" opacity="0.05" />
        <!-- Ice formations -->
        <polygon points="${w * 0.02},${groundY} ${w * 0.04},${groundY - 12} ${w * 0.06},${groundY}" fill="#e0f2fe" opacity="0.25" />
        <polygon points="${w * 0.94},${groundY} ${w * 0.96},${groundY - 8} ${w * 0.98},${groundY}" fill="#bae6fd" opacity="0.2" />
        <!-- Snow patches on ground -->
        <ellipse cx="${w * 0.1}" cy="${groundY + 4}" rx="12" ry="3" fill="white" opacity="0.15" />
        <ellipse cx="${w * 0.85}" cy="${groundY + 3}" rx="10" ry="2" fill="white" opacity="0.12" />
      `;

    case 'desert':
      return `
        <!-- Sand dunes -->
        <path d="M 0,${groundY} Q ${w * 0.15},${groundY - 10} ${w * 0.3},${groundY} Q ${w * 0.5},${groundY - 6} ${w * 0.7},${groundY} Q ${w * 0.85},${groundY - 8} ${w},${groundY}" fill="#d4a574" opacity="0.3" />
        <!-- Cactus -->
        <rect x="${w * 0.9}" y="${groundY - 28}" width="5" height="28" rx="2" fill="#4ade80" opacity="0.25" />
        <rect x="${w * 0.9 - 6}" y="${groundY - 18}" width="8" height="4" rx="2" fill="#4ade80" opacity="0.25" />
        <rect x="${w * 0.9 - 6}" y="${groundY - 22}" width="4" height="8" rx="2" fill="#4ade80" opacity="0.25" />
        <rect x="${w * 0.9 + 3}" y="${groundY - 22}" width="8" height="4" rx="2" fill="#22c55e" opacity="0.2" />
        <rect x="${w * 0.9 + 7}" y="${groundY - 26}" width="4" height="8" rx="2" fill="#22c55e" opacity="0.2" />
        <!-- Heat shimmer -->
        <path d="M ${w * 0.2},${groundY - 2} Q ${w * 0.25},${groundY - 4} ${w * 0.3},${groundY - 2}" fill="none" stroke="#f97316" stroke-width="0.5" opacity="0.1" />
      `;

    case 'dojo':
      return `
        <!-- Paper screens -->
        <rect x="${w * 0.92}" y="${groundY * 0.15}" width="${w * 0.06}" height="${groundY * 0.75}" fill="#fef3c7" opacity="0.08" stroke="#92400e" stroke-width="0.5" />
        <line x1="${w * 0.95}" y1="${groundY * 0.15}" x2="${w * 0.95}" y2="${groundY * 0.9}" stroke="#92400e" stroke-width="0.3" opacity="0.15" />
        <line x1="${w * 0.92}" y1="${groundY * 0.5}" x2="${w * 0.98}" y2="${groundY * 0.5}" stroke="#92400e" stroke-width="0.3" opacity="0.15" />
        <!-- Bamboo -->
        <line x1="${w * 0.03}" y1="0" x2="${w * 0.03}" y2="${groundY}" stroke="#4ade80" stroke-width="3" opacity="0.15" />
        <line x1="${w * 0.03}" y1="${groundY * 0.3}" x2="${w * 0.03}" y2="${groundY * 0.3}" stroke="#22c55e" stroke-width="5" opacity="0.1" />
        <path d="M ${w * 0.03},${groundY * 0.25} Q ${w * 0.08},${groundY * 0.2} ${w * 0.1},${groundY * 0.22}" stroke="#4ade80" stroke-width="1" fill="none" opacity="0.1" />
        <!-- Tatami pattern (subtle) -->
        <line x1="0" y1="${groundY + 4}" x2="${w}" y2="${groundY + 4}" stroke="#78350f" stroke-width="0.5" opacity="0.1" />
      `;

    case 'greenhouse':
      return `
        <!-- Glass panels -->
        <line x1="${w * 0.3}" y1="0" x2="${w * 0.3}" y2="${groundY * 0.6}" stroke="#e5e7eb" stroke-width="0.5" opacity="0.1" />
        <line x1="${w * 0.6}" y1="0" x2="${w * 0.6}" y2="${groundY * 0.6}" stroke="#e5e7eb" stroke-width="0.5" opacity="0.1" />
        <!-- Vines -->
        <path d="M 0,${groundY * 0.1} Q ${w * 0.05},${groundY * 0.3} ${w * 0.02},${groundY * 0.5}" stroke="#22c55e" stroke-width="2" fill="none" opacity="0.15" />
        <circle cx="${w * 0.03}" cy="${groundY * 0.2}" r="3" fill="#4ade80" opacity="0.12" />
        <circle cx="${w * 0.01}" cy="${groundY * 0.35}" r="2.5" fill="#4ade80" opacity="0.1" />
        <!-- Potted plants -->
        <rect x="${w * 0.93}" y="${groundY - 8}" width="8" height="8" fill="#92400e" opacity="0.2" />
        <ellipse cx="${w * 0.93 + 4}" cy="${groundY - 12}" rx="8" ry="6" fill="#4ade80" opacity="0.15" />
        <!-- Mist -->
        <ellipse cx="${w * 0.5}" cy="${groundY - 5}" rx="${w * 0.3}" ry="8" fill="white" opacity="0.04" />
      `;

    case 'music-room':
      return `
        <!-- Instruments on wall -->
        <!-- Guitar -->
        <ellipse cx="${w * 0.95}" cy="${groundY * 0.35}" rx="5" ry="8" fill="#92400e" opacity="0.2" />
        <rect x="${w * 0.94}" y="${groundY * 0.15}" width="2" height="${groundY * 0.2}" fill="#78350f" opacity="0.2" />
        <!-- Piano keys hint -->
        <rect x="${w * 0.02}" y="${groundY - 16}" width="18" height="16" fill="#1f2937" opacity="0.15" />
        <rect x="${w * 0.02 + 2}" y="${groundY - 14}" width="2" height="10" fill="white" opacity="0.15" />
        <rect x="${w * 0.02 + 5}" y="${groundY - 14}" width="2" height="10" fill="white" opacity="0.15" />
        <rect x="${w * 0.02 + 8}" y="${groundY - 14}" width="2" height="10" fill="white" opacity="0.15" />
        <rect x="${w * 0.02 + 11}" y="${groundY - 14}" width="2" height="10" fill="white" opacity="0.15" />
        <rect x="${w * 0.02 + 14}" y="${groundY - 14}" width="2" height="10" fill="white" opacity="0.15" />
        <!-- Sheet music -->
        <rect x="${w * 0.9}" y="${groundY * 0.6}" width="10" height="14" fill="#fef3c7" opacity="0.1" transform="rotate(5 ${w * 0.9 + 5} ${groundY * 0.6 + 7})" />
      `;

    case 'campfire':
      return `
        <!-- Trees -->
        <polygon points="${w * 0.02},${groundY} ${w * 0.06},${groundY * 0.15} ${w * 0.1},${groundY}" fill="#166534" opacity="0.15" />
        <polygon points="${w * 0.08},${groundY} ${w * 0.11},${groundY * 0.25} ${w * 0.14},${groundY}" fill="#14532d" opacity="0.12" />
        <polygon points="${w * 0.88},${groundY} ${w * 0.92},${groundY * 0.2} ${w * 0.96},${groundY}" fill="#166534" opacity="0.12" />
        <polygon points="${w * 0.93},${groundY} ${w * 0.96},${groundY * 0.3} ${w * 0.99},${groundY}" fill="#14532d" opacity="0.1" />
        <!-- Campfire glow -->
        <circle cx="${w * 0.5}" cy="${groundY - 2}" r="30" fill="#f97316" opacity="0.04" />
        <circle cx="${w * 0.5}" cy="${groundY - 2}" r="15" fill="#fbbf24" opacity="0.06" />
        <!-- Logs -->
        <rect x="${w * 0.5 - 12}" y="${groundY - 4}" width="10" height="3" rx="1" fill="#78350f" opacity="0.25" transform="rotate(-15 ${w * 0.5 - 7} ${groundY - 3})" />
        <rect x="${w * 0.5 + 2}" y="${groundY - 4}" width="10" height="3" rx="1" fill="#78350f" opacity="0.25" transform="rotate(15 ${w * 0.5 + 7} ${groundY - 3})" />
        <!-- Stars -->
        ${stars(w, groundY * 0.3, 8)}
      `;

    default:
      return '';
  }
}

// --- SVG Helpers ---

function bookStack(x: number, y: number, count: number): string {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  let svg = '';
  for (let i = 0; i < count; i++) {
    const bookH = 3 + Math.random() * 2;
    svg += `<rect x="${x}" y="${y + i * (bookH + 1)}" width="${12 + Math.random() * 4}" height="${bookH}" rx="0.5" fill="${colors[i % colors.length]}" opacity="0.2" />`;
  }
  return svg;
}

function flower(x: number, y: number, color: string): string {
  return `
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 8}" stroke="#22c55e" stroke-width="1" opacity="0.3" />
    <circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="0.25" />
    <circle cx="${x}" cy="${y}" r="1" fill="#fbbf24" opacity="0.3" />
  `;
}

function stars(w: number, maxY: number, count: number): string {
  let svg = '';
  // Use deterministic positions based on index
  for (let i = 0; i < count; i++) {
    const x = ((i * 137 + 42) % 100) / 100 * w;
    const y = ((i * 73 + 17) % 100) / 100 * maxY;
    const r = 0.5 + (i % 3) * 0.5;
    svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="white" opacity="${0.1 + (i % 4) * 0.05}" />`;
  }
  return svg;
}

// --- Time of Day ---

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'dusk';
  return 'night';
}

export function getTimeOverlayColor(time: TimeOfDay): string {
  switch (time) {
    case 'dawn': return 'rgba(251, 146, 60, 0.06)';  // warm orange tint
    case 'day': return 'rgba(0, 0, 0, 0)';             // no overlay
    case 'dusk': return 'rgba(139, 92, 246, 0.06)';    // purple/amber tint
    case 'night': return 'rgba(30, 27, 75, 0.1)';      // deep blue tint
  }
}

// --- Weather ---

export type WeatherState = 'clear' | 'rain' | 'snow' | 'fog' | 'stars';

export function getWeatherForStatus(status: string, biome: BiomeDef): WeatherState {
  if (status === 'idle' || status === 'complete') return biome.isDark ? 'stars' : 'clear';
  if (status === 'rate_limited') return biome.id === 'arctic' ? 'snow' : 'rain';
  if (status === 'blocked') return 'fog';
  return 'clear';
}

// --- Ambient Creatures ---

export function getCreatureSVG(creature: string, x: number, y: number): string {
  switch (creature) {
    case 'butterfly':
      return `<g transform="translate(${x},${y})">
        <path d="M -4,-3 Q -8,-8 -3,-6 Q 0,-8 0,0" fill="#f472b6" opacity="0.3" />
        <path d="M 4,-3 Q 8,-8 3,-6 Q 0,-8 0,0" fill="#a78bfa" opacity="0.3" />
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#333" stroke-width="0.5" opacity="0.3" />
      </g>`;
    case 'fish':
      return `<g transform="translate(${x},${y})">
        <ellipse cx="0" cy="0" rx="6" ry="3" fill="#f59e0b" opacity="0.2" />
        <polygon points="5,0 9,-3 9,3" fill="#f59e0b" opacity="0.2" />
        <circle cx="-2" cy="-1" r="1" fill="#333" opacity="0.2" />
      </g>`;
    case 'bird':
      return `<g transform="translate(${x},${y})">
        <path d="M -5,0 Q 0,-4 5,0" fill="none" stroke="#374151" stroke-width="1" opacity="0.2" />
      </g>`;
    case 'firefly':
      return `<circle cx="${x}" cy="${y}" r="2" fill="#fbbf24" opacity="0.2" />`;
    case 'snowflake':
      return `<text x="${x}" y="${y}" font-size="8" fill="white" opacity="0.15">❄</text>`;
    case 'music-note':
      return `<text x="${x}" y="${y}" font-size="10" fill="#a78bfa" opacity="0.12">♪</text>`;
    case 'bubble':
      return `<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#67e8f9" stroke-width="0.5" opacity="0.15" />`;
    case 'star':
      return `<circle cx="${x}" cy="${y}" r="1" fill="white" opacity="0.2" />`;
    default:
      return '';
  }
}
