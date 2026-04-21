import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, Send, Square, ChevronDown,
  Trash2, Edit3, Copy, Check, ChevronRight,
  Terminal, AlertCircle, MessageSquare,
  Paperclip, X, FileText, Image as ImageIcon,
  Download, GitFork
} from 'lucide-react'
import { useChatStore, type Message } from '../store/chat'
import { useHermesSSE } from '../hooks/useHermesSSE'
import { useConnectionStore } from '../store/connection'
import { useFileDrop } from '../hooks/useFileDrop'
import { useChatExport } from '../hooks/useChatExport'
import { getModels } from '../api/chat'
import { cn } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function ToolCallBlock({ toolCall, sessionId, messageId }: {
  toolCall: NonNullable<Message['toolCalls']>[number]
  sessionId: string
  messageId: string
}): JSX.Element {
  const { toggleToolCall } = useChatStore()
  return (
    <div className="my-2 border border-border rounded-lg overflow-hidden text-xs font-mono">
      <button
        onClick={() => toggleToolCall(sessionId, messageId, toolCall.id)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary transition-colors text-left"
      >
        <Terminal size={11} className="text-primary shrink-0" />
        <span className="font-medium text-foreground">{toolCall.name}</span>
        <ChevronRight size={11} className={cn('text-muted-foreground ml-auto transition-transform', toolCall.isExpanded && 'rotate-90')} />
      </button>
      {toolCall.isExpanded && (
        <div className="border-t border-border">
          {Object.keys(toolCall.input).length > 0 && (
            <div className="px-3 py-2 bg-background/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Input</p>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all">
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.output && (
            <div className="px-3 py-2 bg-background/30 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Output</p>
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all">{toolCall.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message, sessionId, onFork }: {
  message: Message
  sessionId: string
  onFork: (messageId: string) => void
}): JSX.Element {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const copyMessage = (): void => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('group flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
          H
        </div>
      )}

      <div className={cn('max-w-[80%] min-w-0 flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border text-foreground rounded-tl-sm'
        )}>
          {/* Tool calls */}
          {(message.toolCalls ?? []).length > 0 && (
            <div className="mb-2">
              {(message.toolCalls ?? []).map(tc => (
                <ToolCallBlock key={tc.id} toolCall={tc} sessionId={sessionId} messageId={message.id} />
              ))}
            </div>
          )}

          {/* Content */}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children }) {
                    const isBlock = Boolean(className)
                    return isBlock ? (
                      <code className="block bg-black/30 p-3 rounded-lg text-xs font-mono overflow-x-auto">{children}</code>
                    ) : (
                      <code className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                    )
                  },
                  p({ children }) { return <p className="mb-2 last:mb-0">{children}</p> }
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-[blink_1s_step-end_infinite]" />
              )}
            </div>
          )}
        </div>

        {/* Meta + actions */}
        <div className={cn('flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground">{formatRelative(message.createdAt)}</span>
          <button onClick={copyMessage} className="text-muted-foreground hover:text-foreground transition-colors" title="Copy message">
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
          <button
            onClick={() => onFork(message.id)}
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Fork conversation from here"
          >
            <GitFork size={11} />
          </button>
        </div>
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
          U
        </div>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export default function ChatPage(): JSX.Element {
  const { sessionId: paramSessionId } = useParams()
  const navigate = useNavigate()
  const {
    sessions, activeSessionId, isStreaming,
    createSession, setActiveSession, deleteSession, renameSession, getActiveMessages, forkSession
  } = useChatStore()
  const { status } = useConnectionStore()
  const { sendMessage, stop } = useHermesSSE()
  const { isDragOver, droppedFiles, dragHandlers, removeFile, clearFiles, buildFileContext } = useFileDrop()
  const { exportChat } = useChatExport()
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [input, setInput] = useState('')
  const [model, setModel] = useState('claude-opus-4-6')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: models = [] } = useQuery({
    queryKey: ['models'],
    queryFn: getModels,
    enabled: status === 'connected'
  })

  const activeMessages = getActiveMessages()

  useEffect(() => {
    if (paramSessionId && paramSessionId !== 'new') {
      setActiveSession(paramSessionId)
    } else if (!activeSessionId && sessions.length > 0) {
      setActiveSession(sessions[0].id)
    }
  }, [paramSessionId])

  useEffect(() => {
    if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length, isStreaming, autoScroll])

  const handleScroll = (): void => {
    const el = scrollContainerRef.current
    if (!el) return
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 100)
  }

  const handleSend = useCallback(async (): Promise<void> => {
    if ((!input.trim() && droppedFiles.length === 0) || isStreaming) return

    let sid = activeSessionId
    if (!sid) {
      sid = createSession(input.slice(0, 50))
      setActiveSession(sid)
    } else if ((sessions.find(s => s.id === sid)?.messageCount ?? 0) === 0) {
      renameSession(sid, input.slice(0, 50))
    }

    const fileContext = buildFileContext()
    const msg = input.trim() + fileContext
    setInput('')
    clearFiles()
    setAutoScroll(true)
    await sendMessage({ sessionId: sid, content: msg, model })
  }, [input, isStreaming, activeSessionId, model, droppedFiles, buildFileContext, clearFiles])

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const startRename = (id: string, title: string, e: React.MouseEvent): void => {
    e.stopPropagation()
    setEditingSessionId(id)
    setEditingTitle(title)
  }

  const commitRename = (): void => {
    if (editingSessionId && editingTitle.trim()) renameSession(editingSessionId, editingTitle.trim())
    setEditingSessionId(null)
  }

  const handleFork = useCallback((messageId: string): void => {
    if (!activeSessionId) return
    const newId = forkSession(activeSessionId, messageId)
    navigate(`/chat/${newId}`)
  }, [activeSessionId, forkSession, navigate])

  const isConnected = status === 'connected'

  return (
    <div className="flex h-full">
      {/* Sessions panel */}
      <div className="w-56 flex flex-col border-r border-border bg-sidebar/50">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chats</span>
          <button
            onClick={() => { const id = createSession(); setActiveSession(id) }}
            className="p-1 rounded-md hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
            title="New Chat"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 px-3">No chats yet. Start a conversation!</p>
          ) : (
            sessions.map(session => {
              const isBranch = Boolean(session.forkedFrom)
              return (
                <div
                  key={session.id}
                  onClick={() => { setActiveSession(session.id); navigate(`/chat/${session.id}`) }}
                  className={cn(
                    'group flex items-center gap-2 py-2 cursor-pointer transition-all',
                    isBranch ? 'pl-5 pr-3' : 'px-3',
                    activeSessionId === session.id
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isBranch && (
                    <GitFork size={9} className="text-primary/60 shrink-0" />
                  )}
                  {editingSessionId === session.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingSessionId(null) }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-transparent text-xs border-b border-primary focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-xs truncate">{session.title}</span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                    <button onClick={e => startRename(session.id, session.title, e)} className="p-0.5 rounded hover:text-foreground transition-colors">
                      <Edit3 size={10} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteSession(session.id) }} className="p-0.5 rounded hover:text-destructive transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div
        className={cn('flex-1 flex flex-col min-w-0 relative', isDragOver && 'ring-2 ring-primary/40 ring-inset')}
        {...dragHandlers}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/5 backdrop-blur-sm border-2 border-dashed border-primary/40 rounded-lg pointer-events-none">
            <div className="flex flex-col items-center gap-3 text-primary">
              <Paperclip size={32} className="opacity-80" />
              <p className="text-sm font-medium">Drop files to attach</p>
              <p className="text-xs opacity-60">Images, text, code, JSON, CSV…</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
          <span className="text-sm font-medium flex-1 truncate">
            {sessions.find(s => s.id === activeSessionId)?.title ?? 'New Chat'}
          </span>
          {models.length > 0 && (
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="text-xs bg-secondary border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {models.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
            </select>
          )}
          {/* Export button */}
          {activeSessionId && activeMessages.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                title="Export conversation"
              >
                <Download size={13} />
              </button>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]">
                    {(['markdown', 'json', 'text'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => { exportChat(activeSessionId!, fmt); setShowExportMenu(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary/50 transition-colors text-left capitalize"
                      >
                        <Download size={10} className="text-muted-foreground" />
                        Export as {fmt === 'markdown' ? 'Markdown' : fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative">
          {!activeSessionId || activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-primary" />
              </div>
              <h2 className="text-lg font-medium mb-1">Start a conversation</h2>
              <p className="text-sm text-muted-foreground max-w-xs">Send a message to your Hermes agent</p>
              {!isConnected && (
                <div className="mt-4 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg">
                  <AlertCircle size={12} />
                  Not connected — messages will be queued
                </div>
              )}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-secondary/30 border border-border px-3 py-2 rounded-lg">
                <Paperclip size={11} />
                Drag files here to attach them
              </div>
            </div>
          ) : (
            activeMessages.map(message => (
              <MessageBubble key={message.id} message={message} sessionId={activeSessionId!} onFork={handleFork} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom */}
        {!autoScroll && (
          <div className="absolute bottom-20 right-8 pointer-events-none">
            <button
              onClick={() => { setAutoScroll(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className="pointer-events-auto p-2 rounded-full bg-card border border-border shadow-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Attached files preview */}
        {droppedFiles.length > 0 && (
          <div className="shrink-0 px-3 pt-2 flex flex-wrap gap-2 border-t border-border">
            {droppedFiles.map(file => (
              <div
                key={file.name}
                className="flex items-center gap-1.5 bg-secondary border border-border rounded-lg px-2 py-1 text-xs group"
              >
                {file.isImage
                  ? <ImageIcon size={11} className="text-blue-400 shrink-0" />
                  : <FileText size={11} className="text-muted-foreground shrink-0" />
                }
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-muted-foreground/60">{formatFileSize(file.size)}</span>
                {file.content === null && (
                  <span className="text-yellow-400/70">(preview only)</span>
                )}
                <button
                  onClick={() => removeFile(file.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? 'Message Hermes… (Enter to send, Shift+Enter for newline)' : 'Not connected — messages will be queued'}
              rows={1}
              className={cn(
                'flex-1 px-3 py-2.5 rounded-xl border bg-input border-border text-sm',
                'placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'min-h-[42px] max-h-[200px]'
              )}
            />
            <button
              onClick={isStreaming ? stop : handleSend}
              disabled={!isStreaming && !input.trim() && droppedFiles.length === 0}
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                isStreaming
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
              title={isStreaming ? 'Stop' : 'Send'}
            >
              {isStreaming ? <Square size={14} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
