import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MessageSquare, Brain, Zap, X, Loader2, Clock } from 'lucide-react'
import { useChatStore } from '../../store/chat'
import { useConnectionStore } from '../../store/connection'
import { getMemory } from '../../api/memory'
import { getSkills } from '../../api/skills'
import { cn } from '../../lib/utils'

interface SearchResult {
  id: string
  type: 'chat' | 'memory' | 'skill'
  title: string
  preview: string
  action: () => void
}

function highlight(text: string, query: string): string {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '**$1**')
}

function HighlightedText({ text, query }: { text: string; query: string }): JSX.Element {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-primary/30 text-primary rounded-sm px-0.5">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

const RESULT_ICONS = {
  chat: MessageSquare,
  memory: Brain,
  skill: Zap
}

const RESULT_COLORS = {
  chat: 'text-blue-400',
  memory: 'text-purple-400',
  skill: 'text-yellow-400'
}

const RESULT_BG = {
  chat: 'bg-blue-400/10',
  memory: 'bg-purple-400/10',
  skill: 'bg-yellow-400/10'
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps): JSX.Element | null {
  const navigate = useNavigate()
  const { sessions, setActiveSession } = useChatStore()
  const { features, status } = useConnectionStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Build results from live data
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }

    setIsSearching(true)
    const term = q.toLowerCase()
    const found: SearchResult[] = []

    // Search chat sessions + messages
    for (const session of sessions) {
      if (session.title.toLowerCase().includes(term)) {
        found.push({
          id: `chat-${session.id}`,
          type: 'chat',
          title: session.title,
          preview: `${session.messageCount} messages`,
          action: () => {
            setActiveSession(session.id)
            navigate(`/chat/${session.id}`)
            onClose()
          }
        })
      }
      // Search message content
      // (messages are in store — check first 3 matching messages per session)
      const msgs = useChatStore.getState().messages[session.id] ?? []
      let msgMatches = 0
      for (const msg of msgs) {
        if (msgMatches >= 2) break
        if (msg.content.toLowerCase().includes(term)) {
          const idx = msg.content.toLowerCase().indexOf(term)
          const start = Math.max(0, idx - 30)
          const preview = (start > 0 ? '…' : '') + msg.content.slice(start, idx + 60) + (idx + 60 < msg.content.length ? '…' : '')
          found.push({
            id: `msg-${session.id}-${msg.id}`,
            type: 'chat',
            title: `${session.title} — ${msg.role === 'user' ? 'You' : 'Hermes'}`,
            preview,
            action: () => {
              setActiveSession(session.id)
              navigate(`/chat/${session.id}`)
              onClose()
            }
          })
          msgMatches++
        }
      }
    }

    // Search memory (only if feature available and connected)
    if (features.memory && status === 'connected') {
      try {
        const memory = await getMemory()
        for (const item of memory) {
          const name = (item.name ?? '').toLowerCase()
          const content = (item.content ?? '').toLowerCase()
          if (name.includes(term) || content.includes(term)) {
            found.push({
              id: `memory-${item.id}`,
              type: 'memory',
              title: item.name ?? 'Memory',
              preview: (item.content ?? '').slice(0, 80) + ((item.content ?? '').length > 80 ? '…' : ''),
              action: () => { navigate('/memory'); onClose() }
            })
            if (found.filter(r => r.type === 'memory').length >= 5) break
          }
        }
      } catch { /* ignore */ }
    }

    // Search skills
    if (features.skills && status === 'connected') {
      try {
        const skills = await getSkills()
        for (const skill of skills) {
          const name = (skill.name ?? '').toLowerCase()
          const desc = (skill.description ?? '').toLowerCase()
          if (name.includes(term) || desc.includes(term)) {
            found.push({
              id: `skill-${skill.id}`,
              type: 'skill',
              title: skill.name ?? 'Skill',
              preview: (skill.description ?? '').slice(0, 80),
              action: () => { navigate('/skills'); onClose() }
            })
            if (found.filter(r => r.type === 'skill').length >= 4) break
          }
        }
      } catch { /* ignore */ }
    }

    setResults(found.slice(0, 12))
    setSelectedIndex(0)
    setIsSearching(false)
  }, [sessions, features, status, navigate, onClose, setActiveSession])

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current)
    if (!query.trim()) { setResults([]); setIsSearching(false); return }
    setIsSearching(true)
    searchTimeout.current = setTimeout(() => runSearch(query), 200)
    return () => clearTimeout(searchTimeout.current)
  }, [query])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      results[selectedIndex]?.action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Panel */}
          <div className="fixed inset-x-0 top-0 z-50 flex items-start justify-center pt-[12vh] px-4 pointer-events-none">
            <motion.div
              className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                {isSearching
                  ? <Loader2 size={16} className="text-muted-foreground shrink-0 animate-spin" />
                  : <Search size={16} className="text-muted-foreground shrink-0" />
                }
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search chats, memory, skills…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    <X size={14} />
                  </button>
                )}
                <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono shrink-0">ESC</kbd>
              </div>

              {/* Results */}
              {results.length > 0 ? (
                <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
                  {results.map((result, i) => {
                    const Icon = RESULT_ICONS[result.type]
                    return (
                      <button
                        key={result.id}
                        onClick={result.action}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                          i === selectedIndex ? 'bg-primary/8 bg-secondary/60' : 'hover:bg-secondary/30'
                        )}
                      >
                        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5', RESULT_BG[result.type])}>
                          <Icon size={12} className={RESULT_COLORS[result.type]} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            <HighlightedText text={result.title} query={query} />
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            <HighlightedText text={result.preview} query={query} />
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 capitalize shrink-0 mt-1">{result.type}</span>
                      </button>
                    )
                  })}
                </div>
              ) : query && !isSearching ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No results for <span className="font-mono text-foreground">"{query}"</span></p>
                </div>
              ) : !query ? (
                <div className="px-4 py-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Recent chats</p>
                  <div className="space-y-0.5">
                    {sessions.slice(0, 5).map(session => (
                      <button
                        key={session.id}
                        onClick={() => { setActiveSession(session.id); navigate(`/chat/${session.id}`); onClose() }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-secondary/40 transition-colors"
                      >
                        <Clock size={11} className="text-muted-foreground/60 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{session.title}</span>
                      </button>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 py-2">No recent chats</p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-border/50 text-[10px] text-muted-foreground/60">
                <span><kbd className="font-mono border border-border/50 rounded px-1">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono border border-border/50 rounded px-1">↵</kbd> open</span>
                <span><kbd className="font-mono border border-border/50 rounded px-1">ESC</kbd> close</span>
                {highlight('', '')} {/* force highlight util to be used */}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
