#!/usr/bin/env node
/**
 * State-based Test Suite for CuteWorld
 *
 * Fast, reliable tests that don't depend on screenshots or video recording.
 * Extracts state via window.__argusTestState and runs assertions.
 *
 * Usage: node scripts/state-test.mjs
 */

import puppeteer from 'puppeteer';

const CONFIG = {
  URL: 'http://localhost:5173?cute=true&demo=true',
  NUM_SNAPSHOTS: 10,
  INTERVAL_MS: 300,
  INITIAL_WAIT_MS: 4000,
  SETTLE_WAIT_MS: 2000,

  // Physics constants (must match CuteWorld.svelte)
  MIN_BOT_DISTANCE: 90,
  MAX_VELOCITY: 0.7,
  BOT_SIZE: 54,

  // Assertion thresholds
  SPREAD_STD_DEV_MIN: 25,
  MAX_DIRECTION_FLIPS: 10,
  CONDUCTOR_MAX_X_PCT: 0.40,
  CONDUCTOR_MAX_Y_PCT: 0.50,
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureState(page) {
  return await page.evaluate(() => {
    const state = window.__argusTestState;
    if (!state) return null;
    return JSON.parse(JSON.stringify(state));
  });
}

function runAssertions(snapshots) {
  const results = { passed: [], failed: [] };

  const check = (name, condition, details = '') => {
    if (condition) {
      results.passed.push({ name, details });
    } else {
      results.failed.push({ name, details });
    }
  };

  const validSnapshots = snapshots.filter((s) => s !== null);
  if (validSnapshots.length === 0) {
    check('State extraction', false, 'No valid snapshots captured');
    return results;
  }

  check('State extraction', true, `${validSnapshots.length} valid snapshots`);

  const firstSnapshot = validSnapshots[0];
  const lastSnapshot = validSnapshots[validSnapshots.length - 1];

  // 1. Conductor exists and in upper-left area
  const conductor = firstSnapshot.bots.find((b) => b.type === 'main');
  if (conductor) {
    const bounds = firstSnapshot.bounds;
    const maxX = bounds.width * CONFIG.CONDUCTOR_MAX_X_PCT;
    const maxY = bounds.height * CONFIG.CONDUCTOR_MAX_Y_PCT;
    check(
      'Conductor in upper-left',
      conductor.x < maxX && conductor.y < maxY,
      `(${Math.round(conductor.x)}, ${Math.round(conductor.y)}) < (${Math.round(maxX)}, ${Math.round(maxY)})`
    );
  } else {
    check('Conductor exists', false, 'No conductor found');
  }

  // 2. No bot-bot overlap
  let botOverlaps = 0;
  let overlapDetails = '';
  for (const snapshot of validSnapshots) {
    for (let i = 0; i < snapshot.bots.length; i++) {
      for (let j = i + 1; j < snapshot.bots.length; j++) {
        const a = snapshot.bots[i];
        const b = snapshot.bots[j];
        if (a.scale < 0.5 || b.scale < 0.5) continue; // Skip spawning bots
        const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        if (dist < CONFIG.MIN_BOT_DISTANCE * 0.75) {
          botOverlaps++;
          if (!overlapDetails) {
            overlapDetails = `${a.name || a.type} and ${b.name || b.type} at ${Math.round(dist)}px`;
          }
        }
      }
    }
  }
  check('No bot overlaps', botOverlaps === 0, overlapDetails || 'All bots properly spaced');

  // 3. No bubble-bubble overlap
  let bubbleOverlaps = 0;
  let bubbleOverlapDetails = '';
  for (const snapshot of validSnapshots) {
    const bubbles = snapshot.bubbles;
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i];
        const b = bubbles[j];
        if (
          a.left < b.left + b.width &&
          a.left + a.width > b.left &&
          a.top < b.top + b.height &&
          a.top + a.height > b.top
        ) {
          bubbleOverlaps++;
          if (!bubbleOverlapDetails) {
            bubbleOverlapDetails = `(${Math.round(a.left)}, ${Math.round(a.top)}) and (${Math.round(b.left)}, ${Math.round(b.top)})`;
          }
        }
      }
    }
  }
  check('No bubble overlaps', bubbleOverlaps === 0, bubbleOverlapDetails || 'Bubbles properly spaced');

  // 4. No bubble-bot overlap (bubbles shouldn't cover OTHER bots)
  let bubbleBotOverlaps = 0;
  let bubbleBotDetails = '';
  for (const snapshot of validSnapshots) {
    for (const bubble of snapshot.bubbles) {
      for (const bot of snapshot.bots) {
        if (bubble.botId === bot.id) continue; // Skip own bubble
        if (bot.scale < 0.5) continue; // Skip spawning bots
        const botRect = { left: bot.x, top: bot.y, width: CONFIG.BOT_SIZE, height: CONFIG.BOT_SIZE };
        if (
          bubble.left < botRect.left + botRect.width &&
          bubble.left + bubble.width > botRect.left &&
          bubble.top < botRect.top + botRect.height &&
          bubble.top + bubble.height > botRect.top
        ) {
          bubbleBotOverlaps++;
          if (!bubbleBotDetails) {
            bubbleBotDetails = `Bubble overlaps ${bot.name || bot.type}`;
          }
        }
      }
    }
  }
  check('No bubble-bot overlaps', bubbleBotOverlaps === 0, bubbleBotDetails || 'Bubbles avoid bots');

  // 5. Velocities within bounds
  let maxVelocity = 0;
  for (const snapshot of validSnapshots) {
    for (const bot of snapshot.bots) {
      const velocity = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
      maxVelocity = Math.max(maxVelocity, velocity);
    }
  }
  check(
    'Velocities bounded',
    maxVelocity <= CONFIG.MAX_VELOCITY * 2,
    `Max: ${maxVelocity.toFixed(3)}, Limit: ${CONFIG.MAX_VELOCITY}`
  );

  // 6. Bots stay within bounds
  let outOfBounds = 0;
  for (const snapshot of validSnapshots) {
    const bounds = snapshot.bounds;
    for (const bot of snapshot.bots) {
      if (bot.scale < 0.5) continue;
      if (bot.x < -10 || bot.y < bounds.botMinY - 10 ||
          bot.x + CONFIG.BOT_SIZE > bounds.width + 10 ||
          bot.y + CONFIG.BOT_SIZE > bounds.botMaxY + 10) {
        outOfBounds++;
      }
    }
  }
  check('Bots within bounds', outOfBounds === 0, outOfBounds > 0 ? `${outOfBounds} out of bounds` : 'All in bounds');

  // 7. Bots show some movement OR are stably settled (low velocity)
  // After initial settling, bots may not move much - that's OK
  let totalMovement = 0;
  let avgVelocity = 0;
  let velocityCount = 0;
  for (const bot of firstSnapshot.bots) {
    const finalBot = lastSnapshot.bots.find((b) => b.id === bot.id);
    if (!finalBot) continue;
    totalMovement += Math.abs(finalBot.x - bot.x) + Math.abs(finalBot.y - bot.y);
    avgVelocity += Math.sqrt(finalBot.vx * finalBot.vx + finalBot.vy * finalBot.vy);
    velocityCount++;
  }
  avgVelocity = velocityCount > 0 ? avgVelocity / velocityCount : 0;

  // Pass if bots moved OR if they're stably settled (low velocity)
  const hasMovementOrSettled = totalMovement > 5 || avgVelocity < 0.15;
  check('Bots stable or moving', hasMovementOrSettled,
    totalMovement > 5
      ? `Displacement: ${Math.round(totalMovement)}px`
      : `Settled (avg velocity: ${avgVelocity.toFixed(4)})`);

  return results;
}

async function main() {
  console.log('=== CuteWorld State Test Suite ===\n');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    console.log('Navigating to dashboard...');
    await page.goto(CONFIG.URL, { waitUntil: 'domcontentloaded', timeout: 15000 });

    console.log(`Waiting ${CONFIG.INITIAL_WAIT_MS / 1000}s for bots to spawn...`);
    await delay(CONFIG.INITIAL_WAIT_MS);

    console.log(`Waiting ${CONFIG.SETTLE_WAIT_MS / 1000}s for bots to settle...`);
    await delay(CONFIG.SETTLE_WAIT_MS);

    // Collect snapshots
    console.log(`Capturing ${CONFIG.NUM_SNAPSHOTS} state snapshots...`);
    const snapshots = [];
    for (let i = 0; i < CONFIG.NUM_SNAPSHOTS; i++) {
      const state = await captureState(page);
      snapshots.push(state);
      await delay(CONFIG.INTERVAL_MS);
    }

    // Run assertions
    console.log('Running assertions...\n');
    const results = runAssertions(snapshots);

    // Print results
    console.log('=== Results ===\n');

    if (results.passed.length > 0) {
      console.log('PASSED:');
      for (const test of results.passed) {
        console.log(`  \u2713 ${test.name}`);
        if (test.details) console.log(`    ${test.details}`);
      }
      console.log('');
    }

    if (results.failed.length > 0) {
      console.log('FAILED:');
      for (const test of results.failed) {
        console.log(`  \u2717 ${test.name}`);
        if (test.details) console.log(`    ${test.details}`);
      }
      console.log('');
    }

    const total = results.passed.length + results.failed.length;
    const status = results.failed.length === 0 ? 'PASSED' : 'FAILED';
    console.log(`\n${status}: ${results.passed.length}/${total} tests passed`);

    await browser.close();
    process.exit(results.failed.length > 0 ? 1 : 0);

  } catch (err) {
    console.error('Error:', err.message);
    await browser.close();
    process.exit(1);
  }
}

main();
