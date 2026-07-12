# Argus Panoptes VS Code Extension

Embed the Argus dashboard in VS Code and connect it to Claude Code terminals for auto-continue behavior.

## Features

- **Embedded dashboard** — Opens the Argus client in a VS Code webview panel
- **Status bar** — Shows the blocked-project count
- **Auto-continue** — Resumes tracked Claude Code terminals after a detected rate limit expires
- **Terminal tracking** — Associates Claude Code terminals with the extension workflow

## Development Setup

From the repository root, install both dependency sets:

```bash
npm install
npm --prefix vscode-extension install
```

Build the extension and its webview from the repository root:

```bash
npm run ext:build
```

The build flow is automatic:

1. `vscode-extension` bundles `src/extension.ts` to `out/extension.js`.
2. The extension's `build:webview` script runs the root `build:client` script.
3. Vite writes the client build to `dist/client`.
4. `scripts/build-extension-webview.mjs` replaces `vscode-extension/webview-dist` with that build.

No manual webview copy is required.

Press **F5** in VS Code to launch the Extension Development Host after building.

For extension-source watch mode:

```bash
npm run ext:watch
```

Watch mode covers the extension bundle. Re-run `npm run ext:build` after client/webview changes.

## Package

From the repository root:

```bash
npm run ext:package
```

This produces a `.vsix` in `vscode-extension/`.

## Commands

- `Argus: Open Dashboard` — Open the dashboard panel
- `Argus: Toggle Auto-Continue` — Enable or disable auto-continue on rate-limit expiry

## Configuration

| Setting | Default | Description |
|---|---|---|
| `argus.autoContinue.enabled` | `true` | Auto-continue on rate-limit expiry |
| `argus.autoContinue.delayMs` | `2000` | Delay before auto-continue |
| `argus.server.port` | `4242` | Argus server port |
| `argus.dashboard.openOnStartup` | `false` | Open the dashboard on VS Code start |

## Architecture

- `src/extension.ts` — Activation, command registration, status bar, and component wiring
- `src/server.ts` — Embedded Argus Hypertext Transfer Protocol (HTTP) and WebSocket server
- `src/webview.ts` — Dashboard webview panel and VS Code message bridge
- `src/terminals.ts` — Terminal tracking and auto-continue behavior
- `webview-dist/` — Generated client input consumed by the packaged extension
