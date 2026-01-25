# Argus Panoptes VS Code Extension

Embed the Argus dashboard directly in VS Code with terminal integration for auto-continue.

## Features

- **Embedded Dashboard**: View the Argus dashboard in a VS Code WebView panel
- **Status Bar**: Quick indicator showing blocked project count
- **Auto-Continue**: Automatically resume Claude Code sessions when rate limits expire
- **Terminal Tracking**: Tracks Claude Code terminals for seamless integration

## Installation

### Development

1. Build the extension:
   ```bash
   cd vscode-extension
   npm install
   npm run build
   ```

2. Build the webview (from root):
   ```bash
   npm run build:client
   cp -r client/dist vscode-extension/webview-dist
   ```

3. Press F5 in VS Code to launch the Extension Development Host

### Production

```bash
npm run package
```

Then install the generated `.vsix` file.

## Commands

- `Argus: Open Dashboard` - Open the dashboard panel
- `Argus: Toggle Auto-Continue` - Enable/disable auto-continue on rate limit expiry

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `argus.autoContinue.enabled` | `true` | Auto-continue on rate limit expiry |
| `argus.autoContinue.delayMs` | `2000` | Delay before auto-continue |
| `argus.server.port` | `4242` | Argus server port |
| `argus.dashboard.openOnStartup` | `false` | Open dashboard on VS Code start |

## Development

```bash
# Watch mode
npm run watch

# Build for production
npm run build
```

## Architecture

- `extension.ts` - Entry point, command registration, status bar
- `server.ts` - Embedded Argus HTTP server
- `webview.ts` - Dashboard WebView panel
- `terminals.ts` - Terminal tracking for auto-continue
