#!/usr/bin/env node
/**
 * Screenshot after bots have settled
 */

import puppeteer from 'puppeteer';

const outputPath = process.argv[2] || '.sisyphus/settled.png';

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 30000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto('http://localhost:5173?cute=true&demo=true', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Wait longer for bots to finish spawning and settle
  console.log('Waiting 8s for bots to settle...');
  await new Promise(r => setTimeout(r, 8000));

  await page.screenshot({ path: outputPath, fullPage: false });
  console.log(`Screenshot saved to ${outputPath}`);

  await browser.close();
}

takeScreenshot().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
