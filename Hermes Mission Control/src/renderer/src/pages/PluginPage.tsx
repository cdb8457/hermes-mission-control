import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, RefreshCw, ExternalLink, Puzzle } from 'lucide-react'
import { usePluginStore } from '../store/plugins'
import { useConnectionStore } from '../store/connection'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition } from '../components/shared/PageTransition'
import { cn } from '../lib/utils'

export default function PluginPage(): JSX.Element {
  const { pluginId } = useParams<{ pluginId: string }>()
  const navigate = useNavigate()
  const { getPlugin } = usePluginStore()
  const { profile } = useConnectionStore()
  const plugin = pluginId ? getPlugin(pluginId) : undefined

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const baseUrl = profile
    ? `${profile.useHttps ? 'https' : 'http'}://${profile.host}:${profile.port}`
    : null

  const iframeUrl = plugin?.page && baseUrl
    ? `${baseUrl}${plugin.endpoints.base}${plugin.page.renderMode === 'iframe' ? '/ui' : ''}`
    : null

  const handleLoad = useCallback(() => {
    setLoading(false)
    setError(false)
    // Inject theme variables via postMessage
    const iframe = iframeRef.current
    if (!iframe?.contentWindow || !baseUrl) return
    const root = document.documentElement
    const style = getComputedStyle(root)
    const themeVars: Record<string, string> = {}
    const varNames = ['--primary', '--background', '--foreground', '--card', '--border', '--muted', '--muted-foreground']
    for (const v of varNames) themeVars[v] = style.getPropertyValue(v).trim()
    iframe.contentWindow.postMessage({ type: 'HERMES_MISSION_CONTROL_THEME', theme: themeVars }, baseUrl)
  }, [baseUrl])

  const handleRefresh = (): void => {
    setLoading(true)
    setError(false)
    if (iframeRef.current && iframeUrl) iframeRef.current.src = iframeUrl
  }

  // Plugin not found
  if (!plugin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Puzzle size={36} className="text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium mb-1">Plugin not found</h2>
        <p className="text-sm text-muted-foreground mb-4">This plugin is no longer advertised by your Hermes gateway.</p>
        <button onClick={() => navigate('/plugins')} className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors">
          Manage Plugins
        </button>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border shrink-0">
          <Puzzle size={14} className="text-primary/70" />
          <span className="text-sm font-semibold">{plugin.name}</span>
          {plugin.version && (
            <span className="text-[10px] text-muted-foreground/50 font-mono">v{plugin.version}</span>
          )}
          {plugin.description && (
            <span className="text-xs text-muted-foreground truncate max-w-xs">{plugin.description}</span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={handleRefresh} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors" title="Refresh">
              <RefreshCw size={12} />
            </button>
            {iframeUrl && (
              <button
                onClick={() => window.electronAPI?.shell.openExternal(iframeUrl)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                title="Open in browser"
              >
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative min-h-0">
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
                <Loader2 size={18} className="text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">Loading {plugin.name}…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
              <AlertCircle size={24} className="text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load plugin</p>
              <button onClick={handleRefresh} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs hover:bg-secondary/80 transition-colors">
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {iframeUrl ? (
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-full border-0"
              onLoad={handleLoad}
              onError={() => { setLoading(false); setError(true) }}
              title={plugin.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <AlertCircle size={24} className="text-yellow-400 mb-2" />
              <p className="text-sm text-muted-foreground">This plugin does not expose a page UI.</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
