/**
 * Argus Dashboard WebView Panel
 *
 * Renders the Svelte dashboard inside a VS Code WebView panel.
 * In dev mode, loads from Vite dev server.
 * In prod mode, loads bundled assets.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { ArgusServer } from './server';

export class ArgusDashboardPanel {
  public static currentPanel: ArgusDashboardPanel | undefined;
  private static readonly viewType = 'argusDashboard';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly server: ArgusServer | null;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    server: ArgusServer | null
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.server = server;

    // Set initial HTML
    this.update();

    // Handle panel disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle visibility changes
    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          this.update();
        }
      },
      null,
      this.disposables
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case 'openProject':
            this.openProjectInTerminal(message.projectPath);
            break;
          case 'copyToClipboard':
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Copied to clipboard');
            break;
        }
      },
      null,
      this.disposables
    );
  }

  public static render(extensionUri: vscode.Uri, server: ArgusServer | null) {
    const column = vscode.ViewColumn.Two;

    // If panel exists, reveal it
    if (ArgusDashboardPanel.currentPanel) {
      ArgusDashboardPanel.currentPanel.panel.reveal(column);
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      ArgusDashboardPanel.viewType,
      'Argus Panoptes',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webview-dist'),
          vscode.Uri.joinPath(extensionUri, 'media'),
        ],
      }
    );

    ArgusDashboardPanel.currentPanel = new ArgusDashboardPanel(
      panel,
      extensionUri,
      server
    );
  }

  private update() {
    this.panel.webview.html = this.getHtmlContent();
  }

  private getHtmlContent(): string {
    const webview = this.panel.webview;
    const config = vscode.workspace.getConfiguration('argus');
    const serverPort = config.get<number>('server.port', 4242);

    // Check if we're in dev mode (webview-dist doesn't exist)
    const webviewDistPath = path.join(this.extensionUri.fsPath, 'webview-dist');
    const isDev = !fs.existsSync(webviewDistPath);

    if (isDev) {
      // Dev mode: load from Vite dev server
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Argus Panoptes</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0f0f0f;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .dev-notice {
      padding: 20px;
      text-align: center;
    }
    .dev-notice h2 {
      color: #3b82f6;
    }
    .dev-notice a {
      color: #60a5fa;
    }
    .dev-notice code {
      background: #1f1f1f;
      padding: 2px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="dev-notice">
    <h2>Development Mode</h2>
    <p>The Argus dashboard is running on the Vite dev server.</p>
    <p>
      <a href="http://localhost:5173" target="_blank">Open in browser</a>
      or run <code>npm run build:webview</code> to bundle.
    </p>
    <p style="margin-top: 20px; color: #888;">
      Server running on port ${serverPort}
    </p>
  </div>
  <script>
    // In dev mode, we could embed an iframe to the dev server
    // But that has CSP issues - better to just use the browser
  </script>
</body>
</html>`;
    }

    // Production mode: load bundled assets
    const indexPath = path.join(webviewDistPath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Argus Panoptes</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      background: #0f0f0f;
      color: white;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
    }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <h2 class="error">Build Required</h2>
  <p>Run <code>npm run build:webview</code> to generate the dashboard.</p>
</body>
</html>`;
    }

    // Read and transform the index.html
    let html = fs.readFileSync(indexPath, 'utf8');

    // Transform asset URLs to webview URIs
    const assetsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview-dist', 'assets')
    );

    // Replace relative asset paths with webview URIs
    html = html.replace(/src="\/assets\//g, `src="${assetsUri}/`);
    html = html.replace(/href="\/assets\//g, `href="${assetsUri}/`);

    // Inject server port configuration
    html = html.replace(
      '</head>',
      `<script>window.ARGUS_SERVER_PORT = ${serverPort};</script></head>`
    );

    // Add CSP meta tag
    const cspSource = webview.cspSource;
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; connect-src ws://localhost:${serverPort} http://localhost:${serverPort}; img-src ${cspSource} data:;">`;
    html = html.replace('<head>', `<head>${cspMeta}`);

    return html;
  }

  private openProjectInTerminal(projectPath: string) {
    // Find existing terminal for this project or create new one
    const terminalName = `Claude: ${path.basename(projectPath)}`;
    let terminal = vscode.window.terminals.find((t) => t.name === terminalName);

    if (!terminal) {
      // Open folder in new window
      const uri = vscode.Uri.file(projectPath);
      vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: false });
    } else {
      terminal.show();
    }
  }

  private dispose() {
    ArgusDashboardPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
