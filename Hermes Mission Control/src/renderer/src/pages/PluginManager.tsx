import { useState } from 'react'
import {
  Puzzle, RefreshCw, Loader2, Zap, MessageSquare,
  LayoutGrid, ChevronRight, Tag, Globe, AlertCircle, CheckCircle2
} from 'lucide-react'
import { usePluginStore } from '../store/plugins'
import { useConnectionStore } from '../store/connection'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib/utils'
import { PageTransition, FadeIn, StaggerList, StaggerItem } from '../components/shared/PageTransition'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function surfaceBadge(label: string, color: string): JSX.Element {
  return (
    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wide', color)}>
      {label}
    </span>
  )
}

// ─── Plugin card ──────────────────────────────────────────────────────────────

function PluginCard({ plugin, enabled, onToggle, onOpen }: {
  plugin: import('../api/plugins').PluginManifest
  enabled: boolean
  onToggle: (enabled: boolean) => void
  onOpen: () => void
}): JSX.Element {
  return (
    <StaggerItem>
      <div className={cn(
        'border rounded-xl bg-card transition-all duration-200 overflow-hidden',
        enabled ? 'border-border hover:border-primary/30' : 'border-border/50 opacity-60'
      )}>
        <div className="flex items-start gap-4 p-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Puzzle size={16} className="text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{plugin.name}</span>
                {plugin.version && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">v{plugin.version}</span>
                )}
                {plugin.author && (
                  <span className="text-[10px] text-muted-foreground/60">by {plugin.author}</span>
                )}
              </div>

              {/* Enable toggle */}
              <button
                onClick={() => onToggle(!enabled)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  enabled ? 'bg-primary' : 'bg-secondary'
                )}
                title={enabled ? 'Disable plugin' : 'Enable plugin'}
              >
                <span className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-4' : 'translate-x-0'
                )} />
              </button>
            </div>

            {/* Description */}
            {plugin.description && (
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{plugin.description}</p>
            )}

            {/* Surface badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {plugin.page && surfaceBadge('Page', 'text-blue-400 border-blue-500/20 bg-blue-500/10')}
              {plugin.commands && plugin.commands.length > 0 && surfaceBadge(`${plugin.commands.length} cmd${plugin.commands.length !== 1 ? 's' : ''}`, 'text-violet-400 border-violet-500/20 bg-violet-500/10')}
              {plugin.widget && surfaceBadge('Widget', 'text-green-400 border-green-500/20 bg-green-500/10')}
              {plugin.tags?.map(tag => (
                <span key={tag} className="flex items-center gap-0.5 text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                  <Tag size={7} />
                  {tag}
                </span>
              ))}

              {/* API base */}
              <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono truncate max-w-[180px]">
                {plugin.endpoints.base}
              </span>
            </div>
          </div>
        </div>

        {/* Open button for plugins with pages */}
        {enabled && plugin.page && (
          <div className="px-4 pb-3">
            <button
              onClick={onOpen}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              <span>Open {plugin.page.label}</span>
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </StaggerItem>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PluginManagerPage(): JSX.Element {
  const navigate = useNavigate()
  const { discovered, discovering, disabledIds, discoverPlugins, setEnabled } = usePluginStore()
  const { status } = useConnectionStore()
  const [activeTab, setActiveTab] = useState<'installed' | 'about'>('installed')

  const isConnected = status === 'connected'

  const handleRefresh = (): void => {
    if (isConnected) discoverPlugins()
  }

  return (
    <PageTransition>
      <div className="h-full flex flex-col">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
            <Puzzle size={18} className="text-primary" />
            <h1 className="text-base font-medium flex-1">Plugins</h1>
            <span className="text-xs text-muted-foreground">{discovered.length} discovered</span>
            <button
              onClick={handleRefresh}
              disabled={!isConnected || discovering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:bg-secondary/50 transition-all disabled:opacity-40"
            >
              <RefreshCw size={11} className={cn(discovering && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </FadeIn>

        {/* Tabs */}
        <FadeIn delay={0.04}>
          <div className="flex gap-1 px-6 py-2 border-b border-border shrink-0">
            {(['installed', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                  activeTab === tab
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                {tab === 'installed' ? `Installed (${discovered.length})` : 'How it works'}
              </button>
            ))}
          </div>
        </FadeIn>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'installed' && (
            <>
              {discovering ? (
                <div className="flex items-center justify-center py-12 gap-3">
                  <Loader2 size={18} className="text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Discovering plugins from gateway…</p>
                </div>
              ) : !isConnected ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle size={28} className="text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Connect to Hermes to discover plugins.</p>
                </div>
              ) : discovered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                    <Puzzle size={22} className="text-primary" />
                  </div>
                  <h2 className="text-base font-medium mb-1">No plugins found</h2>
                  <p className="text-sm text-muted-foreground max-w-xs mb-4">
                    Your Hermes gateway isn't advertising any plugins yet. Plugins are installed on the Hermes VM and auto-discovered here on connect.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border text-sm hover:bg-secondary/80 transition-colors"
                  >
                    <RefreshCw size={13} />
                    Check again
                  </button>
                </div>
              ) : (
                <StaggerList className="space-y-3">
                  {discovered.map(plugin => (
                    <PluginCard
                      key={plugin.id}
                      plugin={plugin}
                      enabled={!disabledIds.includes(plugin.id)}
                      onToggle={enabled => setEnabled(plugin.id, enabled)}
                      onOpen={() => navigate(`/plugin/${plugin.id}`)}
                    />
                  ))}
                </StaggerList>
              )}
            </>
          )}

          {activeTab === 'about' && (
            <div className="max-w-lg space-y-5 py-2">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Globe size={14} className="text-primary" />
                  Gateway-advertised plugins
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Plugins are installed on your Hermes VM and automatically discovered by Mission Control when you connect.
                  There's nothing to install here — if it's running on Hermes, it appears in this list.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Puzzle, title: 'Install on Hermes', body: 'Drop a plugin into your Hermes gateway on the VM and restart it. Mission Control discovers it automatically on next connect — or hit Refresh.' },
                  { icon: LayoutGrid, title: 'Page plugins', body: 'Plugins with a page surface get a slot in the sidebar. They render their own UI inside Mission Control via an embedded view, fully themed.' },
                  { icon: Zap, title: 'Command plugins', body: 'Plugins can register commands that appear in the Ctrl+K command palette, letting you trigger gateway-side actions from anywhere in the app.' },
                  { icon: CheckCircle2, title: 'Enable / disable', body: 'Your enabled/disabled preferences are saved locally. Disabling a plugin hides it from the sidebar and command palette but doesn\'t remove it from Hermes.' }
                ].map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-3 p-3 rounded-xl border border-border bg-secondary/10">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={13} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-0.5">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
