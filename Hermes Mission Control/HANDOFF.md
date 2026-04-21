# Hermes Mission Control — Developer Handoff

> Complete technical reference for the Windows native Electron app.  
> **Build stats:** 65 TypeScript files · 9,937 lines · 0 compiler errors  
> **Last updated:** 2026-04-20

---

## Quick Start

```bat
cd "Hermes Mission Control"
npm install
npm run dev
```

Requires Node 18+. On first launch the onboarding wizard guides you through connecting to Hermes.

---

## Directory Tree

```
src/
├── main/                          # Electron main process
│   ├── index.ts                   # BrowserWindow, lifecycle, deep links, auto-launch
│   ├── tray.ts                    # System tray icon + context menu + notifications
│   ├── jumplist.ts                # Windows taskbar jump list (recent chats, tasks)
│   └── ipc/
│       ├── index.ts               # IPC handler registry
│       ├── window.ts              # Window controls (min/max/close/isMaximized)
│       ├── storage.ts             # keytar wrapper (Windows Credential Manager)
│       ├── connection.ts          # Connection profile CRUD (electron-store)
│       └── scanner.ts             # LAN /24 subnet scanner via Electron net module
│
├── preload/
│   └── index.ts                   # contextBridge — full ElectronBridgeAPI type
│
└── renderer/src/
    ├── App.tsx                    # Root: routes, global shortcuts, deep link handler
    ├── main.tsx                   # React root + QueryClient + Router
    │
    ├── pages/
    │   ├── Connect.tsx            # Connection setup + LAN scanner UI + dashboard port
    │   ├── Dashboard.tsx          # Stats grid, latency sparkline, quick actions
    │   ├── Chat.tsx               # Sessions, SSE streaming, drag-to-chat, export, fork
    │   ├── Memory.tsx             # CRUD + search + JSON export/import + graph view
    │   ├── Skills.tsx             # Grid + search + skill builder slide-in panel (CRUD)
    │   ├── Terminal.tsx           # xterm.js + WebSocket + multi-tab
    │   ├── Files.tsx              # Breadcrumb file manager + upload/download
    │   ├── Jobs.tsx               # Real-time job list + cancel + log viewer
    │   ├── Scheduler.tsx          # Cron task scheduler with presets + run-now
    │   ├── Conductor.tsx          # Multi-agent orchestration: broadcast, activity feed
    │   ├── HermesDashboard.tsx    # Iframe embed of Hermes v0.9 SPA (port 9119)
    │   ├── PluginManager.tsx      # Gateway plugin list — enable/disable/badges
    │   ├── PluginPage.tsx         # Full-window iframe renderer for plugin pages
    │   ├── Settings.tsx           # 8-theme picker, hotkey, notifications, auto-launch
    │   └── About.tsx              # Version, tech stack, feature highlights
    │
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx      # AnimatePresence page transitions wrapper
    │   │   ├── Sidebar.tsx        # Nav rail, collapse, status dot, feature gates
    │   │   └── TitleBar.tsx       # Drag region, min/max/close, isMaximized poll
    │   ├── shared/
    │   │   ├── CommandPalette.tsx # Ctrl+K fuzzy command search + dynamic plugin commands
    │   │   ├── GlobalSearch.tsx   # Ctrl+G — searches chats + memory + skills
    │   │   ├── KeyboardShortcuts.tsx # Ctrl+? shortcut map overlay
    │   │   ├── OfflineQueueBanner.tsx # Queued message count / drain progress
    │   │   ├── UpdateBanner.tsx   # Auto-updater notification (checking/available/downloading/ready)
    │   │   ├── MemoryGraph.tsx    # SVG force-directed memory node graph with spring physics
    │   │   ├── Onboarding.tsx     # First-launch 3-step wizard
    │   │   ├── PageTransition.tsx # framer-motion: FadeIn, StaggerList, ScalePop
    │   │   ├── ErrorBoundary.tsx  # Per-page crash UI with retry + stack trace
    │   │   └── EmptyState.tsx     # Reusable empty state component
    │   └── ui/
    │       ├── toaster.tsx        # Toast notifications
    │       └── tooltip.tsx        # Radix tooltip wrapper
    │
    ├── store/
    │   ├── connection.ts          # Profile, status, features, latency, auth headers
    │   ├── chat.ts                # Sessions, messages, streaming, tool calls, branching
    │   ├── settings.ts            # Theme, fontSize, hotkey, notifications, autoLaunch
    │   ├── offline.ts             # Offline message queue (Zustand + localStorage)
    │   └── plugins.ts             # Gateway plugin manifests + disabledIds persist
    │
    ├── api/
    │   ├── client.ts              # Base fetch, hermesGet/Post/Put/Delete, SSE stream
    │   ├── health.ts              # /health endpoint
    │   ├── chat.ts                # /v1/chat/completions SSE delta parser
    │   ├── memory.ts              # CRUD for /api/memory
    │   ├── skills.ts              # GET/POST/PUT/DELETE /api/skills + SkillParameter
    │   ├── jobs.ts                # GET/POST /api/jobs
    │   ├── scheduler.ts           # CRUD + run-now for /api/scheduler/tasks
    │   ├── files.ts               # List/upload/download /api/files
    │   └── plugins.ts             # GET /api/plugins → PluginManifest[]; triggerPluginCommand
    │
    ├── hooks/
    │   ├── useConnection.ts       # Health poll, feature discovery, auto-reconnect
    │   ├── useHermesSSE.ts        # SSE streaming + offline queue integration
    │   ├── useFileDrop.ts         # Native file drag-and-drop for chat input
    │   ├── useChatExport.ts       # Export chat as Markdown / JSON / plain text
    │   ├── useOfflineDrain.ts     # Auto-drain queued messages on reconnect
    │   ├── useNotifications.ts    # Windows notification triggers
    │   └── useToast.ts            # In-app toast helper
    │
    └── lib/
        └── utils.ts               # cn(), generateId(), formatRelative()
```

---

## IPC Channel Reference

All channels typed in `src/preload/index.ts` (`ElectronBridgeAPI`).

| Direction | Channel | Description |
|-----------|---------|-------------|
| → main | `window:minimize/maximize/close` | Window controls |
| ← main | `window:isMaximized` | Poll maximize state |
| → main | `storage:get/set/delete` | keytar credential ops |
| → main | `connection:profiles:*` | CRUD for saved profiles |
| → main | `notification:show` | Native Windows toast |
| → main | `tray:badge` | Update tray badge count |
| → main | `taskbar:progress` | Windows taskbar progress bar |
| → main | `hotkey:update` | Re-register global shortcut |
| → main | `autoLaunch:set` | Toggle Windows login item |
| ← main | `autoLaunch:get` | Read current login item state |
| → main | `jumplist:update` | Rebuild Windows jump list |
| → main | `scanner:scan` | LAN /24 subnet probe |
| ← main | `nav:newChat` | Tray "New Chat" click |
| ← main | `nav:dashboard` | Tray "Dashboard" click |
| ← main | `nav:deepLink` | `hermes://` deep link route |
| → main | `updater:check` | Check for updates (returns status) |
| → main | `updater:download` | Begin downloading update |
| → main | `updater:install` | Quit and install downloaded update |
| ← main | `updater:status` | Push event: checking/available/downloading/downloaded/error |

---

## SSE Streaming Flow

```
sendMessage() [useHermesSSE]
  │
  ├─ offline? → enqueue() [useOfflineQueue]
  │             ↑ drained by useOfflineDrain on reconnect
  │
  └─ online  → hermesStream() [api/client]
                └─ fetch POST /v1/chat/completions
                   └─ ReadableStream async generator
                      └─ yields raw SSE "data:" lines
                         └─ streamChatCompletion() [api/chat]
                            └─ parses OpenAI delta format
                               └─ yields { content?, toolCall?, done?, error? }
                                  └─ appendToMessage() / updateMessage() [store/chat]
```

---

## Theme System

8 themes via CSS custom properties on `html[data-theme="..."]`. Instant switching — zero JS runtime overhead.

| Theme | Accent | Background | Style |
|-------|--------|-----------|-------|
| `mission-dark` | Electric blue | Deep navy | Default |
| `mission-light` | Blue | White | Light mode |
| `slate-dark` | Indigo | Dark slate | Professional |
| `slate-light` | Indigo | Light slate | Clean |
| `mono-dark` | Terminal green | Near black | Hacker |
| `mono-light` | Dark gray | Off-white | Paper |
| `neon-dark` | Cyberpunk purple | Very dark | Vivid |
| `classic-dark` | Warm amber | Dark warm | Retro |

---

## Feature Discovery

On each connection, `discoverFeatures()` probes 6 gateway endpoints in parallel:

```
/api/sessions  → features.sessions
/api/memory    → features.memory
/api/skills    → features.skills
/api/jobs      → features.jobs
/api/files     → features.files
/v1/models     → features.models
```

Sidebar items gray out and pages show "Not Available" for missing features. Core chat always works.

---

## Key Behaviors

### Auto-reconnect
`useConnectionMonitor` runs a 30-second health ping. On failure, exponential backoff: 2s → 4s → 8s → 16s → 30s max.

### Offline Queue
Messages typed while disconnected saved to localStorage via Zustand persist. `useOfflineDrain` watches for `status === 'connected'` and drains sequentially with 500ms gaps.

### Protocol Handler
`hermes://` registered as Windows URI scheme via `app.setAsDefaultProtocolClient('hermes')`.
- `hermes://chat` → Chat page  
- `hermes://dashboard` → Dashboard  
- `hermes://terminal` → Terminal  
- `hermes://session/<id>` → Specific chat session

### Auto-Launch
`app.setLoginItemSettings({ openAtLogin, openAsHidden: true, args: ['--hidden'] })`. With `--hidden`, window starts minimized to tray — no flash on Windows startup.

### Jump List
Rebuilt on every session change via `jumplist:update` IPC. Shows up to 5 recent chats plus static tasks (New Chat, Dashboard, Terminal).

### Drag to Chat
`useFileDrop` handles native Windows Explorer file drops. Images → base64 data URLs. Text/code up to 200KB → appended as `<file name="...">` XML context blocks in the message body.

---

## Hermes Gateway API Contract

```
GET  /health                           → { status, version? }
POST /v1/chat/completions              → SSE stream (OpenAI delta format)
GET  /v1/models                        → { data: [{ id }] }
GET  /api/memory[?search=]            → MemoryItem[]
POST /api/memory                       → MemoryItem
PUT  /api/memory/:id                   → MemoryItem
DEL  /api/memory/:id                   → void
GET  /api/skills                       → Skill[]
POST /api/skills                       → Skill
PUT  /api/skills/:id                   → Skill
DEL  /api/skills/:id                   → void
GET  /api/jobs                         → Job[]
POST /api/jobs/:id/cancel              → void
GET  /api/files[?path=]               → FileEntry[]
POST /api/files/upload                 → void (multipart/form-data)
GET  /api/terminal/ws                  → WebSocket upgrade
GET  /api/scheduler/tasks              → ScheduledTask[]
POST /api/scheduler/tasks              → ScheduledTask
PUT  /api/scheduler/tasks/:id          → ScheduledTask
DEL  /api/scheduler/tasks/:id          → void
POST /api/scheduler/tasks/:id/run      → { job_id }
GET  /api/plugins                      → PluginManifest[]
POST {plugin.endpoints.base}{cmd.endpoint} → any (plugin command trigger)
GET  /api/auth/session-token           → { token } (Hermes dashboard ephemeral auth)
```

All endpoints accept `Authorization: Bearer <key>` if configured.


---

## Gateway Plugin System (Phase 6)

### PluginManifest shape

```typescript
interface PluginManifest {
  id: string
  name: string
  description: string
  version: string
  author?: string
  tags?: string[]
  endpoints: { base: string }        // e.g. "/api/plugins/weather"
  page?: {
    route: string                    // URL slug
    label: string                    // Sidebar label
    icon?: string                    // Lucide icon name (fallback: Puzzle)
    renderMode: 'iframe' | 'data'
  }
  commands?: Array<{
    id: string
    label: string
    description?: string
    endpoint: string                 // POST relative to endpoints.base
  }>
  widget?: {
    title: string
    endpoint: string                 // GET for widget data
    refreshInterval?: number         // ms, default 60_000
  }
}
```

### Lifecycle

1. `useConnection.ts` → successful connect → `usePluginStore.getState().discoverPlugins()`
2. `discoverPlugins()` → `GET /api/plugins` → stores `PluginManifest[]` in Zustand (not persisted)
3. User enable/disable → only `disabledIds: string[]` persisted in localStorage
4. Connection lost → `clearDiscovered()` clears the manifests list
5. On reconnect → re-discovers fresh manifests

### Surfaces

| Surface | How it works |
|---------|-------------|
| `page` | Appears as nav item in Sidebar plugins section; clicking opens `/plugin/:id` → full-window iframe at `{base}/ui` with postMessage theme injection |
| `commands` | Each command appears dynamically in the Ctrl+K command palette; selecting triggers `POST {base}{endpoint}` |
| `widget` | Reserved for future dashboard widget integration |

### Theme injection (all iframes)

All plugin iframes and the Hermes Dashboard receive CSS custom properties + optional auth token via postMessage on load:

```typescript
iframe.contentWindow.postMessage({
  type: 'HERMES_MISSION_CONTROL_THEME',  // plugins
  // or 'HERMES_MISSION_CONTROL_INIT',   // Hermes Dashboard (includes token)
  token?: string,
  theme: { '--primary': '...', '--background': '...', ... }
}, origin)
```

---

## Hermes Dashboard Integration (Phase 6)

- **URL:** `http://{host}:{dashboardPort}` where `dashboardPort` defaults to 9119 (configurable per `ConnectionProfile`)
- **Probe:** HEAD request with 3s timeout on page load; shows "not reachable" state if unreachable
- **Auth:** `GET /api/auth/session-token` → `{ token }`; token refreshed every 10 minutes; injected via postMessage after iframe load
- **Tabs:** Home (`/`), Sessions (`/sessions`), Skills (`/skills`) — each tab forces iframe remount via `key={activeTab}`
- **Badge:** "Authenticated" (green) when token obtained; "Read-only" (yellow) if token fetch fails

---

## State Persistence Layers

| Store | Mechanism | Persists across |
|-------|-----------|-----------------|
| Connection status / features | Zustand (memory) | Session only |
| Chat sessions + messages | `localStorage` | Relaunches |
| Settings (theme, hotkey, etc.) | `localStorage` | Relaunches |
| Offline message queue | `localStorage` via Zustand persist | Relaunches |
| Connection profiles | `electron-store` | Relaunches |
| Window bounds + state | `electron-store` | Relaunches |
| API keys | Windows Credential Manager (keytar) | System-level |

---

## Animation Primitives (PageTransition.tsx)

| Component | Use case |
|-----------|---------|
| `<PageTransition>` | Every page — opacity + y + scale on route change |
| `<FadeIn delay?>` | Individual elements, optional stagger delay |
| `<StaggerList>` | Container that staggers its children |
| `<StaggerItem>` | Direct child of StaggerList |
| `<SlideIn from?>` | Sidebars, drawers, panels |
| `<ScalePop>` | Modals, tooltips, cards |

---

## Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+G` | Global search |
| `Ctrl+?` | Keyboard shortcut map |
| `Ctrl+N` | New chat |
| `Ctrl+1..8` | Navigate to page 1-8 |
| `Ctrl+Shift+H` | Toggle window (configurable) |

---

*For build phases and roadmap → `PHASES.md`*  
*For user setup → `INSTALL.md`*
