#!/usr/bin/env node
import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = resolve(root, 'dist', 'client');
const destination = resolve(root, 'vscode-extension', 'webview-dist');

if (!existsSync(source)) {
  throw new Error(`Webview build source not found: ${source}`);
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
