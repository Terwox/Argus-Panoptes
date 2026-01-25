#!/usr/bin/env node
/**
 * Visual Test Suite for CuteWorld
 *
 * Captures bot state over time and runs assertions against Phase 11 checklist items.
 * Also records video (via Puppeteer screencast) and performs pixel diffing between frames.
 *
 * Usage: node scripts/visual-test.mjs
 *
 * Requires: npm install puppeteer pixelmatch pngjs
 */

import puppeteer from 'puppeteer';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '.sisyphus', 'visual-tests');

// Test configuration
const CONFIG = {
  URL: 'http://localhost:5173?cute=true&demo=true',
  NUM_SNAPSHOTS: 20,           // Take 20 snapshots
  INTERVAL_MS: 500,            // Every 500ms (10 seconds total)
  INITIAL_WAIT_MS: 3000,       // Wait for initial spawn

  // Physics constants (must match CuteWorld.svelte)
  MIN_BOT_DISTANCE: 90,
  MAX_VELOCITY: 0.7,
  BOT_SIZE: 54,
  CONTAINER_PADDING: 60,

  // Assertion thresholds
  SPREAD_STD_DEV_MIN: 30,      // Minimum X spread standard deviation
  MAX_DIRECTION_FLIPS: 8,      // Per bot over test duration
  CONDUCTOR_MAX_X_PCT: 0.35,   // Conductor should be in left 35%
  CONDUCTOR_MAX_Y_PCT: 0.45,   // Conductor should be in top 45%

  // Pixel diff thresholds
  PIXEL_DIFF_THRESHOLD: 0.1,   // 10% pixel difference expected (movement)
  MIN_MOVEMENT_DIFF: 100,      // At least 100 pixels should change between frames
};

// Delay helper
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  // Clean old files
  const files = fs.readdirSync(OUTPUT_DIR);
  for (const file of files) {
    if (file.startsWith('snapshot-') || file.startsWith('diff-') || file.endsWith('.webm')) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }
}

// Extract state from page via debug API
async function captureState(page) {
  return await page.evaluate(() => {
    const state = (window).__argusTestState;
    if (!state) return null;
    return JSON.parse(JSON.stringify(state)); // Deep clone to avoid reference issues
  });
}

// Run assertions against collected snapshots
function runAssertions(snapshots) {
  const results = {
    passed: [],
    failed: [],
  };

  const check = (name, condition, details = '') => {
    if (condition) {
      results.passed.push({ name, details });
    } else {
      results.failed.push({ name, details });
    }
  };

  // Filter out null snapshots
  const validSnapshots = snapshots.filter((s) => s !== null);
  if (validSnapshots.length === 0) {
    check('State extraction', false, 'No valid snapshots captured');
    return results;
  }

  const firstSnapshot = validSnapshots[0];
  const lastSnapshot = validSnapshots[validSnapshots.length - 1];

  // === BOT POSITIONING TESTS ===

  // 1. Conductor in upper-left quadrant
  const conductor = firstSnapshot.bots.find((b) => b.type === 'main');
  if (conductor) {
    const bounds = firstSnapshot.bounds;
    const maxX = bounds.width * CONFIG.CONDUCTOR_MAX_X_PCT;
    const maxY = bounds.height * CONFIG.CONDUCTOR_MAX_Y_PCT;
    check(
      'Conductor in upper-left',
      conductor.x < maxX && conductor.y < maxY,
      `Position: (${Math.round(conductor.x)}, ${Math.round(conductor.y)}), Max: (${Math.round(maxX)}, ${Math.round(maxY)})`
    );
  } else {
    check('Conductor exists', false, 'No conductor found');
  }

  // 2. Subagents spread across width
  const subagents = firstSnapshot.bots.filter((b) => b.type !== 'main');
  if (subagents.length >= 2) {
    const xPositions = subagents.map((b) => b.x);
    const mean = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
    const variance = xPositions.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / xPositions.length;
    const stdDev = Math.sqrt(variance);
    check(
      'Subagents spread (X std dev)',
      stdDev >= CONFIG.SPREAD_STD_DEV_MIN,
      `Std dev: ${Math.round(stdDev)}px, Min: ${CONFIG.SPREAD_STD_DEV_MIN}px`
    );
  }

  // 3. No spawn overlap
  let hasOverlap = false;
  let overlapDetails = '';
  for (let i = 0; i < firstSnapshot.bots.length; i++) {
    for (let j = i + 1; j < firstSnapshot.bots.length; j++) {
      const a = firstSnapshot.bots[i];
      const b = firstSnapshot.bots[j];
      const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
      if (dist < CONFIG.MIN_BOT_DISTANCE * 0.8) {
        // 80% threshold for overlap
        hasOverlap = true;
        overlapDetails = `${a.name} and ${b.name} at distance ${Math.round(dist)}px`;
        break;
      }
    }
    if (hasOverlap) break;
  }
  check('No spawn overlap', !hasOverlap, overlapDetails || 'All bots properly spaced');

  // === MOVEMENT & PHYSICS TESTS ===

  // 4. Velocities within bounds
  let maxVelocity = 0;
  for (const snapshot of validSnapshots) {
    for (const bot of snapshot.bots) {
      const velocity = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
      maxVelocity = Math.max(maxVelocity, velocity);
    }
  }
  check(
    'Velocities within bounds',
    maxVelocity <= CONFIG.MAX_VELOCITY * 1.5, // Allow some tolerance
    `Max velocity: ${maxVelocity.toFixed(3)}, Limit: ${CONFIG.MAX_VELOCITY}`
  );

  // 5. No edge clipping
  let hasEdgeClip = false;
  let clipDetails = '';
  for (const snapshot of validSnapshots) {
    const bounds = snapshot.bounds;
    for (const bot of snapshot.bots) {
      if (bot.scale < 0.5) continue; // Ignore spawning bots
      if (
        bot.x < -10 ||
        bot.y < bounds.botMinY - 10 ||
        bot.x + CONFIG.BOT_SIZE > bounds.width + 10 ||
        bot.y + CONFIG.BOT_SIZE > bounds.botMaxY + 10
      ) {
        hasEdgeClip = true;
        clipDetails = `${bot.name} at (${Math.round(bot.x)}, ${Math.round(bot.y)})`;
        break;
      }
    }
    if (hasEdgeClip) break;
  }
  check('No edge clipping', !hasEdgeClip, clipDetails || 'All bots within bounds');

  // 6. Direction flips (hysteresis working)
  const directionFlips = new Map();
  for (let i = 1; i < validSnapshots.length; i++) {
    const prev = validSnapshots[i - 1];
    const curr = validSnapshots[i];
    for (const currBot of curr.bots) {
      const prevBot = prev.bots.find((b) => b.id === currBot.id);
      if (!prevBot) continue;
      if (prevBot.direction !== currBot.direction) {
        directionFlips.set(currBot.id, (directionFlips.get(currBot.id) || 0) + 1);
      }
    }
  }
  const maxFlips = Math.max(...directionFlips.values(), 0);
  check(
    'Direction flips reasonable',
    maxFlips <= CONFIG.MAX_DIRECTION_FLIPS,
    `Max flips: ${maxFlips}, Limit: ${CONFIG.MAX_DIRECTION_FLIPS}`
  );

  // === BUBBLE COLLISION TESTS ===

  // 7. Bubbles don't overlap each other
  let hasBubbleOverlap = false;
  let bubbleOverlapDetails = '';
  for (const snapshot of validSnapshots) {
    const bubbles = snapshot.bubbles;
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i];
        const b = bubbles[j];
        // Check AABB intersection
        if (
          a.left < b.left + b.width &&
          a.left + a.width > b.left &&
          a.top < b.top + b.height &&
          a.top + a.height > b.top
        ) {
          hasBubbleOverlap = true;
          bubbleOverlapDetails = `Bubbles at (${Math.round(a.left)}, ${Math.round(a.top)}) and (${Math.round(b.left)}, ${Math.round(b.top)})`;
          break;
        }
      }
      if (hasBubbleOverlap) break;
    }
    if (hasBubbleOverlap) break;
  }
  check('No bubble-bubble overlap', !hasBubbleOverlap, bubbleOverlapDetails || 'Bubbles properly spaced');

  // 8. Conductor bubble always visible
  let conductorBubbleMissing = false;
  for (const snapshot of validSnapshots) {
    const conductorBot = snapshot.bots.find((b) => b.type === 'main');
    if (!conductorBot) continue;
    const conductorBubble = snapshot.bubbles.find((b) => b.botId === conductorBot.id);
    if (!conductorBubble) {
      conductorBubbleMissing = true;
      break;
    }
  }
  check('Conductor bubble always visible', !conductorBubbleMissing, conductorBubbleMissing ? 'Missing in some frames' : 'Present in all frames');

  // === BUBBLE-BOT COLLISION TESTS ===

  // 9. Bubbles don't overlap bot bodies
  let hasBubbleBotOverlap = false;
  let bubbleBotOverlapDetails = '';
  for (const snapshot of validSnapshots) {
    const bubbles = snapshot.bubbles;
    const bots = snapshot.bots.filter(b => b.scale > 0.5); // Only visible bots

    for (const bubble of bubbles) {
      for (const bot of bots) {
        // Skip the bot that owns this bubble
        if (bubble.botId === bot.id) continue;

        // Bot bounding box (with small tolerance)
        const botRect = {
          left: bot.x - 5,
          top: bot.y - 5,
          width: CONFIG.BOT_SIZE + 10,
          height: CONFIG.BOT_SIZE + 10,
        };

        // Check AABB intersection
        if (
          bubble.left < botRect.left + botRect.width &&
          bubble.left + bubble.width > botRect.left &&
          bubble.top < botRect.top + botRect.height &&
          bubble.top + bubble.height > botRect.top
        ) {
          hasBubbleBotOverlap = true;
          bubbleBotOverlapDetails = `Bubble at (${Math.round(bubble.left)}, ${Math.round(bubble.top)}) overlaps bot at (${Math.round(bot.x)}, ${Math.round(bot.y)})`;
          break;
        }
      }
      if (hasBubbleBotOverlap) break;
    }
    if (hasBubbleBotOverlap) break;
  }
  check('No bubble-bot overlap', !hasBubbleBotOverlap, bubbleBotOverlapDetails || 'Bubbles avoid bot bodies');

  // === MOVEMENT DETECTION ===

  // 10. Bots actually move over time
  let totalMovement = 0;
  for (const bot of firstSnapshot.bots) {
    const finalBot = lastSnapshot.bots.find((b) => b.id === bot.id);
    if (!finalBot) continue;
    totalMovement += Math.abs(finalBot.x - bot.x) + Math.abs(finalBot.y - bot.y);
  }
  check(
    'Bots show movement',
    totalMovement > 10, // At least some movement
    `Total displacement: ${Math.round(totalMovement)}px`
  );

  // 11. Full edge coverage - bots reach all edge zones over time
  const edgeZones = { left: false, right: false, top: false, bottom: false };
  const EDGE_THRESHOLD = 80; // How close to edge counts as "reaching" it

  for (const snapshot of validSnapshots) {
    const bounds = snapshot.bounds;
    for (const bot of snapshot.bots) {
      if (bot.scale < 0.5) continue;
      if (bot.x < EDGE_THRESHOLD) edgeZones.left = true;
      if (bot.x + CONFIG.BOT_SIZE > bounds.width - EDGE_THRESHOLD) edgeZones.right = true;
      if (bot.y < bounds.botMinY + EDGE_THRESHOLD) edgeZones.top = true;
      if (bot.y + CONFIG.BOT_SIZE > bounds.botMaxY - EDGE_THRESHOLD) edgeZones.bottom = true;
    }
  }

  const edgesReached = Object.values(edgeZones).filter(v => v).length;
  const unreachedEdges = Object.entries(edgeZones).filter(([_, v]) => !v).map(([k]) => k);
  check(
    'Edge coverage (2+ zones)',
    edgesReached >= 2, // At least 2 edge zones reached
    edgesReached >= 2
      ? `${edgesReached}/4 edges reached`
      : `Only ${edgesReached}/4 edges reached (missing: ${unreachedEdges.join(', ')})`
  );

  // 12. Collision avoidance during movement
  let collisionsDuringMovement = 0;
  let collisionDetails = '';

  for (const snapshot of validSnapshots) {
    const movingBots = snapshot.bots.filter(b => {
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      return speed > 0.05 && b.scale > 0.5; // Bot is moving and visible
    });

    for (let i = 0; i < movingBots.length; i++) {
      for (let j = i + 1; j < movingBots.length; j++) {
        const a = movingBots[i];
        const b = movingBots[j];
        const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

        // If two moving bots are too close, it's a collision
        if (dist < CONFIG.MIN_BOT_DISTANCE * 0.7) {
          collisionsDuringMovement++;
          if (!collisionDetails) {
            collisionDetails = `${a.name} and ${b.name} at distance ${Math.round(dist)}px while moving`;
          }
        }
      }
    }
  }

  check(
    'Collision avoidance (moving bots)',
    collisionsDuringMovement <= 2, // Allow up to 2 brief collisions
    collisionsDuringMovement === 0
      ? 'No collisions during movement'
      : `${collisionsDuringMovement} collision(s): ${collisionDetails}`
  );

  return results;
}

// Perform pixel diff between two PNG screenshots
function pixelDiff(img1Path, img2Path, outputPath) {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
    threshold: 0.1,
  });

  fs.writeFileSync(outputPath, PNG.sync.write(diff));

  return {
    diffPixels: numDiffPixels,
    totalPixels: width * height,
    percentDiff: (numDiffPixels / (width * height)) * 100,
  };
}

// Main test runner
async function runVisualTests() {
  console.log('=== CuteWorld Visual Test Suite ===\n');

  ensureOutputDir();

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new', // Use new headless mode for better compatibility
    protocolTimeout: 120000,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // Enable console logging from the page for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('  [PAGE ERROR]', msg.text());
    }
  });

  // Start video recording using Puppeteer's screencast API
  console.log('Starting video recording (screencast)...');
  const client = await page.createCDPSession();
  const videoFrames = [];
  await client.send('Page.startScreencast', {
    format: 'png',
    quality: 80,
    maxWidth: 1400,
    maxHeight: 900,
    everyNthFrame: 2, // Capture every 2nd frame for manageable file size
  });

  client.on('Page.screencastFrame', async (frame) => {
    videoFrames.push(frame.data);
    await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
  });

  // Navigate and wait for initial load (add cache-buster to avoid stale HMR state)
  const cacheBuster = Date.now();
  const url = `${CONFIG.URL}&_=${cacheBuster}`;
  console.log('Navigating to dashboard...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait a moment then do a hard refresh to clear any stale HMR state
  await delay(1000);
  console.log('Doing hard refresh to clear HMR state...');
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for Svelte app to mount - look for the header h1 or main element
  console.log('Waiting for app to mount...');
  try {
    await page.waitForSelector('h1', { timeout: 15000 });
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`  App mounted! Title: "${title}"`);
  } catch (e) {
    console.log('  Warning: Could not detect app mount, continuing anyway...');
    // Take a debug screenshot
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'debug-mount-fail.png') });
  }

  await delay(CONFIG.INITIAL_WAIT_MS);

  // Collect snapshots over time
  console.log(`Capturing ${CONFIG.NUM_SNAPSHOTS} snapshots over ${(CONFIG.NUM_SNAPSHOTS * CONFIG.INTERVAL_MS) / 1000}s...`);
  const snapshots = [];
  const screenshotPaths = [];

  for (let i = 0; i < CONFIG.NUM_SNAPSHOTS; i++) {
    const state = await captureState(page);
    snapshots.push(state);

    const screenshotPath = path.join(OUTPUT_DIR, `snapshot-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    screenshotPaths.push(screenshotPath);

    process.stdout.write(`  Snapshot ${i + 1}/${CONFIG.NUM_SNAPSHOTS}\r`);
    await delay(CONFIG.INTERVAL_MS);
  }
  console.log(''); // New line after progress

  // Stop video recording
  await client.send('Page.stopScreencast');

  // Save screencast frames as individual images (for reference)
  if (videoFrames.length > 0) {
    const framesDir = path.join(OUTPUT_DIR, 'screencast-frames');
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }
    for (let i = 0; i < videoFrames.length; i++) {
      const framePath = path.join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
      fs.writeFileSync(framePath, Buffer.from(videoFrames[i], 'base64'));
    }
    console.log(`Screencast: ${videoFrames.length} frames saved to ${framesDir}/\n`);
  } else {
    console.log('Screencast: No frames captured\n');
  }

  // Run assertions
  console.log('Running assertions...\n');
  const results = runAssertions(snapshots);

  // Perform pixel diffing between consecutive frames
  console.log('Performing pixel diff analysis...');
  const diffs = [];
  for (let i = 1; i < screenshotPaths.length; i++) {
    const diffPath = path.join(OUTPUT_DIR, `diff-${String(i - 1).padStart(2, '0')}-${String(i).padStart(2, '0')}.png`);
    const diff = pixelDiff(screenshotPaths[i - 1], screenshotPaths[i], diffPath);
    diffs.push(diff);
  }

  // Analyze pixel diffs
  const avgDiff = diffs.reduce((sum, d) => sum + d.percentDiff, 0) / diffs.length;
  const minDiff = Math.min(...diffs.map((d) => d.diffPixels));
  const maxDiff = Math.max(...diffs.map((d) => d.diffPixels));

  console.log(`  Average frame diff: ${avgDiff.toFixed(2)}%`);
  console.log(`  Min diff pixels: ${minDiff}, Max: ${maxDiff}\n`);

  // Check for movement via pixel diff
  const hasVisualMovement = minDiff > CONFIG.MIN_MOVEMENT_DIFF;
  if (hasVisualMovement) {
    results.passed.push({ name: 'Visual movement detected (pixel diff)', details: `Min diff: ${minDiff}px` });
  } else {
    results.failed.push({ name: 'Visual movement detected (pixel diff)', details: `Min diff: ${minDiff}px, Expected > ${CONFIG.MIN_MOVEMENT_DIFF}` });
  }

  // Print results
  console.log('=== Test Results ===\n');

  if (results.passed.length > 0) {
    console.log('PASSED:');
    for (const test of results.passed) {
      console.log(`  ✓ ${test.name}`);
      if (test.details) console.log(`    ${test.details}`);
    }
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('FAILED:');
    for (const test of results.failed) {
      console.log(`  ✗ ${test.name}`);
      if (test.details) console.log(`    ${test.details}`);
    }
    console.log('');
  }

  const total = results.passed.length + results.failed.length;
  console.log(`\nResult: ${results.passed.length}/${total} tests passed`);
  console.log(`\nScreenshots saved to: ${OUTPUT_DIR}/`);
  console.log(`  - snapshot-00.png through snapshot-${String(CONFIG.NUM_SNAPSHOTS - 1).padStart(2, '0')}.png`);
  console.log(`  - diff-*.png (pixel diff visualizations)`);
  console.log(`  - screencast-frames/ (video frames)`);

  await browser.close();

  // Exit with error code if tests failed
  if (results.failed.length > 0) {
    process.exit(1);
  }
}

runVisualTests().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
