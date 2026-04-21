import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface ElectronBridgeAPI {
  // Window controls
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>

  // Storage (Windows Credential Manager via keytar)
  storage: {
    get: (service: string, account: string) => Promise<string | null>
    set: (service: string, account: string, password: string) => Promise<boolean>
    delete: (service: string, account: string) => Promise<boolean>
  }

  // Connection profiles (electron-store)
  connection: {
    getProfiles: () => Promise<import('../main/ipc/connection').ConnectionProfile[]>
    saveProfile: (profile: import('../main/ipc/connection').ConnectionProfile) => Promise<import('../main/ipc/connection').ConnectionProfile>
    deleteProfile: (id: string) => Promise<boolean>
    getLastProfile: () => Promise<string | null>
    setLastProfile: (id: string) => void
  }

  // System tray & notifications
  notification: {
    show: (title: string, body: string) => void
  }
  tray: {
    badge: (count: number) => void
  }
  taskbar: {
    setProgress: (value: number, mode?: string) => void
  }

  // Global hotkey
  hotkey: {
    update: (key: string) => void
  }

  // Navigation events FROM main (tray click, deep link, etc.)
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void

  // App
  app: {
    quit: () => void
    getVersion: () => Promise<string>
    getPath: (name: string) => Promise<string>
  }

  // Shell
  shell: {
    openExternal: (url: string) => void
  }

  // Theme
  theme: {
    getNative: () => Promise<string>
  }

  // Minimize to tray setting
  window: {
    setMinimizeToTray: (value: boolean) => void
  }

  // Auto-launch (Windows startup)
  autoLaunch: {
    set: (enabled: boolean) => void
    get: () => Promise<boolean>
  }

  // Jump list (Windows taskbar)
  jumplist: {
    update: (sessions: Array<{ id: string; title: string }>) => void
  }

  // Network scanner (LAN Hermes discovery)
  scanner: {
    scan: (subnet: string, port: number) => Promise<Array<{ host: string; port: number; latency: number }>>
  }

  // Auto-updater
  updater: {
    check: () => Promise<{ type: string; version?: string; message?: string }>
    download: () => void
    install: () => void
  }
}

const api: ElectronBridgeAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  storage: {
    get: (service, account) => ipcRenderer.invoke('storage:get', service, account),
    set: (service, account, password) => ipcRenderer.invoke('storage:set', service, account, password),
    delete: (service, account) => ipcRenderer.invoke('storage:delete', service, account)
  },

  connection: {
    getProfiles: () => ipcRenderer.invoke('connection:profiles:get'),
    saveProfile: (profile) => ipcRenderer.invoke('connection:profiles:save', profile),
    deleteProfile: (id) => ipcRenderer.invoke('connection:profiles:delete', id),
    getLastProfile: () => ipcRenderer.invoke('connection:lastProfile'),
    setLastProfile: (id) => ipcRenderer.send('connection:setLastProfile', id)
  },

  notification: {
    show: (title, body) => ipcRenderer.send('notification:show', { title, body })
  },

  tray: {
    badge: (count) => ipcRenderer.send('tray:badge', count)
  },

  taskbar: {
    setProgress: (value, mode) => ipcRenderer.send('taskbar:progress', { value, mode })
  },

  hotkey: {
    update: (key) => ipcRenderer.send('hotkey:update', key)
  },

  on: (channel, callback) => {
    const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]): void => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },

  app: {
    quit: () => ipcRenderer.send('app:quit'),
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name)
  },

  shell: {
    openExternal: (url) => ipcRenderer.send('shell:openExternal', url)
  },

  theme: {
    getNative: () => ipcRenderer.invoke('theme:getNative')
  },

  window: {
    setMinimizeToTray: (value) => ipcRenderer.send('window:setMinimizeToTray', value)
  },

  autoLaunch: {
    set: (enabled) => ipcRenderer.send('autoLaunch:set', enabled),
    get: () => ipcRenderer.invoke('autoLaunch:get')
  },

  jumplist: {
    update: (sessions) => ipcRenderer.send('jumplist:update', sessions)
  },

  scanner: {
    scan: (subnet, port) => ipcRenderer.invoke('scanner:scan', subnet, port)
  },

  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.send('updater:download'),
    install: () => ipcRenderer.send('updater:install')
  }
}

// Use `contextBridge` to expose our API to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (for non-isolated context — dev only)
  window.electron = electronAPI
  // @ts-ignore
  window.electronAPI = api
}
