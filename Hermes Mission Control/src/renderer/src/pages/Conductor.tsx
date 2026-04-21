import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio, Plus, Send, Square, ChevronRight, Zap,
  MessageSquare, Activity, GitFork, Trash2, Maximize2, X,
  BroadcastTower
} from 'lucide-react'
import { useChatStore, type ChatSession, type Message } from '../store/chat'
import { useHermesSSE } from '../hooks/useHermesSSE'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { PageTransition, FadeIn, StaggerList, StaggerItem } from '../components/shared/PageTransition'

// ─── Mini session panel ───────────────────────────────────────────────────────

function SessionPanel({
  session,
  messages,
  isActive,
  onFocus,
  onRemove,
  onExpand
}: {
  session: ChatSession
  messages: Message[]
  isActive: boolean
  onFocus: () => void
  onRemove: () => void
  onExpand: () => void
}): JSX.Element {
  const [input, setInput] = useState('')
  const { isStreaming } = useChatStore()
  const { sendMessage, stop } = useHermesSSE()
  const { status } = useConnectionStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = useCallback(async (): Promise<void> => {
    if (!input.trim() || isStreaming) return
    const content = input.trim()
    setInput('')
    await sendMessage({ sessionId: session.id, content, model: session.model ?? 'claude-opus-4-6' })
  }, [input, isStreaming, session.id, session.model, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const lastMessage = messages[messages.length - 1]
  const isSessionStreaming = isStreaming && messages.some(m => m.isStreaming)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={onFocus}
      className={cn(
        'flex flex-col rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer',
        'bg-card hover:border-primary/40',
        isActive ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border'
      )}
      style={{ minHeight: 240, maxHeight: 320 }}
    >
      {/* Panel header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 bg-secondary/20">
        <div className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          isSessionStreaming ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
        )} />
        <span className="flex-1 text-xs font-medium truncate">{session.title}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {messages.length} msg{messages.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onExpand() }}
          className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Open in Chat"
        >
          <Maximize2 size={10} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
          title="Remove from Conductor"
        >
          <X size={10} />
        </button>
      </div>

      {/* Message preview */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
        ) : (
          messages.slice(-10).map((m) => (
            <div
              key={m.id}
              className={cn('text-xs leading-relaxed', m.role === 'user' ? 'text-foreground/80' : 'text-foreground')}
            >
              <span className={cn(
                'inline text-[9px] font-semibold uppercase tracking-wide mr-1.5',
                m.role === 'user' ? 'text-primary/60' : 'text-muted-foreground'
              )}>
                {m.role === 'user' ? 'You' : 'H'}
              </span>
              <span className="break-words">
                {m.content.length > 120 ? m.content.slice(0, 120) + '…' : m.content}
              </span>
              {m.isStreaming && (
                <span className="inline-block w-1 h-3 bg-primary ml-0.5 animate-[blink_1s_step-end_infinite] align-middle" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick input */}
      <div
        className="shrink-0 px-2 py-1.5 border-t border-border flex gap-1.5 items-center"
        onClick={e => e.stopPropagation()}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={status === 'connected' ? 'Quick message…' : 'Offline'}
          className="flex-1 bg-input border border-border rounded-lg px-2 py-1 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={isSessionStreaming ? stop : handleSend}
          disabled={!isSessionStreaming && !input.trim()}
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all',
            isSessionStreaming
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
        >
          {isSessionStreaming ? <Square size={9} /> : <Send size={9} />}
        </button>
      </div>
    </motion.div>
  )
}

// ─── Activity feed item ───────────────────────────────────────────────────────

interface FeedEvent {
  id: string
  sessionTitle: string
  sessionId: string
  role: 'user' | 'assistant'
  snippet: string
  time: Date
}

// ─── Main Conductor page ──────────────────────────────────────────────────────

export default function ConductorPage(): JSX.Element {
  const navigate = useNavigate()
  const { sessions, messages, createSession, setActiveSession, deleteSession, forkSession } = useChatStore()
  const { status } = useConnectionStore()
  const { sendMessage } = useHermesSSE()

  // Which sessions are pinned to the conductor (default: all active ones)
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => sessions.map(s => s.id))
  const [activeId, setActiveId] = useState<string | null>(sessions[0]?.id ?? null)
  const [broadcast, setBroadcast] = useState('')
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([])

  // Keep pinnedIds in sync when new sessions appear
  useEffect(() => {
    setPinnedIds(prev => {
      const existing = new Set(prev)
      const newIds = sessions.filter(s => !existing.has(s.id)).map(s => s.id)
      if (newIds.length === 0) return prev
      return [...prev, ...newIds]
    })
  }, [sessions])

  // Build activity feed from message changes
  const prevMsgCountsRef = useRef<Record<string, number>>({})
  useEffect(() => {
    const events: FeedEvent[] = []
    for (const session of sessions) {
      const msgs = messages[session.id] ?? []
      const prevCount = prevMsgCountsRef.current[session.id] ?? 0
      if (msgs.length > prevCount) {
        const newMsgs = msgs.slice(prevCount)
        for (const m of newMsgs) {
          if (m.content && !m.isStreaming) {
            events.push({
              id: m.id,
              sessionTitle: session.title,
              sessionId: session.id,
              role: m.role as 'user' | 'assistant',
              snippet: m.content.slice(0, 80),
              time: m.createdAt
            })
          }
        }
        prevMsgCountsRef.current[session.id] = msgs.length
      }
    }
    if (events.length > 0) {
      setFeedEvents(prev => [...events, ...prev].slice(0, 50))
    }
  }, [messages, sessions])

  const pinnedSessions = sessions.filter(s => pinnedIds.includes(s.id))

  const handleAddSession = (): void => {
    const id = createSession('Conductor Chat ' + (pinnedSessions.length + 1))
    setActiveSession(id)
    setPinnedIds(prev => [...prev, id])
    setActiveId(id)
  }

  const handleRemove = (id: string): void => {
    setPinnedIds(prev => prev.filter(p => p !== id))
    if (activeId === id) setActiveId(pinnedIds.find(p => p !== id) ?? null)
  }

  const handleExpand = (id: string): void => {
    setActiveSession(id)
    navigate(`/chat/${id}`)
  }

  const handleBroadcast = async (): Promise<void> => {
    if (!broadcast.trim() || isBroadcasting || pinnedSessions.length === 0) return
    setIsBroadcasting(true)
    const content = broadcast.trim()
    setBroadcast('')
    try {
      // Send to all pinned sessions sequentially with a small gap
      for (const session of pinnedSessions) {
        await sendMessage({ sessionId: session.id, content, model: session.model ?? 'claude-opus-4-6' })
        await new Promise(r => setTimeout(r, 200))
      }
    } finally {
      setIsBroadcasting(false)
    }
  }

  const totalMessages = pinnedSessions.reduce((sum, s) => sum + (messages[s.id]?.length ?? 0), 0)
  const activeStreamCount = pinnedSessions.filter(s => (messages[s.id] ?? []).some(m => m.isStreaming)).length

  return (
    <PageTransition>
      <div className="flex h-full overflow-hidden">
        {/* Main grid area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
              <Radio size={15} className="text-primary" />
              <h1 className="text-sm font-semibold">Conductor</h1>
              <span className="text-xs text-muted-foreground">Multi-agent orchestration</span>

              {/* Stats */}
              <div className="ml-auto flex items-center gap-4">
                {activeStreamCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-primary animate-pulse">
                    <Activity size={11} />
                    {activeStreamCount} streaming
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {pinnedSessions.length} session{pinnedSessions.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-muted-foreground">
                  {totalMessages} messages
                </span>
                <div className={cn(
                  'flex items-center gap-1.5 text-xs',
                  status === 'connected' ? 'text-green-400' : 'text-yellow-400'
                )}>
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
                  )} />
                  {status === 'connected' ? 'Live' : 'Offline'}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Broadcast bar */}
          <FadeIn delay={0.05}>
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-secondary/10 shrink-0">
              <BroadcastTower size={12} className="text-muted-foreground shrink-0" />
              <input
                value={broadcast}
                onChange={e => setBroadcast(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleBroadcast() }}
                placeholder={`Broadcast to all ${pinnedSessions.length} sessions…`}
                className="flex-1 bg-input border border-border rounded-lg px-3 py-1.5 text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                disabled={pinnedSessions.length === 0}
              />
              <button
                onClick={handleBroadcast}
                disabled={!broadcast.trim() || isBroadcasting || pinnedSessions.length === 0}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'bg-primary text-primary-foreground hover:bg-primary/90',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {isBroadcasting ? (
                  <><Activity size={11} className="animate-spin" /> Sending…</>
                ) : (
                  <><Send size={11} /> Broadcast</>
                )}
              </button>
              <button
                onClick={handleAddSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-secondary hover:bg-secondary/80 text-foreground border border-border"
              >
                <Plus size={11} />
                New Session
              </button>
            </div>
          </FadeIn>

          {/* Session grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {pinnedSessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Radio size={24} className="text-primary" />
                </div>
                <h2 className="text-lg font-medium mb-1">No sessions in Conductor</h2>
                <p className="text-sm text-muted-foreground max-w-xs mb-4">
                  Start a session or head to Chat and come back — all sessions appear here automatically.
                </p>
                <button
                  onClick={handleAddSession}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus size={14} />
                  Create first session
                </button>
              </div>
            ) : (
              <AnimatePresence>
                <div className={cn(
                  'grid gap-4',
                  pinnedSessions.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' :
                  pinnedSessions.length === 2 ? 'grid-cols-2' :
                  pinnedSessions.length <= 4 ? 'grid-cols-2' :
                  'grid-cols-3'
                )}>
                  {pinnedSessions.map(session => (
                    <SessionPanel
                      key={session.id}
                      session={session}
                      messages={messages[session.id] ?? []}
                      isActive={activeId === session.id}
                      onFocus={() => setActiveId(session.id)}
                      onRemove={() => handleRemove(session.id)}
                      onExpand={() => handleExpand(session.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Activity feed sidebar */}
        <div className="w-64 border-l border-border flex flex-col shrink-0 bg-sidebar/30">
          <div className="px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity</span>
              {feedEvents.length > 0 && (
                <button
                  onClick={() => setFeedEvents([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {feedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Activity size={20} className="text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground/50">Activity will appear here as sessions receive messages</p>
              </div>
            ) : (
              <StaggerList className="py-1">
                {feedEvents.map((event) => (
                  <StaggerItem key={event.id}>
                    <button
                      onClick={() => { setActiveSession(event.sessionId); navigate(`/chat/${event.sessionId}`) }}
                      className="w-full flex flex-col gap-0.5 px-4 py-2.5 hover:bg-secondary/30 transition-colors text-left border-b border-border/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-primary/70 truncate max-w-[120px]">
                          {event.sessionTitle}
                        </span>
                        <span className={cn(
                          'text-[9px] uppercase font-semibold px-1 rounded',
                          event.role === 'user' ? 'text-primary/60 bg-primary/10' : 'text-muted-foreground bg-secondary'
                        )}>
                          {event.role === 'user' ? 'You' : 'H'}
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/70 leading-relaxed line-clamp-2">{event.snippet}</p>
                      <span className="text-[9px] text-muted-foreground/50">{formatRelative(event.time)}</span>
                    </button>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </div>

          {/* Quick session list */}
          <div className="border-t border-border shrink-0">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</span>
              <span className="text-[10px] text-muted-foreground">{sessions.length} total</span>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {sessions.map(s => {
                const isPinned = pinnedIds.includes(s.id)
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 px-4 py-1.5 hover:bg-secondary/20 transition-colors group"
                  >
                    <MessageSquare size={9} className={cn(isPinned ? 'text-primary' : 'text-muted-foreground/40')} />
                    <span className="flex-1 text-[11px] truncate text-muted-foreground">{s.title}</span>
                    <button
                      onClick={() => {
                        if (isPinned) {
                          handleRemove(s.id)
                        } else {
                          setPinnedIds(prev => [...prev, s.id])
                          setActiveId(s.id)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[9px] text-muted-foreground hover:text-foreground transition-all"
                    >
                      {isPinned ? 'hide' : 'show'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
