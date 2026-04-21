import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Search, LayoutDashboard, MessageSquare, Brain, Zap,
  Terminal, FolderOpen, Activity, Settings, Plus, X,
  Calendar, Info, Radio, BookOpen, Puzzle
} from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { usePluginStore } from '../../store/plugins'
import { triggerPluginCommand } from '../../api/plugins'
import { useConnectionStore } from '../../store/connection'
import { cn } from '../../lib/utils'

interface Command {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  action: () => void
  keywords?: string[]
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const navigate = useNavigate()
  const { createSession, setActiveSession } = useChatStore()
  const { enabledPlugins } = usePluginStore()
  const { profile } = useConnectionStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const baseUrl = profile
    ? `${profile.useHttps ? 'https' : 'http'}://${profile.host}:${profile.port}`
    : null

  const staticCommands: Command[] = [
    {
      id: 'new-chat',
      label: 'New Chat',
      description: 'Start a new conversation',
      icon: Plus,
      action: () => { const id = createSession(); setActiveSession(id); navigate('/chat') },
      keywords: ['chat', 'new', 'conversation', 'message']
    },
    { id: 'dashboard',  label: 'Go to Dashboard',   icon: LayoutDashboard, action: () => navigate('/dashboard'),   keywords: ['home', 'overview', 'stats'] },
    { id: 'chat',       label: 'Go to Chat',         icon: MessageSquare,   action: () => navigate('/chat'),        keywords: ['chat', 'message'] },
    { id: 'memory',     label: 'Browse Memory',      icon: Brain,           action: () => navigate('/memory'),      keywords: ['memory', 'brain', 'knowledge'] },
    { id: 'skills',     label: 'Explore Skills',     icon: Zap,             action: () => navigate('/skills'),      keywords: ['skills', 'tools'] },
    { id: 'terminal',   label: 'Open Terminal',      icon: Terminal,        action: () => navigate('/terminal'),    keywords: ['terminal', 'shell', 'bash'] },
    { id: 'files',      label: 'File Manager',       icon: FolderOpen,      action: () => navigate('/files'),       keywords: ['files', 'uploads'] },
    { id: 'jobs',       label: 'View Jobs',          icon: Activity,        action: () => navigate('/jobs'),        keywords: ['jobs', 'tasks', 'running'] },
    { id: 'scheduler',  label: 'Scheduler',          icon: Calendar,        action: () => navigate('/scheduler'),   keywords: ['scheduler', 'cron', 'schedule', 'recurring', 'automate'] },
    { id: 'conductor',  label: 'Conductor',          icon: Radio,           action: () => navigate('/conductor'),   keywords: ['conductor', 'multi', 'agent', 'orchestrate', 'broadcast', 'parallel'] },
    { id: 'hermes-ui',  label: 'Hermes Dashboard',   icon: BookOpen,        action: () => navigate('/hermes-ui'),   keywords: ['hermes', 'dashboard', 'llm', 'wiki', 'ui'] },
    { id: 'plugins',    label: 'Manage Plugins',     icon: Puzzle,          action: () => navigate('/plugins'),     keywords: ['plugins', 'extensions', 'addons'] },
    { id: 'settings',   label: 'Open Settings',      icon: Settings,        action: () => navigate('/settings'),    keywords: ['settings', 'theme', 'config'] },
    { id: 'about',      label: 'About',              icon: Info,            action: () => navigate('/about'),       keywords: ['about', 'version', 'info'] }
  ]

  // Dynamic plugin commands from gateway-advertised plugins
  const pluginCommands: Command[] = enabledPlugins()
    .filter(p => p.commands && p.commands.length > 0)
    .flatMap(plugin =>
      (plugin.commands ?? []).map(cmd => ({
        id: `plugin-cmd-${plugin.id}-${cmd.id}`,
        label: cmd.label,
        description: cmd.description ?? `${plugin.name} action`,
        icon: Puzzle,
        action: () => {
          if (baseUrl) {
            triggerPluginCommand(plugin.endpoints.base, cmd.endpoint).catch(console.error)
          }
        },
        keywords: ['plugin', plugin.name.toLowerCase(), cmd.label.toLowerCase()]
      }))
    )

  const commands: Command[] = [...staticCommands, ...pluginCommands]

  const filtered = query
    ? commands.filter(cmd => {
        const q = query.toLowerCase()
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q))
        )
      })
    : commands

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { filtered[selectedIdx]?.action(); onClose() }
    else if (e.key === 'Escape') { onClose() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search commands, pages..."
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
            <X size={13} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results found</p>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon
              return (
                <button
                  key={cmd.id}
                  onClick={() => { cmd.action(); onClose() }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    i === selectedIdx ? 'bg-primary/10 text-foreground' : 'hover:bg-secondary/50 text-foreground'
                  )}
                  onMouseEnter={() => setSelectedIdx(i)}
                >
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', i === selectedIdx ? 'bg-primary/20' : 'bg-secondary/50')}>
                    <Icon size={13} className={i === selectedIdx ? 'text-primary' : 'text-muted-foreground'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{cmd.label}</p>
                    {cmd.description && <p className="text-xs text-muted-foreground">{cmd.description}</p>}
                  </div>
                  {i === selectedIdx && (
                    <kbd className="text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">↵</kbd>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground/60">
          <span><kbd className="bg-secondary border border-border rounded px-1 py-0.5">↑↓</kbd> navigate</span>
          <span><kbd className="bg-secondary border border-border rounded px-1 py-0.5">↵</kbd> select</span>
          <span><kbd className="bg-secondary border border-border rounded px-1 py-0.5">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
