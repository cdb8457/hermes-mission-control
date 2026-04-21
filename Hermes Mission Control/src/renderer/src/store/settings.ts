import { create } from 'zustand'

export type ThemeName =
  | 'mission-dark'
  | 'mission-light'
  | 'slate-dark'
  | 'slate-light'
  | 'mono-dark'
  | 'mono-light'
  | 'neon-dark'
  | 'classic-dark'

export interface NotificationSettings {
  jobComplete: boolean
  agentMessage: boolean
  connectionChange: boolean
  sound: boolean
}

interface SettingsState {
  theme: ThemeName
  fontSize: number
  minimizeToTray: boolean
  autoLaunch: boolean
  globalHotkey: string
  notifications: NotificationSettings
  sidebarCollapsed: boolean

  // Actions
  setTheme: (theme: ThemeName) => void
  setFontSize: (size: number) => void
  setMinimizeToTray: (value: boolean) => void
  setAutoLaunch: (value: boolean) => void
  setGlobalHotkey: (key: string) => void
  setNotifications: (settings: Partial<NotificationSettings>) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  initSettings: () => void
  save: () => void
}

const STORAGE_KEY = 'hermes-mc-settings'

const defaults: Omit<SettingsState, keyof { setTheme: unknown; setFontSize: unknown; setMinimizeToTray: unknown; setAutoLaunch: unknown; setGlobalHotkey: unknown; setNotifications: unknown; setSidebarCollapsed: unknown; initSettings: unknown; save: unknown }> = {
  theme: 'mission-dark',
  fontSize: 14,
  minimizeToTray: false,
  autoLaunch: false,
  globalHotkey: 'CommandOrControl+Shift+H',
  notifications: {
    jobComplete: true,
    agentMessage: false,
    connectionChange: true,
    sound: false
  },
  sidebarCollapsed: false
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,

  setTheme: (theme) => {
    set({ theme })
    get().save()
  },

  setFontSize: (fontSize) => {
    set({ fontSize })
    get().save()
  },

  setMinimizeToTray: (minimizeToTray) => {
    set({ minimizeToTray })
    window.electronAPI?.window.setMinimizeToTray(minimizeToTray)
    get().save()
  },

  setAutoLaunch: (autoLaunch) => {
    set({ autoLaunch })
    window.electronAPI?.autoLaunch.set(autoLaunch)
    get().save()
  },

  setGlobalHotkey: (globalHotkey) => {
    set({ globalHotkey })
    window.electronAPI?.hotkey.update(globalHotkey)
    get().save()
  },

  setNotifications: (settings) => {
    set((state) => ({
      notifications: { ...state.notifications, ...settings }
    }))
    get().save()
  },

  setSidebarCollapsed: (sidebarCollapsed) => {
    set({ sidebarCollapsed })
    get().save()
  },

  initSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        set({ ...defaults, ...parsed })
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  },

  save: () => {
    const state = get()
    const toSave = {
      theme: state.theme,
      fontSize: state.fontSize,
      minimizeToTray: state.minimizeToTray,
      autoLaunch: state.autoLaunch,
      globalHotkey: state.globalHotkey,
      notifications: state.notifications,
      sidebarCollapsed: state.sidebarCollapsed
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }
}))
