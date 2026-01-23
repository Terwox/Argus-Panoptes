/**
 * Git commit scanner for generating realistic fake agent activities
 *
 * Scans recent commits from known git repositories and extracts
 * commit messages that can be used as fake agent tasks.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files?: string[];
}

/**
 * Check if a directory is a git repository
 */
function isGitRepo(dir: string): boolean {
  return existsSync(join(dir, '.git'));
}

/**
 * Get recent commits from a git repository
 * @param repoPath Path to the git repository
 * @param limit Maximum number of commits to return
 * @returns Array of commit objects
 */
export function getRecentCommits(repoPath: string, limit: number = 10): GitCommit[] {
  if (!isGitRepo(repoPath)) {
    return [];
  }

  try {
    // Get commits with format: hash|message|author|date
    const output = execSync(
      `git log --oneline --format="%H|%s|%an|%ar" -n ${limit}`,
      {
        cwd: repoPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      }
    );

    return output
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
  } catch (e) {
    // Git command failed (not a repo, git not installed, etc.)
    return [];
  }
}

/**
 * Map commit messages to plausible agent activities
 * This transforms git commits into activities that match agent roles
 */
export function commitToAgentActivity(commit: GitCommit): {
  activity: string;
  suggestedRole: string;
} {
  const msg = commit.message.toLowerCase();

  // Detect activity type from commit message patterns
  if (msg.startsWith('fix') || msg.includes('bug')) {
    return {
      activity: `Debugging: ${commit.message}`,
      suggestedRole: 'executor',
    };
  }

  if (msg.startsWith('add') || msg.startsWith('feat') || msg.includes('feature')) {
    return {
      activity: `Implementing: ${commit.message}`,
      suggestedRole: 'executor',
    };
  }

  if (msg.startsWith('refactor') || msg.includes('clean')) {
    return {
      activity: `Refactoring: ${commit.message}`,
      suggestedRole: 'architect',
    };
  }

  if (msg.includes('test')) {
    return {
      activity: `Testing: ${commit.message}`,
      suggestedRole: 'tester',
    };
  }

  if (msg.includes('doc') || msg.includes('readme') || msg.includes('comment')) {
    return {
      activity: `Documenting: ${commit.message}`,
      suggestedRole: 'writer',
    };
  }

  if (msg.includes('style') || msg.includes('css') || msg.includes('ui')) {
    return {
      activity: `Designing: ${commit.message}`,
      suggestedRole: 'designer',
    };
  }

  if (msg.includes('research') || msg.includes('explore') || msg.includes('investigate')) {
    return {
      activity: `Researching: ${commit.message}`,
      suggestedRole: 'researcher',
    };
  }

  if (msg.includes('plan') || msg.includes('design') || msg.includes('architecture')) {
    return {
      activity: `Planning: ${commit.message}`,
      suggestedRole: 'planner',
    };
  }

  // Default to executor with generic activity
  return {
    activity: `Working on: ${commit.message}`,
    suggestedRole: 'executor',
  };
}

/**
 * Scan multiple repositories and get combined commits
 * @param repoPaths Array of repository paths to scan
 * @param totalLimit Maximum total commits to return
 */
export function scanRepositories(
  repoPaths: string[],
  totalLimit: number = 20
): GitCommit[] {
  const allCommits: GitCommit[] = [];
  const perRepoLimit = Math.ceil(totalLimit / repoPaths.length);

  for (const path of repoPaths) {
    const commits = getRecentCommits(path, perRepoLimit);
    allCommits.push(...commits);
  }

  // Sort by date (most recent first) and limit
  return allCommits.slice(0, totalLimit);
}

/**
 * Get activities suitable for fake agents based on recent git activity
 * @param repoPaths Repository paths to scan
 * @param limit Maximum activities to return
 */
export function getFakeActivitiesFromGit(
  repoPaths: string[],
  limit: number = 20
): Array<{ activity: string; suggestedRole: string }> {
  const commits = scanRepositories(repoPaths, limit);
  return commits.map(commitToAgentActivity);
}
