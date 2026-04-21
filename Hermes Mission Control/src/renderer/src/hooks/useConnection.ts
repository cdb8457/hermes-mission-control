import { useEffect, useRef, useCallback } from 'react'
import { useConnectionStore } from '../store/connection'
import { usePluginStore } from '../store/plugins'
import { getHealth } from '../api/health'
import { discoverFeatures, pingHermes } from '../api/client'

const PING_INTERVAL = 30_000 // 30 seconds
const RECONNECT_BASE_DELAY = 2_000
const RECONNECT_MAX_DELAY = 30_000

export function useConnectionMonitor(): void {
  const store = useConnectionStore()
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  const connect = useCallback(async () => {
    const { profile, getAuthHeaders, getBaseUrl } = useConnectionStore.getState()
    if (!profile) return

    const baseUrl = getBaseUrl()
    if (!baseUrl) return

    useConnectionStore.getState().setStatus('connecting')

    try {
      const headers = await getAuthHeaders()

      // Health check
      const health = await getHealth(baseUrl, headers)
      const latency = await pingHermes(baseUrl, headers)

      // Discover features
      const features = await discoverFeatures(baseUrl, headers)

      useConnectionStore.getState().setStatus('connected')
      useConnectionStore.getState().setLatency(latency)
      useConnectionStore.getState().setGatewayInfo(health.version ?? 'unknown', {
        sessions: features.sessions,
        memory: features.memory,
        skills: features.skills,
        jobs: features.jobs,
        files: features.files,
        models: features.models,
        terminal: false // WebSocket check done separately
      })
      useConnectionStore.getState().setError(null)
      attemptRef.current = 0

      // Discover gateway-advertised plugins
      usePluginStore.getState().discoverPlugins().catch(() => {})

      // Save this profile as last used
      if (window.electronAPI) {
        window.electronAPI.connection.setLastProfile(profile.id)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Connection failed'
      useConnectionStore.getState().setStatus('error')
      useConnectionStore.getState().setError(msg)

      // Schedule reconnect
      attemptRef.current++
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, attemptRef.current - 1),
        RECONNECT_MAX_DELAY
      )
      reconnectTimer.current = setTimeout(() => {
        useConnectionStore.getState().setStatus('reconnecting')
        connect()
      }, delay)
    }
  }, [])

  // Start ping loop when connected
  const startPing = useCallback(() => {
    if (pingTimer.current) clearInterval(pingTimer.current)
    pingTimer.current = setInterval(async () => {
      const { getBaseUrl, getAuthHeaders, status } = useConnectionStore.getState()
      if (status !== 'connected') return

      try {
        const baseUrl = getBaseUrl()
        const headers = await getAuthHeaders()
        if (!baseUrl) return

        const latency = await pingHermes(baseUrl, headers)
        useConnectionStore.getState().setLatency(latency)
      } catch {
        // Connection lost — clear plugin discovery
        useConnectionStore.getState().setStatus('reconnecting')
        useConnectionStore.getState().setError('Connection lost')
        usePluginStore.getState().clearDiscovered()
        connect()
      }
    }, PING_INTERVAL)
  }, [connect])

  // Connect whenever profile changes
  useEffect(() => {
    const { profile } = store
    if (!profile) return

    connect()
    startPing()

    return () => {
      if (pingTimer.current) clearInterval(pingTimer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    }
  }, [store.profile?.id])
}
