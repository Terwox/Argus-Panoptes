#!/usr/bin/env node
/**
 * Opens the Argus dashboard in the default browser after a short delay
 * (waits for servers to be ready)
 */

import { exec } from 'child_process';
import { platform } from 'os';

const URL = 'http://localhost:5173';
const DELAY = 3000; // 3 seconds for servers to start

// Wait for servers to be ready
await new Promise(resolve => setTimeout(resolve, DELAY));

// Open browser based on platform
const plat = platform();
let cmd;

if (plat === 'win32') {
  cmd = `start "" "${URL}"`;
} else if (plat === 'darwin') {
  cmd = `open "${URL}"`;
} else {
  // Linux
  cmd = `xdg-open "${URL}"`;
}

exec(cmd, (err) => {
  if (err) {
    console.log(`[Argus] Could not open browser automatically. Please visit: ${URL}`);
  } else {
    console.log(`[Argus] Opened ${URL} in browser`);
  }
});
