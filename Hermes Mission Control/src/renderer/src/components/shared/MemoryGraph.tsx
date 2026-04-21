import { useRef, useEffect, useCallback, useState } from 'react'
import type { MemoryItem } from '../../api/memory'
import { cn } from '../../lib/utils'

// ─── Physics types ────────────────────────────────────────────────────────────

interface GraphNode {
  id: string
  label: string
  type: string
  content: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface GraphEdge {
  source: string
  target: string
}

// ─── Colour map by memory type ────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  user:      '#60a5fa', // blue
  project:   '#a78bfa', // violet
  reference: '#34d399', // emerald
  feedback:  '#fb923c', // orange
  default:   '#94a3b8'  // slate
}

function typeColor(type: string): string {
  const key = type?.toLowerCase()
  return TYPE_COLORS[key] ?? TYPE_COLORS.default
}

// ─── Force simulation ─────────────────────────────────────────────────────────

const REPULSION   = 6000
const SPRING_LEN  = 120
const SPRING_K    = 0.05
const CENTER_K    = 0.03
const DAMPING     = 0.82
const BORDER_PAD  = 60

function simulate(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number): void {
  const cx = w / 2
  const cy = h / 2

  // Repulsion between all node pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = REPULSION / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx
      a.vy -= fy
      b.vx += fx
      b.vy += fy
    }
  }

  // Spring attraction for edges
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  for (const edge of edges) {
    const a = nodeMap.get(edge.source)
    const b = nodeMap.get(edge.target)
    if (!a || !b) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const stretch = dist - SPRING_LEN
    const fx = (dx / dist) * stretch * SPRING_K
    const fy = (dy / dist) * stretch * SPRING_K
    a.vx += fx
    a.vy += fy
    b.vx -= fx
    b.vy -= fy
  }

  // Center gravity + integration + border bounce
  for (const n of nodes) {
    n.vx += (cx - n.x) * CENTER_K
    n.vy += (cy - n.y) * CENTER_K
    n.vx *= DAMPING
    n.vy *= DAMPING
    n.x += n.vx
    n.y += n.vy
    // Keep inside canvas
    n.x = Math.max(BORDER_PAD, Math.min(w - BORDER_PAD, n.x))
    n.y = Math.max(BORDER_PAD, Math.min(h - BORDER_PAD, n.y))
  }
}

// ─── Build initial nodes and edges ───────────────────────────────────────────

function buildGraph(items: MemoryItem[], w: number, h: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const cx = w / 2
  const cy = h / 2
  const angle = (2 * Math.PI) / Math.max(items.length, 1)

  const nodes: GraphNode[] = items.map((item, i) => {
    const r = Math.min(w, h) * 0.3
    return {
      id: item.id,
      label: (item.name || item.key || 'Memory').slice(0, 20),
      type: item.type ?? '',
      content: item.content ?? '',
      x: cx + r * Math.cos(angle * i),
      y: cy + r * Math.sin(angle * i),
      vx: 0,
      vy: 0,
      radius: 28 + Math.min((item.content?.length ?? 0) / 40, 14)
    }
  })

  // Connect nodes of the same type
  const edges: GraphEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].type && nodes[i].type === nodes[j].type) {
        edges.push({ source: nodes[i].id, target: nodes[j].id })
      }
    }
  }

  return { nodes, edges }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface MemoryGraphProps {
  items: MemoryItem[]
  className?: string
  onSelectItem?: (item: MemoryItem) => void
}

export function MemoryGraph({ items, className, onSelectItem }: MemoryGraphProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[]; w: number; h: number } | null>(null)
  const rafRef = useRef<number>(0)
  const draggingRef = useRef<string | null>(null)
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [tick, setTick] = useState(0)

  // Force re-render at ~30fps while simulation runs
  const scheduleRender = useCallback(() => {
    rafRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current) return
      const { nodes, edges, w, h } = canvasRef.current
      if (draggingRef.current === null) {
        simulate(nodes, edges, w, h)
      }
      setTick(t => t + 1)
      scheduleRender()
    })
  }, [])

  // Init / re-init when items change
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const { width, height } = svg.getBoundingClientRect()
    const w = width || 600
    const h = height || 400
    const { nodes, edges } = buildGraph(items, w, h)
    canvasRef.current = { nodes, edges, w, h }
    cancelAnimationFrame(rafRef.current)
    scheduleRender()
    return () => cancelAnimationFrame(rafRef.current)
  }, [items, scheduleRender])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    draggingRef.current = nodeId
    const svgEl = svgRef.current
    if (!svgEl) return

    const onMove = (ev: MouseEvent): void => {
      const rect = svgEl.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const y = ev.clientY - rect.top
      const canvas = canvasRef.current
      if (!canvas) return
      const node = canvas.nodes.find(n => n.id === nodeId)
      if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0 }
      setTick(t => t + 1)
    }
    const onUp = (): void => {
      draggingRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleNodeClick = (node: GraphNode, e: React.MouseEvent): void => {
    e.stopPropagation()
    setSelected(prev => prev?.id === node.id ? null : node)
    if (onSelectItem) {
      const item = items.find(i => i.id === node.id)
      if (item) onSelectItem(item)
    }
  }

  const canvas = canvasRef.current

  return (
    <div className={cn('relative w-full h-full bg-background/50 rounded-xl overflow-hidden', className)}>
      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        onClick={() => setSelected(null)}
      >
        <defs>
          <radialGradient id="nodeGlow" cx="30%" cy="30%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Edges */}
        {canvas?.edges.map((edge, i) => {
          const s = canvas.nodes.find(n => n.id === edge.source)
          const t = canvas.nodes.find(n => n.id === edge.target)
          if (!s || !t) return null
          return (
            <line
              key={i}
              x1={s.x} y1={s.y}
              x2={t.x} y2={t.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )
        })}

        {/* Nodes */}
        {canvas?.nodes.map(node => {
          const color = typeColor(node.type)
          const isSelected = selected?.id === node.id
          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              style={{ cursor: 'grab' }}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={e => handleNodeClick(node, e)}
            >
              {/* Glow ring when selected */}
              {isSelected && (
                <circle
                  r={node.radius + 8}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />
              )}

              {/* Main circle */}
              <circle
                r={node.radius}
                fill={`${color}22`}
                stroke={color}
                strokeWidth={isSelected ? 2 : 1.5}
                strokeOpacity={isSelected ? 1 : 0.7}
              />

              {/* Inner gradient sheen */}
              <circle r={node.radius} fill="url(#nodeGlow)" />

              {/* Label */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontFamily="inherit"
                fill="white"
                fillOpacity={0.9}
                style={{ pointerEvents: 'none' }}
              >
                {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
              </text>

              {/* Type badge */}
              {node.type && (
                <text
                  y={node.radius + 13}
                  textAnchor="middle"
                  fontSize={8}
                  fontFamily="inherit"
                  fill={color}
                  fillOpacity={0.8}
                  style={{ pointerEvents: 'none' }}
                >
                  {node.type}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Detail tooltip for selected node */}
      {selected && (
        <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-card border border-border shadow-xl text-xs max-h-32 overflow-y-auto">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-medium text-foreground truncate">{selected.label}</span>
            {selected.type && (
              <span
                className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full"
                style={{ background: `${typeColor(selected.type)}22`, color: typeColor(selected.type) }}
              >
                {selected.type}
              </span>
            )}
          </div>
          <p className="text-muted-foreground leading-relaxed">{selected.content.slice(0, 200)}{selected.content.length > 200 ? '…' : ''}</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 bg-card/70 backdrop-blur-sm border border-border rounded-lg p-2">
        {Object.entries(TYPE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[9px] text-muted-foreground capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Node count */}
      <div className="absolute top-3 left-3 text-[10px] text-muted-foreground/60 bg-card/50 backdrop-blur-sm px-2 py-1 rounded-lg">
        {items.length} nodes · drag to rearrange
      </div>
    </div>
  )
}
