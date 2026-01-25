#!/usr/bin/env node
/**
 * Quick screenshot with minimal wait
 * Robust error handling and short timeouts
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const outputPath = process.argv[2] || '.sisyphus/quick.png';
const TIMEOUT_MS = 15000;

async function takeScreenshot() {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: TIMEOUT_MS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await page.goto('http://localhost:5173?cute=true&demo=true', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Short wait for initial render
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({
      path: outputPath,
      fullPage: false,
      timeout: 5000
    });

    console.log(`Screenshot saved to ${outputPath}`);

  } catch (err) {
    console.error('Screenshot failed:', err.message);
    // Still try to save whatever we can
    try {
      await page.screenshot({
        path: outputPath.replace('.png', '-error.png'),
        fullPage: false
      });
      console.log('Saved error screenshot');
    } catch (_) {}
    throw err;
  } finally {
    await browser.close();
  }
}

takeScreenshot().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
