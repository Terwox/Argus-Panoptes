/**
 * Ambient Effects - Environmental storytelling through particles and creatures
 *
 * Biome-aware particle systems that react to project status.
 * Creatures appear during calm periods and hide during intense work.
 * All effects are subtle and never foreground.
 */

import type { BiomeDef, WeatherState } from './biomes';

export interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: string; // creature type or weather particle type
  opacity: number;
  scale: number;
  rotation: number;
  life: number; // 0 to 1
  maxLife: number;
}

// --- Weather Particles ---

export function spawnWeatherParticle(
  weather: WeatherState,
  containerWidth: number,
  containerHeight: number,
): AmbientParticle | null {
  if (weather === 'clear') return null;

  const x = Math.random() * containerWidth;

  switch (weather) {
    case 'rain':
      return {
        x,
        y: -5,
        vx: -0.3,
        vy: 2 + Math.random() * 1.5,
        type: 'raindrop',
        opacity: 0.15 + Math.random() * 0.1,
        scale: 0.5 + Math.random() * 0.5,
        rotation: -15,
        life: 1,
        maxLife: 1,
      };
    case 'snow':
      return {
        x,
        y: -5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: 0.3 + Math.random() * 0.4,
        type: 'snowflake',
        opacity: 0.2 + Math.random() * 0.15,
        scale: 0.3 + Math.random() * 0.7,
        rotation: Math.random() * 360,
        life: 1,
        maxLife: 1,
      };
    case 'fog':
      return {
        x,
        y: containerHeight * (0.5 + Math.random() * 0.4),
        vx: 0.1 + Math.random() * 0.2,
        vy: (Math.random() - 0.5) * 0.05,
        type: 'fog',
        opacity: 0.03 + Math.random() * 0.04,
        scale: 2 + Math.random() * 3,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'stars':
      // Stars twinkle in place
      return {
        x,
        y: Math.random() * containerHeight * 0.6,
        vx: 0,
        vy: 0,
        type: 'twinkle-star',
        opacity: 0.1 + Math.random() * 0.2,
        scale: 0.5 + Math.random() * 0.5,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    default:
      return null;
  }
}

// --- Creature Spawning ---

export function spawnCreature(
  biome: BiomeDef,
  containerWidth: number,
  containerHeight: number,
): AmbientParticle | null {
  if (biome.creatures.length === 0) return null;

  const type = biome.creatures[Math.floor(Math.random() * biome.creatures.length)];
  const groundY = containerHeight * 0.82;

  switch (type) {
    case 'butterfly':
      return {
        x: Math.random() > 0.5 ? -10 : containerWidth + 10,
        y: groundY * (0.3 + Math.random() * 0.4),
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3),
        vy: (Math.random() - 0.5) * 0.2,
        type: 'butterfly',
        opacity: 0.3,
        scale: 0.7,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'bird':
      return {
        x: -15,
        y: groundY * (0.1 + Math.random() * 0.3),
        vx: 0.5 + Math.random() * 0.3,
        vy: (Math.random() - 0.5) * 0.1,
        type: 'bird',
        opacity: 0.2,
        scale: 0.6,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'fish':
      return {
        x: Math.random() > 0.5 ? -10 : containerWidth + 10,
        y: groundY * (0.4 + Math.random() * 0.35),
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.2),
        vy: Math.sin(Math.random() * Math.PI) * 0.1,
        type: 'fish',
        opacity: 0.2,
        scale: 0.6,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'firefly':
      return {
        x: Math.random() * containerWidth,
        y: groundY * (0.3 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        type: 'firefly',
        opacity: 0,
        scale: 0.5,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'music-note':
      return {
        x: containerWidth * (0.3 + Math.random() * 0.4),
        y: groundY * 0.7,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -0.3 - Math.random() * 0.2,
        type: 'music-note',
        opacity: 0,
        scale: 0.5,
        rotation: Math.random() * 20 - 10,
        life: 1,
        maxLife: 1,
      };
    case 'bubble':
      return {
        x: containerWidth * (0.1 + Math.random() * 0.8),
        y: containerHeight * 0.9,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.3 - Math.random() * 0.3,
        type: 'bubble',
        opacity: 0.15,
        scale: 0.3 + Math.random() * 0.4,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    case 'snowflake':
      return spawnWeatherParticle('snow', containerWidth, containerHeight);
    case 'ember':
      return {
        x: containerWidth * 0.5 + (Math.random() - 0.5) * 30,
        y: containerHeight * 0.8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.8,
        type: 'ember',
        opacity: 0.4,
        scale: 0.3 + Math.random() * 0.3,
        rotation: 0,
        life: 1,
        maxLife: 1,
      };
    default:
      return null;
  }
}

// --- Particle Update ---

export function updateParticle(p: AmbientParticle, containerWidth: number, containerHeight: number): AmbientParticle | null {
  const updated = { ...p };
  updated.x += updated.vx;
  updated.y += updated.vy;

  switch (updated.type) {
    case 'butterfly':
      updated.vy += Math.sin(Date.now() * 0.003 + updated.x * 0.01) * 0.03;
      updated.life -= 0.002;
      break;
    case 'bird':
      updated.vy = Math.sin(Date.now() * 0.002) * 0.15;
      updated.life -= 0.003;
      break;
    case 'fish':
      updated.vy = Math.sin(Date.now() * 0.002 + updated.x * 0.02) * 0.08;
      updated.life -= 0.002;
      break;
    case 'firefly':
      updated.vx += (Math.random() - 0.5) * 0.05;
      updated.vy += (Math.random() - 0.5) * 0.05;
      updated.opacity = 0.15 + 0.15 * Math.sin(Date.now() * 0.004 + updated.x);
      updated.life -= 0.003;
      break;
    case 'music-note':
      updated.opacity = Math.min(0.15, updated.opacity + 0.005);
      updated.life -= 0.005;
      if (updated.life < 0.3) updated.opacity *= updated.life / 0.3;
      break;
    case 'raindrop':
      updated.life -= 0.02;
      break;
    case 'snowflake':
      updated.vx = Math.sin(Date.now() * 0.001 + updated.x * 0.05) * 0.3;
      updated.rotation += 0.5;
      updated.life -= 0.005;
      break;
    case 'fog':
      updated.life -= 0.001;
      updated.opacity *= 0.999;
      break;
    case 'twinkle-star':
      updated.opacity = 0.1 + 0.15 * Math.sin(Date.now() * 0.002 + updated.x * 0.1);
      updated.life -= 0.002;
      break;
    case 'bubble':
      updated.vx += (Math.random() - 0.5) * 0.02;
      updated.life -= 0.004;
      if (updated.life < 0.2) updated.opacity *= 0.95;
      break;
    case 'ember':
      updated.vx += (Math.random() - 0.5) * 0.02;
      updated.opacity *= 0.99;
      updated.life -= 0.008;
      break;
    default:
      updated.life -= 0.005;
  }

  // Kill if out of bounds or dead
  if (updated.life <= 0) return null;
  if (updated.x < -20 || updated.x > containerWidth + 20) return null;
  if (updated.y < -20 || updated.y > containerHeight + 20) return null;

  return updated;
}

// --- Particle Rendering ---

export function getParticleSVG(p: AmbientParticle): string {
  switch (p.type) {
    case 'butterfly':
      return `<g transform="translate(${p.x},${p.y}) scale(${p.scale})" opacity="${p.opacity}">
        <path d="M -4,-3 Q -8,-8 -3,-6 Q 0,-8 0,0" fill="#f472b6" />
        <path d="M 4,-3 Q 8,-8 3,-6 Q 0,-8 0,0" fill="#a78bfa" />
        <line x1="0" y1="-2" x2="0" y2="2" stroke="#333" stroke-width="0.5" />
      </g>`;
    case 'bird':
      return `<path d="M ${p.x - 5},${p.y} Q ${p.x},${p.y - 4} ${p.x + 5},${p.y}" fill="none" stroke="#374151" stroke-width="1.5" opacity="${p.opacity}" />`;
    case 'fish':
      return `<g transform="translate(${p.x},${p.y}) scale(${p.scale}${p.vx < 0 ? ' -1 1' : ''})" opacity="${p.opacity}">
        <ellipse cx="0" cy="0" rx="6" ry="3" fill="#f59e0b" />
        <polygon points="5,0 9,-3 9,3" fill="#f59e0b" />
        <circle cx="-2" cy="-1" r="1" fill="#333" />
      </g>`;
    case 'firefly':
      return `<circle cx="${p.x}" cy="${p.y}" r="${2 * p.scale}" fill="#fbbf24" opacity="${p.opacity}" />`;
    case 'music-note':
      return `<text x="${p.x}" y="${p.y}" font-size="${12 * p.scale}" fill="#a78bfa" opacity="${p.opacity}" transform="rotate(${p.rotation} ${p.x} ${p.y})">♪</text>`;
    case 'raindrop':
      return `<line x1="${p.x}" y1="${p.y}" x2="${p.x - 1}" y2="${p.y + 4 * p.scale}" stroke="#93c5fd" stroke-width="${0.8 * p.scale}" opacity="${p.opacity}" stroke-linecap="round" />`;
    case 'snowflake':
      return `<text x="${p.x}" y="${p.y}" font-size="${6 * p.scale}" fill="white" opacity="${p.opacity}" transform="rotate(${p.rotation} ${p.x} ${p.y})">❄</text>`;
    case 'fog':
      return `<ellipse cx="${p.x}" cy="${p.y}" rx="${30 * p.scale}" ry="${8 * p.scale}" fill="white" opacity="${p.opacity}" />`;
    case 'twinkle-star':
      return `<circle cx="${p.x}" cy="${p.y}" r="${1.5 * p.scale}" fill="white" opacity="${p.opacity}" />`;
    case 'bubble':
      return `<circle cx="${p.x}" cy="${p.y}" r="${4 * p.scale}" fill="none" stroke="#67e8f9" stroke-width="0.5" opacity="${p.opacity}" />`;
    case 'ember':
      return `<circle cx="${p.x}" cy="${p.y}" r="${1.5 * p.scale}" fill="#f97316" opacity="${p.opacity}" />`;
    default:
      return '';
  }
}

// --- Ambient Manager ---

export class AmbientManager {
  private particles: AmbientParticle[] = [];
  private lastCreatureSpawn = 0;
  private lastWeatherSpawn = 0;
  readonly MAX_PARTICLES = 15;

  update(
    biome: BiomeDef,
    weather: WeatherState,
    containerWidth: number,
    containerHeight: number,
    isCalm: boolean, // true when mostly idle/complete
  ): string {
    const now = Date.now();

    // Spawn weather particles
    const weatherInterval = weather === 'rain' ? 200 : weather === 'snow' ? 500 : weather === 'fog' ? 3000 : 5000;
    if (now - this.lastWeatherSpawn > weatherInterval && this.particles.length < this.MAX_PARTICLES) {
      const p = spawnWeatherParticle(weather, containerWidth, containerHeight);
      if (p) {
        this.particles.push(p);
        this.lastWeatherSpawn = now;
      }
    }

    // Spawn creatures (only when calm, less frequently)
    if (isCalm && now - this.lastCreatureSpawn > 8000 && this.particles.length < this.MAX_PARTICLES - 3) {
      const p = spawnCreature(biome, containerWidth, containerHeight);
      if (p) {
        this.particles.push(p);
        this.lastCreatureSpawn = now;
      }
    }

    // Update existing particles
    this.particles = this.particles
      .map(p => updateParticle(p, containerWidth, containerHeight))
      .filter((p): p is AmbientParticle => p !== null);

    // Render all particles to SVG
    return this.particles.map(getParticleSVG).join('');
  }

  clear() {
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }
}
