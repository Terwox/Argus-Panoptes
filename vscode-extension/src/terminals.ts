/**
 * Terminal Tracker for Auto-Continue
 *
 * Tracks VS Code terminals running Claude Code sessions.
 * When a rate limit expires, automatically sends "continue" to resume.
 */

import * as vscode from 'vscode';
import type { ArgusServer } from './server';

interface TrackedTerminal {
  terminal: vscode.Terminal;
  projectPath: string;
  createdAt: number;
}

export class TerminalTracker {
  private server: ArgusServer | null;
  private trackedTerminals: Map<string, TrackedTerminal> = new Map();
  private disposables: vscode.Disposable[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(server: ArgusServer | null) {
    this.server = server;
  }

  start(): void {
    // Track existing terminals
    for (const terminal of vscode.window.terminals) {
      this.trackTerminal(terminal);
    }

    // Track new terminals
    this.disposables.push(
      vscode.window.onDidOpenTerminal((terminal) => {
        this.trackTerminal(terminal);
      })
    );

    // Clean up closed terminals
    this.disposables.push(
      vscode.window.onDidCloseTerminal((terminal) => {
        this.untrackTerminal(terminal);
      })
    );

    // Periodically check for rate limit expiry
    this.checkInterval = setInterval(() => {
      this.checkRateLimits();
    }, 5000); // Check every 5 seconds

    console.log('[Argus Terminal] Tracker started');
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.trackedTerminals.clear();

    console.log('[Argus Terminal] Tracker stopped');
  }

  private trackTerminal(terminal: vscode.Terminal): void {
    // Check if this looks like a Claude Code terminal
    const name = terminal.name.toLowerCase();
    const isClaudeTerminal =
      name.includes('claude') ||
      name.includes('anthropic') ||
      name.includes('task') || // Task tool terminals
      name.includes('shell'); // Background shells

    if (!isClaudeTerminal) {
      return;
    }

    // Try to determine the project path
    // This is tricky because terminals don't expose their cwd directly
    // We'll use the terminal name or match against known projects
    const projectPath = this.extractProjectPath(terminal);

    if (projectPath) {
      this.trackedTerminals.set(terminal.name, {
        terminal,
        projectPath,
        createdAt: Date.now(),
      });
      console.log(`[Argus Terminal] Tracking: ${terminal.name} -> ${projectPath}`);
    }
  }

  private untrackTerminal(terminal: vscode.Terminal): void {
    this.trackedTerminals.delete(terminal.name);
    console.log(`[Argus Terminal] Untracked: ${terminal.name}`);
  }

  private extractProjectPath(terminal: vscode.Terminal): string | null {
    // Try to extract project path from terminal name
    // Claude Code often names terminals like "Claude: project-name"
    const name = terminal.name;

    // Pattern: "Claude: project-name" or "Task: project-name"
    const match = name.match(/^(?:Claude|Task):\s*(.+)$/i);
    if (match) {
      // This gives us the project name, but we need the full path
      // We'll need to match it against known projects from the server
      const projectName = match[1].trim();

      if (this.server) {
        const state = this.server.getState();
        for (const project of Object.values(state.projects)) {
          if (
            project.name === projectName ||
            project.path.endsWith(projectName)
          ) {
            return project.path;
          }
        }
      }
    }

    // Fall back to checking if the terminal cwd matches a known project
    // (This requires the terminal to have been created with a specific cwd)
    if (this.server) {
      const state = this.server.getState();
      for (const project of Object.values(state.projects)) {
        // Check if terminal name contains project name
        if (name.includes(project.name)) {
          return project.path;
        }
      }
    }

    return null;
  }

  private checkRateLimits(): void {
    if (!this.server) return;

    const config = vscode.workspace.getConfiguration('argus');
    const autoContinueEnabled = config.get<boolean>('autoContinue.enabled', true);
    const delayMs = config.get<number>('autoContinue.delayMs', 2000);

    if (!autoContinueEnabled) return;

    // Check for expired rate limits
    const expired = this.server.checkRateLimitExpiry();

    for (const { projectPath, projectName } of expired) {
      // Find matching terminal
      const tracked = this.findTerminalForProject(projectPath);

      if (tracked) {
        // Delay before sending continue
        setTimeout(() => {
          this.sendContinue(tracked.terminal, projectName);
        }, delayMs);
      }
    }
  }

  private findTerminalForProject(projectPath: string): TrackedTerminal | null {
    for (const tracked of this.trackedTerminals.values()) {
      if (tracked.projectPath === projectPath) {
        return tracked;
      }
    }
    return null;
  }

  private sendContinue(terminal: vscode.Terminal, projectName: string): void {
    try {
      // Send "continue" to the terminal
      terminal.sendText('continue');

      // Show notification
      vscode.window.showInformationMessage(
        `Argus: Auto-continued ${projectName} after rate limit`
      );

      console.log(`[Argus Terminal] Sent continue to: ${terminal.name}`);
    } catch (error) {
      console.error('[Argus Terminal] Failed to send continue:', error);
    }
  }

  // Public method to manually trigger continue for a project
  public continueProject(projectPath: string): boolean {
    const tracked = this.findTerminalForProject(projectPath);

    if (tracked) {
      const projectName = projectPath.split(/[/\\]/).pop() || 'project';
      this.sendContinue(tracked.terminal, projectName);
      return true;
    }

    return false;
  }
}
