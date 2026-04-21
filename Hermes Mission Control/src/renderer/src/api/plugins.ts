import { hermesGet } from './client'

// ─── Plugin manifest types ────────────────────────────────────────────────────
// Hermes serves GET /api/plugins → PluginManifest[]

export interface PluginPageConfig {
  route: string        // URL slug, e.g. "weather-dashboard"
  label: string        // Sidebar label
  icon?: string        // Lucide icon name (falls back to Puzzle)
  renderMode: 'iframe' | 'data'
  // iframe mode: plugin serves its own HTML at endpoints.base/ui
  // data mode: plugin returns structured JSON Mission Control renders natively
}

export interface PluginCommand {
  id: string
  label: string
  description?: string
  endpoint: string     // relative to endpoints.base — POST to trigger
}

export interface PluginWidgetConfig {
  title: string
  endpoint: string     // relative to endpoints.base — GET for widget data
  refreshInterval?: number  // ms, defaults to 60_000
}

export interface PluginManifest {
  id: string
  name: string
  description: string
  version: string
  author?: string
  tags?: string[]

  // API base path on the gateway — all relative paths resolve against this
  endpoints: {
    base: string       // e.g. "/api/plugins/weather"
  }

  // Optional surfaces
  page?: PluginPageConfig
  commands?: PluginCommand[]
  widget?: PluginWidgetConfig
}

export interface PluginsResponse {
  plugins?: PluginManifest[]
  data?: PluginManifest[]
}

export async function getPlugins(): Promise<PluginManifest[]> {
  try {
    const data = await hermesGet<PluginsResponse | PluginManifest[]>('/api/plugins')
    if (Array.isArray(data)) return data
    return data.plugins ?? data.data ?? []
  } catch {
    return []
  }
}

export async function triggerPluginCommand(
  base: string,
  endpoint: string
): Promise<unknown> {
  const { hermesPost } = await import('./client')
  return hermesPost(`${base}${endpoint}`)
}
