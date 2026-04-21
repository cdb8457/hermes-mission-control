import { app, BrowserWindow, shell, ipcMain, globalShortcut, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { setupTray } from './tray'
import { setupIpcHandlers } from './ipc'
import { setupJumpList } from './jumplist'
import Store from 'electron-store'

const store = new Store()

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// ─── Protocol Handler (hermes://) ────────────────────────────────────────────
// Must be registered before app is ready on Windows
if (process.platform === 'win32') {
  app.setAsDefaultProtocolClient('hermes')
}

// Single instance lock — ensures only one Mission Control window runs
const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Restore window when someone tries to open a second instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
    // Handle deep link from second instance (Windows passes URL as arg)
    const url = commandLine.find(arg => arg.startsWith('hermes://'))
    if (url) handleDeepLink(url)
  })
}

function handleDeepLink(url: string): void {
  if (!mainWindow) return
  mainWindow.show()
  mainWindow.focus()
  // Parse hermes:// URLs and navigate renderer
  // hermes://chat → /chat
  // hermes://dashboard → /dashboard
  // hermes://session/<id> → /chat/<id>
  try {
    const parsed = new URL(url)
    const route = parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '')
    mainWindow.webContents.send('nav:deepLink', route)
  } catch {
    mainWindow.webContents.send('nav:deepLink', 'dashboard')
  }
}

// ─── Auto-Launch ─────────────────────────────────────────────────────────────
function applyAutoLaunch(enabled: boolean): void {
  if (process.platform !== 'win32') return
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    name: 'Hermes Mission Control',
    path: process.execPath,
    args: ['--hidden']
  })
}

function createWindow(): void {
  const windowBounds = store.get('windowBounds', {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined
  }) as { width: number; height: number; x?: number; y?: number }

  // Check if launched hidden (from auto-launch or tray)
  const launchHidden = process.argv.includes('--hidden')

  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false, // Custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    icon: join(__dirname, '../../resources/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Save window state on resize/move
  const saveWindowBounds = (): void => {
    if (mainWindow && !mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      store.set('windowBounds', mainWindow.getBounds())
    }
  }
  mainWindow.on('resize', saveWindowBounds)
  mainWindow.on('move', saveWindowBounds)

  // Minimize to tray behavior
  mainWindow.on('close', (event) => {
    const minimizeToTray = store.get('minimizeToTray', false) as boolean
    if (!isQuitting && minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!launchHidden) {
      mainWindow!.show()
    }
    // Restore maximized state
    if (!launchHidden && store.get('windowMaximized', false)) {
      mainWindow!.maximize()
    }
  })

  mainWindow.on('maximize', () => store.set('windowMaximized', true))
  mainWindow.on('unmaximize', () => store.set('windowMaximized', false))

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerGlobalShortcut(): void {
  const hotkey = (store.get('globalHotkey', 'CommandOrControl+Shift+H') as string)
  try {
    globalShortcut.register(hotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible() && mainWindow.isFocused()) {
          mainWindow.hide()
        } else {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    })
  } catch (e) {
    console.error('Failed to register global shortcut:', e)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.hermes.missioncontrol')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupTray(mainWindow!)
  setupIpcHandlers(store)
  setupJumpList()
  registerGlobalShortcut()

  // Apply auto-launch from stored setting
  const autoLaunch = store.get('autoLaunch', false) as boolean
  applyAutoLaunch(autoLaunch)

  // ─── IPC Handlers ───────────────────────────────────────────────────────────

  // Update global hotkey
  ipcMain.on('hotkey:update', (_, newKey: string) => {
    globalShortcut.unregisterAll()
    store.set('globalHotkey', newKey)
    registerGlobalShortcut()
  })

  // Quit app
  ipcMain.on('app:quit', () => {
    isQuitting = true
    app.quit()
  })

  // Get app version
  ipcMain.handle('app:version', () => app.getVersion())

  // Open external URL
  ipcMain.on('shell:openExternal', (_, url: string) => {
    shell.openExternal(url)
  })

  // Native theme
  ipcMain.handle('theme:getNative', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')

  // Auto-launch toggle
  ipcMain.on('autoLaunch:set', (_, enabled: boolean) => {
    store.set('autoLaunch', enabled)
    applyAutoLaunch(enabled)
  })

  // Get auto-launch status
  ipcMain.handle('autoLaunch:get', () => {
    if (process.platform !== 'win32') return false
    return app.getLoginItemSettings().openAtLogin
  })

  // Update jump list when recent sessions change
  ipcMain.on('jumplist:update', (_, sessions: Array<{ id: string; title: string }>) => {
    setupJumpList(sessions)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  // Handle deep links on macOS (open-url event)
  app.on('open-url', (_event, url) => {
    handleDeepLink(url)
  })

  // ─── Auto-Updater Setup ────────────────────────────────────────────────────
  if (!is.dev) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('updater:status', { type: 'checking' })
    })

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('updater:status', {
        type: 'available',
        version: info.version,
        releaseNotes: info.releaseNotes
      })
    })

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('updater:status', { type: 'not-available' })
    })

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('updater:status', {
        type: 'downloading',
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('updater:status', {
        type: 'downloaded',
        version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('updater:status', {
        type: 'error',
        message: err.message
      })
    })

    // Check for updates silently 10s after startup
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 10_000)
  }

  // IPC: Manual check for updates
  ipcMain.handle('updater:check', async () => {
    if (is.dev) return { type: 'dev' }
    try {
      const result = await autoUpdater.checkForUpdates()
      return result ? { type: 'checking' } : { type: 'not-available' }
    } catch (e) {
      return { type: 'error', message: String(e) }
    }
  })

  // IPC: Start download
  ipcMain.on('updater:download', () => {
    if (!is.dev) autoUpdater.downloadUpdate().catch(() => {})
  })

  // IPC: Install now (quits app)
  ipcMain.on('updater:install', () => {
    isQuitting = true
    autoUpdater.quitAndInstall(false, true)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
