/**
 * Argus Panoptes VS Code Extension
 *
 * Provides:
 * - Embedded Argus server for monitoring Claude Code sessions
 * - WebView dashboard panel
 * - Terminal tracking for auto-continue on rate limit expiry
 * - Status bar integration
 */

import * as vscode from 'vscode';
import { ArgusServer } from './server';
import { ArgusDashboardPanel } from './webview';
import { TerminalTracker } from './terminals';

let server: ArgusServer | null = null;
let terminalTracker: TerminalTracker | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

export async function activate(context: vscode.ExtensionContext) {
  console.log('[Argus] Extension activating...');

  // Get configuration
  const config = vscode.workspace.getConfiguration('argus');
  const port = config.get<number>('server.port', 4242);
  const openOnStartup = config.get<boolean>('dashboard.openOnStartup', false);

  // Start embedded Argus server
  try {
    server = new ArgusServer(port);
    await server.start();
    console.log(`[Argus] Server started on port ${port}`);
  } catch (error) {
    console.error('[Argus] Failed to start server:', error);
    vscode.window.showErrorMessage(`Argus: Failed to start server on port ${port}`);
  }

  // Start terminal tracker
  terminalTracker = new TerminalTracker(server);
  terminalTracker.start();

  // Create status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(eye) Argus';
  statusBarItem.tooltip = 'Open Argus Dashboard';
  statusBarItem.command = 'argus.openDashboard';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('argus.openDashboard', () => {
      ArgusDashboardPanel.render(context.extensionUri, server);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('argus.toggleAutoContinue', () => {
      const currentValue = config.get<boolean>('autoContinue.enabled', true);
      config.update('autoContinue.enabled', !currentValue, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Argus: Auto-continue ${!currentValue ? 'enabled' : 'disabled'}`
      );
    })
  );

  // Update status bar based on server state
  if (server) {
    server.onStateChange((state) => {
      const blockedCount = Object.values(state.projects).filter(
        (p) => p.status === 'blocked'
      ).length;

      if (blockedCount > 0) {
        statusBarItem!.text = `$(eye) Argus (${blockedCount} blocked)`;
        statusBarItem!.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
      } else {
        statusBarItem!.text = '$(eye) Argus';
        statusBarItem!.backgroundColor = undefined;
      }
    });
  }

  // Open dashboard on startup if configured
  if (openOnStartup) {
    vscode.commands.executeCommand('argus.openDashboard');
  }

  console.log('[Argus] Extension activated');
}

export function deactivate() {
  console.log('[Argus] Extension deactivating...');

  if (terminalTracker) {
    terminalTracker.stop();
    terminalTracker = null;
  }

  if (server) {
    server.stop();
    server = null;
  }

  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }

  console.log('[Argus] Extension deactivated');
}
