import { useEffect, useRef, useState } from 'react'
import { Terminal as TerminalIcon, Plus, X, AlertCircle } from 'lucide-react'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'

interface TerminalTab {
  id: string
  title: string
  ws: WebSocket | null
}

export default function TerminalPage(): JSX.Element {
  const { features, getBaseUrl, profile } = useConnectionStore()
  const [tabs, setTabs] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const termContainerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<import('xterm').Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const baseUrl = getBaseUrl()
  const wsUrl = baseUrl ? baseUrl.replace(/^http/, 'ws') + '/api/terminal/ws' : null

  const openTerminal = async () => {
    const { Terminal } = await import('xterm')
    const { FitAddon } = await import('xterm-addon-fit')
    const { WebLinksAddon } = await import('xterm-addon-web-links')

    if (!termContainerRef.current || !wsUrl) return

    // Clean up existing terminal
    if (termRef.current) {
      termRef.current.dispose()
    }
    if (wsRef.current) {
      wsRef.current.close()
    }

    const term = new Terminal({
      theme: {
        background: '#000000',
        foreground: '#e8e8e8',
        cursor: '#3b82f6',
        black: '#1e1e1e',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#e5e7eb',
        brightBlack: '#374151',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#f9fafb'
      },
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      allowProposedApi: true
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(termContainerRef.current)
    fitAddon.fit()
    termRef.current = term

    // Connect via WebSocket
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      term.write('\r\n\x1b[32m✓ Connected to Hermes terminal\x1b[0m\r\n\r\n')
      // Send terminal size
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }

    ws.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'output') term.write(msg.data)
        } catch {
          term.write(e.data)
        }
      } else {
        e.data.text().then((text: string) => term.write(text))
      }
    }

    ws.onerror = () => {
      term.write('\r\n\x1b[31m✗ WebSocket error\x1b[0m\r\n')
    }

    ws.onclose = () => {
      term.write('\r\n\x1b[33m— Terminal disconnected —\x1b[0m\r\n')
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols, rows }))
      }
    })

    // Handle window resize
    const resizeObserver = new ResizeObserver(() => fitAddon.fit())
    resizeObserver.observe(termContainerRef.current)

    const tabId = Math.random().toString(36).slice(2)
    setTabs(prev => [...prev, { id: tabId, title: `Terminal ${prev.length + 1}`, ws }])
    setActiveTab(tabId)

    return () => {
      resizeObserver.disconnect()
      term.dispose()
      ws.close()
    }
  }

  useEffect(() => {
    if (features.terminal && tabs.length === 0) {
      openTerminal()
    }
    return () => {
      termRef.current?.dispose()
      wsRef.current?.close()
    }
  }, [features.terminal])

  if (!features.terminal) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-secondary/50 border border-border flex items-center justify-center mb-4">
          <TerminalIcon size={24} className="text-muted-foreground/60" />
        </div>
        <h2 className="text-lg font-medium mb-2">Terminal Not Available</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Your Hermes gateway doesn't expose a terminal WebSocket endpoint.
        </p>
        <div className="mt-4 text-xs bg-secondary/50 border border-border rounded-lg px-4 py-2 font-mono text-muted-foreground">
          Requires: <span className="text-foreground">{profile?.host}:{profile?.port}/api/terminal/ws</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Enable <code className="bg-secondary px-1 rounded">API_SERVER_ENABLED=true</code> in your gateway config
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[#1a1a1a] border-b border-white/10 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded text-xs transition-all',
              activeTab === tab.id
                ? 'bg-[#2a2a2a] text-white'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            )}
          >
            <TerminalIcon size={10} />
            {tab.title}
            <X
              size={10}
              className="ml-1 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                tab.ws?.close()
                setTabs(prev => prev.filter(t => t.id !== tab.id))
                if (activeTab === tab.id) setActiveTab(tabs[0]?.id ?? null)
              }}
            />
          </button>
        ))}
        <button
          onClick={openTerminal}
          className="p-1 rounded text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          title="New terminal"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Terminal container */}
      <div
        ref={termContainerRef}
        className="flex-1 overflow-hidden p-2"
        style={{ background: '#000000' }}
      />
    </div>
  )
}
