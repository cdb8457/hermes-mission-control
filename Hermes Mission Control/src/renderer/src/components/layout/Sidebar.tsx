import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, MessageSquare, Brain, Zap, Terminal,
  FolderOpen, Activity, Settings, ChevronLeft, ChevronRight,
  Loader2, Info, Calendar, Radio, BookOpen, Puzzle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useConnectionStore } from '../../store/connection'
import { useSettingsStore } from '../../store/settings'
import { useChatStore } from '../../store/chat'
import { usePluginStore } from '../../store/plugins'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  requiresFeature?: keyof import('../../store/connection').GatewayFeatures
}

const navItems: NavItem[] = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/chat',       icon: MessageSquare,   label: 'Chat' },
  { to: '/memory',     icon: Brain,           label: 'Memory',    requiresFeature: 'memory' },
  { to: '/skills',     icon: Zap,             label: 'Skills',    requiresFeature: 'skills' },
  { to: '/terminal',   icon: Terminal,         label: 'Terminal',  requiresFeature: 'terminal' },
  { to: '/files',      icon: FolderOpen,       label: 'Files',     requiresFeature: 'files' },
  { to: '/jobs',       icon: Activity,         label: 'Jobs',      requiresFeature: 'jobs' },
  { to: '/scheduler',  icon: Calendar,         label: 'Scheduler' },
  { to: '/conductor',  icon: Radio,            label: 'Conductor' },
  { to: '/hermes-ui',  icon: BookOpen,         label: 'Hermes UI' }
]

function StatusDot(): JSX.Element {
  const { status, latency } = useConnectionStore()

  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        <span className="text-[10px] text-green-400 tabular-nums">{latency}ms</span>
      </span>
    )
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <span className="flex items-center gap-1.5">
        <Loader2 size={8} className="text-yellow-400 animate-spin" />
        <span className="text-[10px] text-yellow-400">
          {status === 'reconnecting' ? 'Reconnecting' : 'Connecting'}
        </span>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      <span className="text-[10px] text-red-400">Offline</span>
    </span>
  )
}

export default function Sidebar(): JSX.Element {
  const location = useLocation()
  const { features, profile } = useConnectionStore()
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore()
  const { sessions } = useChatStore()
  const { enabledPlugins } = usePluginStore()
  const pluginPages = enabledPlugins().filter(p => p.page)

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        'flex flex-col h-full border-r transition-all duration-200',
        'bg-sidebar border-sidebar-border',
        sidebarCollapsed ? 'w-14' : 'w-52'
      )}>
        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-0.5 px-1.5 mt-1">
          {navItems.map((item) => {
            const isAvailable = !item.requiresFeature || features[item.requiresFeature]
            const isActive = location.pathname.startsWith(item.to)
            const Icon = item.icon

            const navEl = (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground',
                  !isAvailable && 'opacity-40 pointer-events-none',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.label === 'Chat' && sessions.length > 0 && (
                      <span className="ml-auto text-[10px] bg-sidebar-accent/20 text-sidebar-foreground rounded-full px-1.5 py-0.5 tabular-nums">
                        {sessions.length}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{navEl}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}{!isAvailable && ' (not available)'}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return navEl
          })}
        </nav>

        {/* Plugin nav items (gateway-advertised) */}
        {pluginPages.length > 0 && (
          <div className="px-1.5 pb-1">
            {!sidebarCollapsed && (
              <div className="px-2.5 py-1 text-[9px] uppercase tracking-wider text-muted-foreground/40 font-medium">
                Plugins
              </div>
            )}
            {pluginPages.map(plugin => {
              const to = `/plugin/${plugin.id}`
              const isActive = location.pathname === to
              const navEl = (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-white/5 hover:text-foreground',
                    sidebarCollapsed && 'justify-center px-2'
                  )}
                >
                  <Puzzle size={16} className="shrink-0 text-primary/70" />
                  {!sidebarCollapsed && (
                    <span className="truncate">{plugin.page!.label}</span>
                  )}
                </NavLink>
              )
              if (sidebarCollapsed) {
                return (
                  <Tooltip key={to}>
                    <TooltipTrigger asChild>{navEl}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">{plugin.page!.label}</TooltipContent>
                  </Tooltip>
                )
              }
              return navEl
            })}
          </div>
        )}

        {/* Bottom section */}
        <div className="pb-2 px-1.5 space-y-0.5">
          {/* Ctrl+K hint when expanded */}
          {!sidebarCollapsed && (
            <div className="px-2.5 py-1.5">
              <kbd className="text-[10px] bg-secondary/50 border border-border rounded px-1.5 py-0.5 text-muted-foreground/60">
                Ctrl+K
              </kbd>
              <span className="text-[10px] text-muted-foreground/40 ml-1.5">command palette</span>
            </div>
          )}

          {/* Plugin Manager */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/plugins"
                  className={cn(
                    'flex items-center justify-center px-2 py-2 rounded-md text-sm transition-all',
                    location.pathname === '/plugins'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-white/5'
                  )}
                >
                  <Puzzle size={16} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Plugins</TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/plugins"
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all',
                location.pathname === '/plugins'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-white/5'
              )}
            >
              <Puzzle size={16} className="shrink-0" />
              <span>Plugins</span>
            </NavLink>
          )}

          {/* Settings */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/settings"
                  className={cn(
                    'flex items-center justify-center px-2 py-2 rounded-md text-sm transition-all',
                    location.pathname === '/settings'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-white/5'
                  )}
                >
                  <Settings size={16} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Settings</TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/settings"
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all',
                location.pathname === '/settings'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-white/5'
              )}
            >
              <Settings size={16} className="shrink-0" />
              <span>Settings</span>
            </NavLink>
          )}

          {/* About */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/about"
                  className={cn(
                    'flex items-center justify-center px-2 py-2 rounded-md text-sm transition-all',
                    location.pathname === '/about'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-white/5'
                  )}
                >
                  <Info size={16} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">About</TooltipContent>
            </Tooltip>
          ) : (
            <NavLink
              to="/about"
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all',
                location.pathname === '/about'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-white/5'
              )}
            >
              <Info size={16} className="shrink-0" />
              <span>About</span>
            </NavLink>
          )}

          {/* Connection status */}
          {!sidebarCollapsed && (
            <div className="px-2.5 py-1.5 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                  {profile?.name ?? 'No connection'}
                </span>
                <StatusDot />
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'w-full flex items-center px-2.5 py-2 rounded-md text-sm transition-all',
              'text-sidebar-foreground hover:bg-white/5',
              sidebarCollapsed && 'justify-center px-2'
            )}
          >
            {sidebarCollapsed
              ? <ChevronRight size={14} />
              : (
                <>
                  <ChevronLeft size={14} className="shrink-0" />
                  <span className="ml-3 text-xs text-muted-foreground">Collapse</span>
                </>
              )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  )
}
