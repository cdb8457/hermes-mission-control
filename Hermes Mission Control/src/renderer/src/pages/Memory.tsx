import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Brain, Search, Plus, Trash2, Edit3, Check, X,
  Loader2, AlertCircle, Tag, Download, Upload, FileJson,
  Network, List
} from 'lucide-react'
import { getMemory, createMemoryItem, updateMemoryItem, deleteMemoryItem, type MemoryItem } from '../api/memory'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import { toast } from '../hooks/useToast'
import { MemoryGraph } from '../components/shared/MemoryGraph'

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function MemoryPage(): JSX.Element {
  const { features, status } = useConnectionStore()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', content: '', type: '' })
  const [importing, setImporting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['memory', search],
    queryFn: () => getMemory(search),
    enabled: features.memory && status === 'connected',
    refetchInterval: 30_000
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMemoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] })
      toast({ title: 'Memory item deleted' })
    },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updateMemoryItem(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] })
      setEditingId(null)
      toast({ title: 'Memory item updated' })
    },
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' })
  })

  const createMutation = useMutation({
    mutationFn: createMemoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] })
      setShowCreate(false)
      setNewItem({ name: '', content: '', type: '' })
      toast({ title: 'Memory item created' })
    },
    onError: () => toast({ title: 'Failed to create', variant: 'destructive' })
  })

  const startEdit = (item: MemoryItem): void => {
    setEditingId(item.id)
    setEditContent(item.content)
  }

  const handleExport = (): void => {
    const ts = new Date().toISOString().slice(0, 10)
    downloadJson(
      {
        exportedAt: new Date().toISOString(),
        count: items.length,
        items: items.map(({ id: _, ...rest }) => rest)
      },
      `hermes-memory-${ts}.json`
    )
    toast({ title: `Exported ${items.length} memory items` })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      // Accept either { items: [...] } or a plain array
      const toImport: Partial<MemoryItem>[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.items)
          ? parsed.items
          : []

      if (toImport.length === 0) {
        toast({ title: 'No items found in file', variant: 'destructive' })
        return
      }

      let imported = 0
      for (const item of toImport) {
        if (!item.content) continue
        await createMemoryItem({
          name: item.name ?? item.key ?? '',
          content: item.content,
          type: item.type ?? ''
        })
        imported++
      }

      queryClient.invalidateQueries({ queryKey: ['memory'] })
      toast({ title: `Imported ${imported} memory item${imported !== 1 ? 's' : ''}` })
    } catch (err) {
      toast({ title: 'Failed to import — invalid JSON', variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  if (!features.memory) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Brain size={40} className="text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium mb-1">Memory Not Available</h2>
        <p className="text-sm text-muted-foreground">
          Your Hermes gateway doesn't expose the memory API.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Brain size={18} className="text-primary" />
        <h1 className="text-base font-medium flex-1">Memory</h1>
        {!isLoading && <span className="text-xs text-muted-foreground">{items.length} items</span>}

        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title="Import from JSON"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-secondary/50 transition-all disabled:opacity-50"
        >
          {importing
            ? <Loader2 size={11} className="animate-spin" />
            : <Upload size={11} />
          }
          Import
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={items.length === 0}
          title="Export all as JSON"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-secondary/50 transition-all disabled:opacity-50"
        >
          <Download size={11} />
          Export
        </button>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-secondary/40 rounded-lg p-0.5 border border-border">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all',
              viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            title="List view"
          >
            <List size={11} />
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all',
              viewMode === 'graph' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
            title="Graph view"
          >
            <Network size={11} />
          </button>
        </div>

        {/* New item */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all"
        >
          <Plus size={12} />
          New
        </button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memory..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mx-6 mt-3 p-4 rounded-xl border border-primary/20 bg-primary/5 shrink-0">
          <h3 className="text-sm font-medium mb-3">New Memory Item</h3>
          <div className="space-y-2">
            <input
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder="Name / key"
              className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              placeholder="Type (user, project, reference...)"
              className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <textarea
              value={newItem.content}
              onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
              placeholder="Content..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none font-mono text-xs"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ name: newItem.name, content: newItem.content, type: newItem.type })}
                disabled={!newItem.content.trim() || createMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {createMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="text-muted-foreground animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AlertCircle size={24} className="text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load memory items</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <Brain size={32} className="text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'No results found' : 'No memory items yet'}
          </p>
          {!search && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <FileJson size={12} />
              Import from JSON backup
            </button>
          )}
        </div>
      ) : viewMode === 'graph' ? (
        <div className="flex-1 min-h-0 mx-4 mb-4">
          <MemoryGraph
            items={items}
            className="border border-border"
            onSelectItem={(item) => startEdit(item)}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="group border border-border rounded-xl bg-card hover:border-border/80 transition-all overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {(item.name || item.key) && (
                        <span className="text-sm font-medium truncate">
                          {item.name || item.key}
                        </span>
                      )}
                      {item.type && (
                        <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                          <Tag size={8} />
                          {item.type}
                        </span>
                      )}
                    </div>
                    {editingId === item.id ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border bg-input border-primary text-xs font-mono placeholder:text-muted-foreground focus:outline-none resize-none mt-1"
                        autoFocus
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground line-clamp-3 font-mono leading-relaxed">
                        {item.content}
                      </p>
                    )}
                    {item.updated_at && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                        {formatRelative(item.updated_at)}
                      </p>
                    )}
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 shrink-0',
                    editingId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                    'transition-opacity'
                  )}>
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => updateMutation.mutate({ id: item.id, content: editContent })}
                          disabled={updateMutation.isPending}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Save"
                        >
                          {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
