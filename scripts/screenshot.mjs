#!/usr/bin/env node
/**
 * Quick screenshot script for visual verification
 * Usage: node scripts/screenshot.mjs [output.png]
 */

import puppeteer from 'puppeteer';

const outputPath = process.argv[2] || '.sisyphus/bubble-test.png';

async function takeScreenshot() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setViewport({ width: 1400, height: 900 });

  // Navigate with URL params to enable cute mode and demo mode
  console.log('Navigating to dashboard with cute mode enabled...');
  await page.goto('http://localhost:5173?cute=true&demo=true', { waitUntil: 'networkidle0' });

  // Helper for delays
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // Wait for bots to spawn and animate
  console.log('Waiting for bots to spawn...');
  await delay(4000);

  console.log(`Taking screenshot to ${outputPath}...`);
  await page.screenshot({ path: outputPath, fullPage: false });

  await browser.close();
  console.log('Done!');
}

takeScreenshot().catch(console.error);
