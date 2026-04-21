# Hermes Mission Control — Windows Install Guide

## Requirements

- **Windows 10** (build 1903+) or **Windows 11**
- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- A running **Hermes gateway** accessible on your local network

---

## Install & Run

```bat
cd "Hermes Mission Control"
npm install
npm run dev
```

First launch opens the onboarding wizard. Enter your Hermes gateway host and port, test the connection, choose a theme, and you're in.

---

## Build a Distributable (.exe)

```bat
npm run build
npm run build:win
```

The installer will be in `dist/`. Installs to `%LOCALAPPDATA%\Programs\Hermes Mission Control`.

---

## First-Time Setup

1. **Launch** — the onboarding wizard appears automatically on first run.
2. **Connect** — enter your Hermes gateway IP and port (default: `8642`).  
   Or click **Scan** to auto-discover Hermes gateways on your local network.
3. **API Key** (optional) — if your gateway requires authentication, enter the key. It's stored in Windows Credential Manager, never in plain text.
4. **Theme** — pick from 8 themes. You can change it anytime in Settings.
5. **Done** — Mission Control launches into the dashboard.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+G` | Global search (chats, memory, skills) |
| `Ctrl+?` | Keyboard shortcut reference |
| `Ctrl+N` | New chat session |
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Chat |
| `Ctrl+3` | Memory |
| `Ctrl+4` | Skills |
| `Ctrl+5` | Terminal |
| `Ctrl+6` | Files |
| `Ctrl+7` | Jobs |
| `Ctrl+8` | Scheduler |
| `Ctrl+9` | Conductor |
| `Ctrl+Shift+H` | Show / hide window (configurable in Settings) |

---

## Windows Integration Features

- **System tray** — Mission Control lives in your system tray. Right-click for quick actions; left-click to show/hide.
- **Jump list** — Right-click the taskbar button to jump directly to recent chats or open new ones.
- **Auto-launch** — Enable "Launch on Windows startup" in Settings to start Mission Control with Windows (launches minimized to tray).
- **Protocol handler** — `hermes://` links open Mission Control. Example: clicking `hermes://chat` from another app navigates to the chat page.
- **Drag & drop** — Drag files from Windows Explorer directly into the chat input. Images and text files are attached inline.
- **Taskbar progress** — When jobs are active, the taskbar button shows a progress indicator.
- **Auto-updater** — Mission Control silently checks for updates at startup. A banner appears when a new version is ready — click to download and install without leaving the app.
- **Conductor** — Multi-agent orchestration panel. Run multiple sessions simultaneously, broadcast a single message to all sessions at once, and watch an activity feed of all agent replies in real time.

---

## Offline Usage

Messages typed while your Hermes gateway is unreachable are **queued automatically**. A banner at the bottom of the screen shows the queue count. When the connection is restored, queued messages are sent in order.

---

## Connecting to Hermes

### Default Port
Hermes typically runs on port `8642`. If you've changed this, update it in the connection form.

### API Key
If your Hermes instance has API key authentication enabled:
1. On the Connect page, expand the API Key field.
2. Enter your key (displayed as `sk-...`).
3. It's saved to Windows Credential Manager — never written to disk in plain text.

### HTTPS
Enable "Use HTTPS" in the connection form if your gateway is behind a reverse proxy with TLS.

### LAN Discovery
Can't remember your gateway's IP? Click **Scan** on the Connect page. Mission Control scans your local /24 subnet and shows any Hermes gateways it finds, with latency.

---

## Settings Reference

| Setting | Description |
|---------|-------------|
| Theme | 8 visual themes — live preview |
| Font size | 12–18px, affects all text |
| Minimize to tray | Close button hides window instead of quitting |
| Launch on startup | Start with Windows (minimized to tray) |
| Global hotkey | Default `Ctrl+Shift+H` — show/hide window from anywhere |
| Notifications | Per-type toggles: job complete, agent message, connection change |

---

## Troubleshooting

**Can't connect to Hermes**
- Confirm Hermes is running: open a browser and visit `http://<ip>:<port>/health`
- Check Windows Firewall — port `8642` must be allowed for inbound connections
- Try the LAN scanner (Connect page → Scan) to find the correct IP

**App won't start**
- Run `npm install` again — missing native modules (keytar) sometimes need a reinstall
- Check Node version: `node --version` — must be 18 or higher

**Global hotkey not working**
- Another app may have registered the same shortcut
- Go to Settings → change the hotkey to something unused

**Tray icon missing**
- Check the Windows notification area overflow (^ in taskbar)
- Restart Mission Control if the icon disappeared after a Windows update

**`hermes://` links not working**
- The protocol handler is registered on first run. If it's missing, reinstall the app or run `npm run build:win` and install the generated `.exe`

---

## Data Locations

| Data | Location |
|------|---------|
| Connection profiles | `%APPDATA%\hermes-mission-control\config.json` |
| Window state | `%APPDATA%\hermes-mission-control\config.json` |
| Chat history, settings, queue | `localStorage` (cleared with browser data in DevTools) |
| API keys | Windows Credential Manager (`hermes-mission-control` service) |
| App logs | `%APPDATA%\hermes-mission-control\logs\` |
