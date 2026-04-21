import { ipcMain } from 'electron'
import Store from 'electron-store'

export interface ConnectionProfile {
  id: string
  name: string
  host: string
  port: number
  useHttps: boolean
  hasApiKey: boolean
  hasPassword: boolean
  isDefault: boolean
  createdAt: string
  lastConnected?: string
}

export function setupConnectionIpc(store: Store): void {
  ipcMain.handle('connection:profiles:get', () => {
    return store.get('connectionProfiles', []) as ConnectionProfile[]
  })

  ipcMain.handle('connection:profiles:save', (_, profile: ConnectionProfile) => {
    const profiles = store.get('connectionProfiles', []) as ConnectionProfile[]
    const existing = profiles.findIndex((p) => p.id === profile.id)

    // If setting as default, clear others
    if (profile.isDefault) {
      profiles.forEach((p) => (p.isDefault = false))
    }

    if (existing >= 0) {
      profiles[existing] = profile
    } else {
      profiles.push(profile)
    }

    store.set('connectionProfiles', profiles)
    return profile
  })

  ipcMain.handle('connection:profiles:delete', (_, id: string) => {
    const profiles = store.get('connectionProfiles', []) as ConnectionProfile[]
    const filtered = profiles.filter((p) => p.id !== id)
    store.set('connectionProfiles', filtered)
    return true
  })

  ipcMain.handle('connection:lastProfile', () => {
    return store.get('lastProfileId', null)
  })

  ipcMain.on('connection:setLastProfile', (_, id: string) => {
    store.set('lastProfileId', id)
  })
}
