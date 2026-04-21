import { useEffect, useRef, useState, useCallback } from 'react'
import { BookOpen, RefreshCw, Loader2, AlertCircle, ExternalLink, ShieldCheck, Eye } from 'lucide-react'
import { useConnectionStore } from '../store/connection'
import { PageTransition, FadeIn } from '../components/shared/PageTransition'
import { cn } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashTab {
  id: string
  label: string
  path: string
}

const DASH_TABS: DashTab[] = [
  { id: 'home',     label: 'Home',     path: '/' },
  { id: 'sessions', label: 'Sessions', path: '/sessions' },
  { id: 'skills',   label: 'Skills',   path: '/skills' }
]

const TOKEN_REFRESH_MS = 10 * 60 * 1000 // 10 minutes

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchSessionToken(baseUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/api/auth/session-token`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    if (\!res.ok) return null
    const data = await res.json() as { token?: string }
    return data.token ?? null
  } catch {
    return null
  }
}

async function probeDashboard(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal })
    clearTimeout(timeout)
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HermesDashboardPage(): JSX.Element {
  const { profile } = useConnectionStore()
  const [activeTab, setActiveTab] = useState<string>('home')
  const [token, setToken] = useState<string | null>(null)
  const [probing, setProbing] = useState(true)
  const [reachable, setReachable] = useState(false)
  const [iframeLoading, setIframeLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tokenIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dashPort = profile?.dashboardPort ?? 9119
  const apiBase = profile
    ? `${profile.useHttps ? 'https' : 'http'}://${profile.host}:${profile.port}`
    : null
  const dashBase = profile
    ? `${profile.useHttps ? 'https' : 'http'}://${profile.host}:${dashPort}`
    : null

  const currentTab = DASH_TABS.find(t => t.id === activeTab) ?? DASH_TABS[0]
  const iframeUrl = dashBase ? `${dashBase}${currentTab.path}` : null

  // Probe + get token on mount / when profile changes
  const initialize = useCallback(async () => {
    if (\!dashBase || \!apiBase) return
    setProbing(true)
    setReachable(false)

    const ok = await probeDashboard(dashBase)
    if (\!ok) {
      setProbing(false)
      return
    }

    const tok = await fetchSessionToken(apiBase)
    setToken(tok)
    setReachable(true)
    setProbing(false)
  }, [dashBase, apiBase])

  useEffect(() => {
    initialize()
  }, [initialize])

  // Refresh token on interval
  useEffect(() => {
    if (\!reachable || \!apiBase) return
    tokenIntervalRef.current = setInterval(async () => {
      const tok = await fetchSessionToken(apiBase)
      setToken(tok)
    }, TOKEN_REFRESH_MS)
    return () => {
      if (tokenIntervalRef.current) clearInterval(tokenIntervalRef.current)
    }
  }, [reachable, apiBase])

  // Inject theme + token after iframe loads
  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false)
    const iframe = iframeRef.current
    if (\!iframe?.contentWindow || \!dashBase) return
    const root = document.documentElement
    const style = getComputedStyle(root)
    const themeVars: Record<string, string> = {}
    const varNames = ['--primary', '--background', '--foreground', '--card', '--border', '--muted', '--muted-foreground']
    for (const v of varNames) themeVars[v] = style.getPropertyValue(v).trim()
    iframe.contentWindow.postMessage(
      { type: 'HERMES_MISSION_CONTROL_INIT', token, theme: themeVars },
      dashBase
    )
  }, [dashBase, token])

  // Reset loading state when tab changes
  useEffect(() => {
    setIframeLoading(true)
  }, [activeTab])

  // No profile
  if (\!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <AlertCircle size={28} className="text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Connect to Hermes first.</p>
      </div>
    )
  }

  // Probing
  if (probing) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <Loader2 size={20} className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Probing Hermes dashboard on port {dashPort}…</p>
      </div>
    )
  }

  // Unreachable
  if (\!reachable) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <AlertCircle size={28} className="text-yellow-400 mb-3" />
        <h2 className="text-base font-medium mb-1">Dashboard not reachable</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          Couldn&apos;t reach <span className="font-mono text-xs">{dashBase}</span>.
          Make sure the Hermes v0.9 dashboard is running on your VM.
        </p>
        <button
          onClick={initialize}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
            <BookOpen size={16} className="text-primary" />
            <h1 className="text-base font-medium flex-1">Hermes Dashboard</h1>

            {/* Auth badge */}
            <span className={cn(
              'flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium',
              token
                ? 'text-green-400 border-green-500/20 bg-green-500/10'
                : 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10'
            )}>
              {token ? <ShieldCheck size={9} /> : <Eye size={9} />}
              {token ? 'Authenticated' : 'Read-only'}
            </span>

            {/* llm-wiki hint */}
            <span className="text-[9px] text-muted-foreground/40 border border-border/30 rounded px-1.5 py-0.5">
              llm-wiki via Sessions
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={initialize}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                title="Re-probe dashboard"
              >
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
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.04}>
          <div className="flex gap-1 px-6 py-2 border-b border-border shrink-0">
            {DASH_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Iframe */}
        <div className="flex-1 relative min-h-0">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-background">
              <Loader2 size={18} className="text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading {currentTab.label}…</p>
            </div>
          )}

          {iframeUrl && (
            <iframe
              key={activeTab}
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={() => setIframeLoading(false)}
              title={`Hermes ${currentTab.label}`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>
      </div>
    </PageTransition>
  )
}
