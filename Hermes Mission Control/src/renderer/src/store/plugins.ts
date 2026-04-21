import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getPlugins, type PluginManifest } from '../api/plugins'

interface PluginState {
  // Manifests discovered from the gateway on last connect
  discovered: PluginManifest[]
  // Which plugins the user has explicitly disabled (stored across sessions)
  disabledIds: string[]
  // Whether a discovery is in flight
  discovering: boolean

  // Actions
  discoverPlugins: () => Promise<void>
  setEnabled: (id: string, enabled: boolean) => void
  clearDiscovered: () => void

  // Derived
  enabledPlugins: () => PluginManifest[]
  getPlugin: (id: string) => PluginManifest | undefined
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set, get) => ({
      discovered: [],
      disabledIds: [],
      discovering: false,

      discoverPlugins: async () => {
        set({ discovering: true })
        try {
          const plugins = await getPlugins()
          set({ discovered: plugins, discovering: false })
        } catch {
          set({ discovering: false })
        }
      },

      setEnabled: (id, enabled) => {
        set((state) => ({
          disabledIds: enabled
            ? state.disabledIds.filter((d) => d !== id)
            : [...state.disabledIds.filter((d) => d !== id), id]
        }))
      },

      clearDiscovered: () => set({ discovered: [], discovering: false }),

      enabledPlugins: () => {
        const { discovered, disabledIds } = get()
        return discovered.filter((p) => !disabledIds.includes(p.id))
      },

      getPlugin: (id) => get().discovered.find((p) => p.id === id)
    }),
    {
      name: 'hermes-plugins',
      // Only persist user preferences (disabled list), not discovered manifests
      partialize: (state) => ({ disabledIds: state.disabledIds })
    }
  )
)
