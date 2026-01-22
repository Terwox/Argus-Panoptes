/**
 * Session Discovery
 *
 * Detects already-running Claude Code sessions on startup by scanning
 * transcript files in ~/.claude/projects/
 */

import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import * as state from './state.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');
const RECENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes - consider active if modified recently

interface TranscriptEntry {
  type: string;
  message?: {
    content?: string;
  };
  cwd?: string;
}

/**
 * Decode a project directory name back to its original path
 * Claude encodes paths like "d--git-Argus-Panoptes" for "d:/git/Argus-Panoptes"
 */
function decodeProjectPath(dirName: string): string {
  // Replace -- with : and - with /
  // e.g., "d--git-Argus-Panoptes" -> "d:/git/Argus-Panoptes"
  return dirName.replace(/--/g, ':/').replace(/-/g, '/');
}

/**
 * Extract project name from path
 */
function projectNameFromPath(path: string): string {
  return basename(path);
}

/**
 * Find the most recent transcript file in a project directory (if active)
 */
function findMostRecentTranscript(projectDir: string): string | null {
  const now = Date.now();
  let mostRecent: { path: string; mtime: number } | null = null;

  try {
    const files = readdirSync(projectDir);

    for (const file of files) {
      // Only consider main session transcripts (UUID.jsonl), not subagent transcripts
      if (file.endsWith('.jsonl') && !file.includes('/')) {
        const filePath = join(projectDir, file);
        const stats = statSync(filePath);

        // Track the most recently modified
        if (!mostRecent || stats.mtimeMs > mostRecent.mtime) {
          mostRecent = { path: filePath, mtime: stats.mtimeMs };
        }
      }
    }

    // Only return if modified recently enough
    if (mostRecent && now - mostRecent.mtime < RECENT_THRESHOLD) {
      return mostRecent.path;
    }
  } catch (e) {
    // Directory might not exist or be inaccessible
  }

  return null;
}

/**
 * Parse transcript to extract session info
 */
function parseTranscript(transcriptPath: string): { sessionId: string; cwd: string } | null {
  try {
    const content = readFileSync(transcriptPath, 'utf8');
    const lines = content.trim().split('\n');

    // Session ID is the filename without extension
    const sessionId = basename(transcriptPath, '.jsonl');

    // Try to find cwd from the transcript entries
    for (const line of lines.slice(0, 20)) { // Check first 20 lines
      try {
        const entry = JSON.parse(line) as TranscriptEntry;
        if (entry.cwd) {
          return { sessionId, cwd: entry.cwd };
        }
      } catch (e) {
        // Skip malformed lines
      }
    }

    // If no cwd in transcript, derive from directory name
    const dirName = basename(join(transcriptPath, '..'));
    const cwd = decodeProjectPath(dirName);

    return { sessionId, cwd };
  } catch (e) {
    return null;
  }
}

/**
 * Discover and register existing Claude sessions
 */
export function discoverExistingSessions(): number {
  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.log('[Argus] No Claude projects directory found');
    return 0;
  }

  let discoveredCount = 0;

  try {
    const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);

    for (const dirName of projectDirs) {
      const projectDir = join(CLAUDE_PROJECTS_DIR, dirName);

      // Skip if not a directory
      try {
        if (!statSync(projectDir).isDirectory()) continue;
      } catch (e) {
        continue;
      }

      // Find the most recent transcript (if active)
      const transcriptPath = findMostRecentTranscript(projectDir);

      if (transcriptPath) {
        const info = parseTranscript(transcriptPath);

        if (info) {
          const projectName = projectNameFromPath(info.cwd);

          // Register this session
          console.log(`[Argus] Discovered active session: ${projectName} (${info.sessionId.slice(0, 8)}...)`);

          state.onSessionStart(info.sessionId, info.cwd, projectName);
          discoveredCount++;
        }
      }
    }
  } catch (e) {
    console.error('[Argus] Error discovering sessions:', e);
  }

  return discoveredCount;
}
