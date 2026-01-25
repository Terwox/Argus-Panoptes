#!/usr/bin/env node
/**
 * Simple overlap check - extracts bot state and checks distances
 * Avoids screenshot timeouts
 */

import puppeteer from 'puppeteer';

const CONFIG = {
  MIN_BOT_DISTANCE: 90,
  BOT_SIZE: 56,
};

async function checkOverlaps() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:5173?cute=true&demo=true', { waitUntil: 'load', timeout: 30000 });

  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Wait for bots to spawn and settle
  console.log('Waiting for bots to spawn and settle...');
  await delay(10000);

  // Get state
  console.log('\nExtracting state...');
  const state = await page.evaluate(() => {
    return window.__argusTestState || null;
  });

  if (!state) {
    console.log('ERROR: No state available. __argusTestState not set.');
    await browser.close();
    return;
  }

  console.log(`\nFound ${state.bots.length} bots in bounds ${state.bounds.width}x${state.bounds.height}`);

  // Check bot-bot distances
  console.log('\n=== Bot-Bot Distance Check ===');
  let botOverlaps = 0;
  for (let i = 0; i < state.bots.length; i++) {
    for (let j = i + 1; j < state.bots.length; j++) {
      const a = state.bots[i];
      const b = state.bots[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONFIG.MIN_BOT_DISTANCE * 0.8) {
        console.log(`  OVERLAP: ${a.name || a.type} and ${b.name || b.type} at distance ${Math.round(dist)}px (min: ${CONFIG.MIN_BOT_DISTANCE * 0.8})`);
        botOverlaps++;
      } else if (dist < CONFIG.MIN_BOT_DISTANCE) {
        console.log(`  WARNING: ${a.name || a.type} and ${b.name || b.type} at distance ${Math.round(dist)}px (threshold: ${CONFIG.MIN_BOT_DISTANCE})`);
      }
    }
  }
  if (botOverlaps === 0) {
    console.log('  OK: No bot-bot overlaps detected');
  }

  // Check bubble-bubble distances
  console.log('\n=== Bubble-Bubble Overlap Check ===');
  let bubbleOverlaps = 0;
  for (let i = 0; i < state.bubbles.length; i++) {
    for (let j = i + 1; j < state.bubbles.length; j++) {
      const a = state.bubbles[i];
      const b = state.bubbles[j];

      // AABB check
      if (a.left < b.left + b.width &&
          a.left + a.width > b.left &&
          a.top < b.top + b.height &&
          a.top + a.height > b.top) {
        console.log(`  OVERLAP: Bubble at (${Math.round(a.left)}, ${Math.round(a.top)}) overlaps (${Math.round(b.left)}, ${Math.round(b.top)})`);
        bubbleOverlaps++;
      }
    }
  }
  if (bubbleOverlaps === 0) {
    console.log('  OK: No bubble-bubble overlaps detected');
  }

  // Check bubble-bot overlaps (bubbles shouldn't cover OTHER bots)
  console.log('\n=== Bubble-Bot Overlap Check ===');
  let bubbleBotOverlaps = 0;
  for (const bubble of state.bubbles) {
    for (const bot of state.bots) {
      if (bubble.botId === bot.id) continue; // Skip own bubble
      if (bot.scale < 0.5) continue; // Skip spawning bots

      const botRect = {
        left: bot.x,
        top: bot.y,
        width: CONFIG.BOT_SIZE,
        height: CONFIG.BOT_SIZE,
      };

      if (bubble.left < botRect.left + botRect.width &&
          bubble.left + bubble.width > botRect.left &&
          bubble.top < botRect.top + botRect.height &&
          bubble.top + bubble.height > botRect.top) {
        const botName = bot.name || bot.type;
        console.log(`  OVERLAP: Bubble at (${Math.round(bubble.left)}, ${Math.round(bubble.top)}) overlaps bot ${botName} at (${Math.round(bot.x)}, ${Math.round(bot.y)})`);
        bubbleBotOverlaps++;
      }
    }
  }
  if (bubbleBotOverlaps === 0) {
    console.log('  OK: No bubble-bot overlaps detected');
  }

  // Print bot positions
  console.log('\n=== Bot Positions ===');
  for (const bot of state.bots) {
    const speed = Math.sqrt(bot.vx * bot.vx + bot.vy * bot.vy);
    const status = bot.spawning ? 'SPAWNING' : speed > 0.1 ? 'moving' : 'idle';
    console.log(`  ${(bot.name || bot.type).padEnd(20)} (${Math.round(bot.x).toString().padStart(3)}, ${Math.round(bot.y).toString().padStart(3)}) ${status}`);
  }

  // Print bubble positions
  console.log('\n=== Bubble Positions ===');
  for (const bubble of state.bubbles) {
    console.log(`  Bot ${bubble.botId.slice(0, 8)}... at (${Math.round(bubble.left)}, ${Math.round(bubble.top)}) size ${bubble.width}x${bubble.height}`);
  }

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Bot-bot overlaps: ${botOverlaps}`);
  console.log(`Bubble-bubble overlaps: ${bubbleOverlaps}`);
  console.log(`Bubble-bot overlaps: ${bubbleBotOverlaps}`);

  const hasProblems = botOverlaps > 0 || bubbleOverlaps > 0 || bubbleBotOverlaps > 0;
  console.log(hasProblems ? '\nFAILED: Overlaps detected!' : '\nPASSED: No overlaps detected');

  await browser.close();
  process.exit(hasProblems ? 1 : 0);
}

checkOverlaps().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
