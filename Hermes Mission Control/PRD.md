# Hermes Windows Mission Control — Product Requirements Document

**Version:** 1.0.0  
**Date:** 2026-04-20  
**Status:** Active Development  
**Owner:** Clint

---

## 1. Vision

Hermes Windows Mission Control is the definitive native Windows desktop application for commanding a remote Hermes AI agent instance. Where Hermes Workspace is a browser-based experience, Mission Control is a fully-native, deeply integrated Windows application — faster to launch, richer in OS integration, and purpose-built for a power user who wants their AI command center to behave like a first-class Windows citizen.

**North Star:** *The best AI agent desktop interface ever built for Windows.*

---

## 2. Problem Statement

The existing Hermes Workspace is excellent as a browser-based PWA, but it has limitations on Windows:

- No native system tray / taskbar presence
- Relies on a browser process for rendering
- No Windows-native notifications with action buttons
- No keyboard-global hotkeys to summon the window from anywhere
- No auto-launch or background agent monitoring without keeping a browser tab open
- No native file drag-and-drop into the agent
- No jump list shortcuts to common actions
- Connection settings buried in env files — no GUI for pointing at a remote Hermes

Mission Control solves all of these.

---

## 3. Target User

**Primary:** Clint — a power user who runs Hermes on a networked machine (server, NAS, or desktop) and wants to command it from his Windows workstation with zero friction.

**Secondary:** Any developer or technical user with a remote Hermes gateway who wants native Windows integration.

---

## 4. Core Principles

1. **Network-first** — Hermes lives elsewhere on the network. Mission Control is the remote commander. No local Python required.
2. **Native Windows** — Tray, notifications, jump lists, auto-launch, keyboard shortcuts. Feel like a real app.
3. **No-compromise features** — Everything Hermes Workspace has, plus more.
4. **Resilient connectivity** — Auto-reconnect, connection health indicators, offline mode with queue.
5. **Speed** — Sub-100ms UI response. SSE streams land immediately.
6. **Beautiful** — Dark-first, multiple themes, smooth animations.

---

## 5. Feature Requirements

### 5.1 Connection & Discovery

| ID | Feature | Priority |
|----|---------|----------|
| C-01 | Manual host configuration (IP:Port + optional auth) | P0 |
| C-02 | Local network scanner — discover Hermes instances via mDNS/port scan | P1 |
| C-03 | Connection health indicator (connected / reconnecting / offline) | P0 |
| C-04 | Auto-reconnect with exponential backoff | P0 |
| C-05 | Multiple saved connection profiles | P1 |
| C-06 | API key / Bearer token auth support | P0 |
| C-07 | Password-based auth support | P1 |
| C-08 | Connection test / ping latency display | P1 |

### 5.2 Chat

| ID | Feature | Priority |
|----|---------|----------|
| CH-01 | Send messages with SSE streaming response | P0 |
| CH-02 | Tool call rendering (show tool name, input, output collapsible) | P0 |
| CH-03 | Markdown rendering with syntax highlighting | P0 |
| CH-04 | Session list (create, rename, delete, switch) | P0 |
| CH-05 | File attachment drag-and-drop | P1 |
| CH-06 | Message copy, regenerate, edit | P1 |
| CH-07 | Model selector (if gateway exposes multiple models) | P1 |
| CH-08 | Stop / cancel streaming response | P0 |
| CH-09 | Auto-scroll with scroll-to-bottom button | P0 |
| CH-10 | Token count / cost estimation display | P2 |

### 5.3 Dashboard

| ID | Feature | Priority |
|----|---------|----------|
| D-01 | Live connection status + gateway uptime | P0 |
| D-02 | Active sessions count | P1 |
| D-03 | Memory items count | P1 |
| D-04 | Skills installed count | P1 |
| D-05 | Recent chat sessions list | P1 |
| D-06 | Active/pending jobs with progress | P1 |
| D-07 | System stats from gateway (CPU, memory if exposed) | P2 |
| D-08 | Quick-action buttons (New Chat, Browse Memory, Run Skill) | P1 |

### 5.4 Memory Browser

| ID | Feature | Priority |
|----|---------|----------|
| M-01 | List all memory items with search | P0 |
| M-02 | View memory item full content | P0 |
| M-03 | Edit memory item inline | P1 |
| M-04 | Delete memory item with confirmation | P1 |
| M-05 | Create new memory item | P1 |
| M-06 | Filter by type/namespace | P1 |
| M-07 | Export memory to JSON | P2 |

### 5.5 Skills Explorer

| ID | Feature | Priority |
|----|---------|----------|
| SK-01 | Browse all available skills | P0 |
| SK-02 | Search skills by name/description | P0 |
| SK-03 | View skill details (description, parameters) | P1 |
| SK-04 | Run skill directly from explorer | P1 |
| SK-05 | Filter by category/tag | P1 |

### 5.6 Terminal

| ID | Feature | Priority |
|----|---------|----------|
| T-01 | xterm.js terminal connected to gateway shell endpoint | P1 |
| T-02 | Multiple terminal tabs | P2 |
| T-03 | Terminal font size / color scheme settings | P2 |

### 5.7 Jobs Monitor

| ID | Feature | Priority |
|----|---------|----------|
| J-01 | List all jobs (active, queued, completed, failed) | P1 |
| J-02 | Real-time job progress via SSE | P1 |
| J-03 | Cancel/stop active job | P1 |
| J-04 | Job output log viewer | P1 |
| J-05 | Job history with timestamps | P2 |

### 5.8 File Manager

| ID | Feature | Priority |
|----|---------|----------|
| F-01 | Browse remote files via gateway file API | P1 |
| F-02 | Upload local file to agent workspace | P1 |
| F-03 | Download file from agent workspace | P1 |
| F-04 | Preview text/code files inline | P2 |

### 5.9 Windows Integration

| ID | Feature | Priority |
|----|---------|----------|
| W-01 | System tray icon with context menu | P0 |
| W-02 | Minimize to tray (not taskbar) option | P1 |
| W-03 | Windows native toast notifications for agent events | P1 |
| W-04 | Global hotkey to show/hide window | P1 |
| W-05 | Auto-launch on Windows startup | P1 |
| W-06 | Jump list shortcuts (New Chat, Open Dashboard) | P2 |
| W-07 | Taskbar progress bar for active jobs | P2 |
| W-08 | Drag files from Explorer into chat | P1 |
| W-09 | Protocol handler: `hermes://` deep links | P2 |

### 5.10 Settings & Themes

| ID | Feature | Priority |
|----|---------|----------|
| S-01 | 8+ themes (dark/light variants, Slate, Mono, Classic, Neon) | P1 |
| S-02 | Font size controls | P1 |
| S-03 | Startup behavior settings | P1 |
| S-04 | Notification preferences | P1 |
| S-05 | Keyboard shortcut customization | P2 |
| S-06 | Data export (chat history, memory dump) | P2 |

---

## 6. Non-Functional Requirements

- **Performance:** App cold start < 2 seconds. UI frame rate ≥ 60fps. SSE latency overhead < 20ms.
- **Reliability:** Auto-reconnect within 5 seconds of connection loss. Message queue during offline.
- **Security:** API keys stored in Windows Credential Manager (not plaintext files). CSP headers on renderer. Context isolation enforced.
- **Accessibility:** Keyboard-navigable. Screen reader compatible UI labels.
- **Package size:** Installer < 120MB. 
- **OS support:** Windows 10 (build 1903+) and Windows 11.

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 33+ |
| Build tool | electron-vite 2+ |
| Frontend framework | React 18 + TypeScript |
| Styling | Tailwind CSS 3 + CSS variables for themes |
| UI components | shadcn/ui (radix-ui primitives) |
| State management | Zustand |
| Data fetching | TanStack Query (react-query) |
| Routing | React Router v6 |
| Terminal | xterm.js |
| Charts | Recharts |
| Markdown | react-markdown + remark-gfm + shiki |
| SSE client | Native EventSource + custom reconnect wrapper |
| IPC | Electron contextBridge (no remote module) |
| Secure storage | keytar (Windows Credential Manager) |
| Notifications | Electron native notifications |
| Tray | Electron Tray API |
| Packaging | electron-builder |

---

## 8. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  Tray / Menu │  │  IPC Handlers   │  │  Auto-launch  │  │
│  └──────────────┘  └────────┬────────┘  └───────────────┘  │
│                             │                                │
└─────────────────────────────┼──────────────────────────────┘
                              │ contextBridge
┌─────────────────────────────┼──────────────────────────────┐
│                    Renderer (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Chat   │  │Dashboard │  │  Memory  │  │  Skills   │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Terminal │  │  Files   │  │   Jobs   │  │ Settings  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Hermes API Client (SSE + REST)             │   │
│  └─────────────────────┬───────────────────────────────┘   │
└────────────────────────┼────────────────────────────────────┘
                         │ HTTP / SSE over LAN
              ┌──────────┴──────────┐
              │   Hermes Gateway    │
              │  (remote machine)   │
              │   :8642 default     │
              └─────────────────────┘
```

---

## 9. Success Metrics

- App launches and connects to remote Hermes in < 3 seconds
- Chat SSE streaming visible within 500ms of send
- Zero crashes during normal usage session
- All P0 features complete by Phase 1
- All P1 features complete by Phase 2
- All P2 features complete by Phase 3

---

## 10. Out of Scope (v1)

- macOS / Linux builds (architecture supports it, but packaging not prioritized)
- Cloud/hosted Hermes (LAN focus for v1)
- Voice input/output
- Plugin system for Mission Control itself
