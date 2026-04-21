import { create } from 'zustand'

export interface ConnectionProfile {
  id: string
  name: string
  host: string
  port: number
  dashboardPort?: number   // Hermes v0.9 dashboard SPA port (default 9119)
  useHttps: boolean
  hasApiKey: boolean
  hasPassword: boolean
  isDefault: boolean
  createdAt: string
  lastConnected?: string
}

export interface GatewayFeatures {
  sessions: boolean
  memory: boolean
  skills: boolean
  jobs: boolean
  files: boolean
  terminal: boolean
  models: boolean
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

interface ConnectionState {
  profile: ConnectionProfile | null
  profiles: ConnectionProfile[]
  status: ConnectionStatus
  latency: number
  gatewayVersion: string | null
  features: GatewayFeatures
  lastError: string | null
  reconnectAttempts: number

  // Actions
  setProfile: (profile: ConnectionProfile | null) => void
  setStatus: (status: ConnectionStatus) => void
  setLatency: (latency: number) => void
  setGatewayInfo: (version: string, features: Partial<GatewayFeatures>) => void
  setError: (error: string | null) => void
  setProfiles: (profiles: ConnectionProfile[]) => void
  initFromStorage: () => Promise<void>
  getBaseUrl: () => string | null
  getAuthHeaders: () => Promise<Record<string, string>>
}

const defaultFeatures: GatewayFeatures = {
  sessions: false,
  memory: false,
  skills: false,
  jobs: false,
  files: false,
  terminal: false,
  models: false
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  profile: null,
  profiles: [],
  status: 'disconnected',
  latency: 0,
  gatewayVersion: null,
  features: defaultFeatures,
  lastError: null,
  reconnectAttempts: 0,

  setProfile: (profile) => set({ profile }),
  setStatus: (status) => set({ status }),
  setLatency: (latency) => set({ latency }),
  setGatewayInfo: (version, features) =>
    set({
      gatewayVersion: version,
      features: { ...defaultFeatures, ...features }
    }),
  setError: (error) => set({ lastError: error }),
  setProfiles: (profiles) => set({ profiles }),

  initFromStorage: async () => {
    if (!window.electronAPI) return
    try {
      const profiles = await window.electronAPI.connection.getProfiles()
      const lastId = await window.electronAPI.connection.getLastProfile()
      set({ profiles })

      let active = profiles.find((p) => p.isDefault)
      if (lastId) {
        active = profiles.find((p) => p.id === lastId) ?? active
      }
      if (active) {
        set({ profile: active })
      }
    } catch (e) {
      console.error('Failed to load connection profiles:', e)
    }
  },

  getBaseUrl: () => {
    const { profile } = get()
    if (!profile) return null
    const scheme = profile.useHttps ? 'https' : 'http'
    return `${scheme}://${profile.host}:${profile.port}`
  },

  getAuthHeaders: async () => {
    const { profile } = get()
    if (!profile) return {}
    if (!window.electronAPI) return {}

    const headers: Record<string, string> = {}

    if (profile.hasApiKey) {
      const key = await window.electronAPI.storage.get(
        'hermes-mission-control',
        `${profile.id}:apikey`
      )
      if (key) headers['Authorization'] = `Bearer ${key}`
    }

    if (profile.hasPassword) {
      const password = await window.electronAPI.storage.get(
        'hermes-mission-control',
        `${profile.id}:password`
      )
      if (password) {
        headers['X-Hermes-Password'] = password
      }
    }

    return headers
  }
}))
