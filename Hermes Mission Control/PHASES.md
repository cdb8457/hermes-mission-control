# Hermes Windows Mission Control — Build Phases

**Project Start:** 2026-04-20  
**Target:** Native Windows Electron app — the ultimate Hermes command center

---

## Phase Overview

```
Phase 1 ──── Foundation & Connection ✅ COMPLETE
Phase 2 ──── Core Features ✅ COMPLETE
Phase 3 ──── Power Features (Windows OS Integration) 🔵 IN PROGRESS
Phase 4 ──── Polish & Excellence (Animations, Global Search, Export)
Phase 5 ──── Beyond (Conductor, Voice, Plugin System)
```

---

## ✅ Phase 1 — Foundation & Connection

**Goal:** A working Electron window that connects to a Hermes gateway and sends a real chat message.

### Deliverables

- [x] `PRD.md`, `HANDOFF.md`, `PHASES.md` planning documents
- [x] `package.json` — electron-vite + all dependencies declared
- [x] `electron.vite.config.ts` — build config
- [x] `tsconfig.json` × 3 — root, node, web
- [x] `tailwind.config.js` + `postcss.config.js`
- [x] `src/main/index.ts` — BrowserWindow, frameless, custom titlebar
- [x] `src/preload/index.ts` — contextBridge typed API
- [x] `src/renderer/` — React app skeleton with React Router
- [x] **Connection Setup page** — enter host:port, optional API key, test connection
- [x] **Connection Store** — Zustand, auto-reconnect, health polling
- [x] **Hermes API client** — base fetch, SSE wrapper, health endpoint
- [x] **Sidebar layout** — navigation rail with icons (all routes wired)
- [x] **Custom titlebar** — drag region, minimize/maximize/close buttons
- [x] **Basic Chat page** — send message, receive streaming SSE response, render markdown
- [x] `resources/icon.ico` + `resources/tray-icon.ico`

### Success Criteria ✅
`npm run dev` opens a native Electron window. You can enter your Hermes host URL, click Connect, and send a chat message that streams back in real-time.

**Completed:** 2026-04-20

---

## ✅ Phase 2 — Core Features

**Goal:** Full feature parity with Hermes Workspace for the critical daily-use features.

### Deliverables

- [x] **Chat** — sessions list sidebar, session rename/delete, model picker, stop streaming, copy message, tool call blocks
- [x] **Dashboard** — connection card, stats grid (sessions, memory count, skills count), recent activity, quick action buttons, latency sparkline
- [x] **Memory Browser** — paginated list, search, view detail, inline edit, delete, create, filter by type
- [x] **Skills Explorer** — grid view, search, category filter, expandable parameter detail
- [x] **Terminal** — xterm.js WebSocket shell, multi-tab, ResizeObserver fit
- [x] **File Manager** — breadcrumb nav, upload/download, directory traversal
- [x] **Jobs Monitor** — real-time job list, filter tabs, progress bar, cancel button, output accordion
- [x] **System Tray** — icon, context menu (Show, New Chat, Dashboard, Quit), badge for active jobs
- [x] **Windows Notifications** — native toast for job completion, agent messages
- [x] **Theme System** — 8 themes with CSS variables, live switcher in settings
- [x] **Settings page** — all settings with persistence via electron-store / localStorage
- [x] **Global hotkey** — `Ctrl+Shift+H` (configurable) to show/hide window
- [x] **Minimize to tray** — optional behavior, system tray left-click to restore
- [x] **Command Palette** — Ctrl+K fuzzy search overlay, 9 commands, keyboard navigation

### Success Criteria ✅
Full working day usable. Tray icon always visible. Global hotkey works. All 9 pages functional.

**Completed:** 2026-04-20

---

## ✅ Phase 3 — Power Features

**Goal:** Go beyond what the browser app offers with deep OS integration and advanced Windows-native power.

### Deliverables

- [x] **Terminal** — xterm.js connected to gateway WebSocket shell endpoint
- [x] **File Manager** — browse gateway workspace files, upload from Windows Explorer, download to local
- [x] **Jobs Monitor** — real-time job list with cancel button, log viewer
- [x] **Taskbar progress** — show job progress on taskbar button via `win.setProgressBar()`
- [x] **Auto-launch on startup** — `app.setLoginItemSettings()`, `--hidden` flag for silent startup
- [x] **Jump list** — Windows taskbar jump list (New Chat, Dashboard, Terminal + recent sessions)
- [x] **Drag files into chat** — drag zone with image/text/code preview, inline file chips
- [x] **Protocol handler** — `hermes://` URI scheme registered, handles `chat`, `dashboard`, `terminal`, `session/<id>`
- [x] **Offline queue** — messages queued in Zustand+localStorage when disconnected, auto-drain on reconnect
- [x] **Network scanner** — parallel /24 subnet scan via Electron net module, click-to-connect

### Success Criteria ✅
Auto-launches on Windows login, jump list works, files can be dragged from Explorer into chat, `hermes://` deep links open the app.

**Completed:** 2026-04-20

---

## ✅ Phase 4 — Polish & Excellence

**Goal:** Make it a masterpiece. Every pixel perfect, every interaction delightful.

### Deliverables

- [x] **Smooth animations** — framer-motion page transitions, fade-in, stagger lists, scale-pop modals
- [x] **Command palette** — `Ctrl+K` fuzzy search across all pages, actions, sessions
- [x] **Global search** — `Ctrl+G` searches chat history, memory items, and skills simultaneously
- [x] **Chat export** — export as Markdown, JSON, or plain text with one click
- [x] **Memory export/import** — JSON dump and bulk restore from file
- [x] **Error boundaries** — graceful per-page crash UI with retry and stack trace
- [x] **Onboarding flow** — first-launch wizard: connect → test → choose theme → launch
- [x] **About page** — version info, tech stack, feature highlights
- [x] **Keyboard shortcut map** — `Ctrl+?` visual overlay, all shortcuts documented
- [x] **Window state persistence** — size, position, maximized state restored on relaunch

### Success Criteria ✅
Zero TypeScript errors. 57 source files. 6,885 lines. Every feature deliberate.

**Completed:** 2026-04-20

---

## ✅ Phase 5 — Beyond (COMPLETE)

**Goal:** Features no one else has built.

### Deliverables

- [x] **Agent scheduler** — full cron-like recurring task UI with enable/disable, run-now, result preview
- [x] **Conductor view** — multi-agent orchestration panel with broadcast bar, per-session quick-send, activity feed, show/hide sessions
- [x] **Conversation branching** — fork chat at any message with GitFork button; forked sessions indented with branch indicator in sessions sidebar
- [x] **Memory graph** — SVG force-directed node graph with spring physics, draggable nodes, type color legend, click-to-detail; toggled with list/graph view buttons
- [x] **Skill builder** — full create/edit/delete UI with slide-in panel, parameters table (name/type/description/required), tags, category, enable toggle
- [x] **Auto-updater** — electron-updater pointed at GitHub Releases; check/download/install IPC; animated update notification banner
- [ ] **Voice input** — push-to-talk with Windows speech recognition
- [ ] **Voice output** — TTS for agent responses
- [ ] **macOS / Linux builds** — extend packaging for other platforms

---

## ✅ Phase 6 — Gateway Plugins & Hermes Dashboard (COMPLETE)

**Goal:** Deep integration with the live Hermes VM — see its built-in UI, run its plugins, trigger its commands — all without leaving Mission Control.

### Deliverables

- [x] **Gateway-advertised plugin system** — Hermes exposes `GET /api/plugins` returning `PluginManifest[]`; Mission Control discovers them on every connect, no local installs required
- [x] **Plugin store** — Zustand persist store; persists only `disabledIds` (manifests re-fetched fresh each connect); `enabledPlugins()` / `getPlugin(id)` derived selectors
- [x] **Plugin Manager page** (`/plugins`) — installed list with enable/disable toggles, surface badges (page/commands/widget), tag chips, API base display; "How it works" explainer tab
- [x] **Plugin page renderer** (`/plugin/:pluginId`) — full-window iframe with `postMessage` theme injection, loading overlay, error state with retry, open-in-browser button
- [x] **Sidebar plugin nav** — enabled plugins with a `page` surface auto-appear as nav items between the main nav and the bottom section; Plugins manager link added to bottom nav
- [x] **Plugin commands in Ctrl+K** — every enabled plugin's `commands[]` array dynamically appears in the command palette; triggers `POST {base}{endpoint}` on selection
- [x] **Hermes Dashboard page** (`/hermes-ui`) — iframe embedding the Hermes v0.9 SPA (port 9119 by default, configurable per profile via `dashboardPort`); probes reachability on load; tabs for Home / Sessions / Skills; `key={activeTab}` forces clean remount on tab switch
- [x] **Ephemeral token auth** — fetches session token from `/api/auth/session-token`, refreshes every 10 min, injects via `postMessage({ type: 'HERMES_MISSION_CONTROL_INIT', token, theme })` on iframe load; shows Authenticated / Read-only badge
- [x] **Dashboard port config** — `ConnectionProfile.dashboardPort?: number` (defaults to 9119); configurable in Connect page with explanatory subtext
- [x] **Connection store plugin lifecycle** — `discoverPlugins()` called on successful connect; `clearDiscovered()` called on connection loss

**Completed:** 2026-04-20

---

## Current Build Status

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1 — Foundation | ✅ Complete | 2026-04-20 | 2026-04-20 |
| 2 — Core Features | ✅ Complete | 2026-04-20 | 2026-04-20 |
| 3 — Power Features | ✅ Complete | 2026-04-20 | 2026-04-20 |
| 4 — Polish | ✅ Complete | 2026-04-20 | 2026-04-20 |
| 5 — Beyond | ✅ Complete | 2026-04-20 | 2026-04-20 |
| 6 — Gateway Plugins & Dashboard | ✅ Complete | 2026-04-20 | 2026-04-20 |

---

## Build Log

### 2026-04-20
- Project initialized. PRD, HANDOFF, PHASES documents created.
- Phase 1 complete: full Electron + React + TS scaffold, connection page, API client, sidebar, titlebar, SSE streaming chat.
- Phase 2 complete: all 10 pages, system tray, Windows notifications, 8-theme system, global hotkey, Ctrl+K command palette.
- Phase 3 complete: auto-launch, jump list, hermes:// protocol handler, drag-to-chat, offline message queue, LAN network scanner.
- Phase 4 complete: framer-motion animations, global search (Ctrl+G), chat export, memory export/import, error boundaries, onboarding wizard, about page, keyboard shortcut map (Ctrl+?).
- Phase 5 complete: agent scheduler, Conductor view (multi-agent orchestration), conversation branching, memory graph (SVG force simulation), skill builder (CRUD), auto-updater (electron-updater → GitHub Releases).
- Phase 6 complete: gateway-advertised plugin system (discover/enable/disable/iframe renderer), plugin commands in Ctrl+K, Hermes Dashboard iframe (port 9119, ephemeral token auth, postMessage theme injection), dashboard port config per connection profile.
- Build stats: **65 TypeScript files · 9,937 lines · 0 compiler errors**.
