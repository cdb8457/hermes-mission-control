import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen, File, Upload, Download, Loader2,
  AlertCircle, ChevronRight, Home, RefreshCw
} from 'lucide-react'
import { useConnectionStore } from '../store/connection'
import { hermesGet, hermesPost } from '../api/client'
import { cn } from '../lib/utils'
import { toast } from '../hooks/useToast'
import { EmptyState } from '../components/shared/EmptyState'

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modified?: string
}

interface FilesResponse {
  files?: FileEntry[]
  entries?: FileEntry[]
  items?: FileEntry[]
}

async function listFiles(path: string): Promise<FileEntry[]> {
  const data = await hermesGet<FilesResponse | FileEntry[]>(
    `/api/files?path=${encodeURIComponent(path)}`
  )
  if (Array.isArray(data)) return data
  return data.files ?? data.entries ?? data.items ?? []
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function FilesPage(): JSX.Element {
  const { features } = useConnectionStore()
  const queryClient = useQueryClient()
  const [currentPath, setCurrentPath] = useState('/')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const { data: files = [], isLoading, error, refetch } = useQuery({
    queryKey: ['files', currentPath],
    queryFn: () => listFiles(currentPath),
    enabled: features.files
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', currentPath)
      return hermesPost('/api/files/upload', formData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      toast({ title: 'File uploaded' })
    },
    onError: () => toast({ title: 'Upload failed', variant: 'destructive' })
  })

  const pathParts = currentPath.split('/').filter(Boolean)

  const navigateTo = (path: string) => {
    setCurrentPath(path || '/')
    setSelectedFile(null)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  if (!features.files) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="File Manager Not Available"
        description="Your Hermes gateway doesn't expose the files API. Enable it in your gateway configuration."
        className="h-full"
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <FolderOpen size={18} className="text-primary" />
          <h1 className="text-base font-medium">Files</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all cursor-pointer">
            <Upload size={12} />
            Upload
            <input
              type="file"
              className="hidden"
              onChange={handleFileInput}
              disabled={uploadMutation.isPending}
            />
          </label>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border text-xs shrink-0">
        <button
          onClick={() => navigateTo('/')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home size={11} />
          root
        </button>
        {pathParts.map((part, i) => {
          const partPath = '/' + pathParts.slice(0, i + 1).join('/')
          return (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={10} className="text-muted-foreground/50" />
              <button
                onClick={() => navigateTo(partPath)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {part}
              </button>
            </span>
          )
        })}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={24} className="text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load files</p>
          </div>
        ) : files.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="Empty folder"
            description="No files in this directory"
          />
        ) : (
          <div className="space-y-0.5">
            {/* Parent directory */}
            {currentPath !== '/' && (
              <button
                onClick={() => {
                  const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
                  navigateTo(parent)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/40 transition-all text-muted-foreground"
              >
                <FolderOpen size={14} />
                <span className="text-sm">..</span>
              </button>
            )}

            {/* Directories first, then files */}
            {[...files]
              .sort((a, b) => {
                if (a.type === 'directory' && b.type !== 'directory') return -1
                if (a.type !== 'directory' && b.type === 'directory') return 1
                return a.name.localeCompare(b.name)
              })
              .map((entry) => (
                <button
                  key={entry.path}
                  onClick={() => {
                    if (entry.type === 'directory') {
                      navigateTo(entry.path)
                    } else {
                      setSelectedFile(selectedFile === entry.path ? null : entry.path)
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left',
                    selectedFile === entry.path
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-secondary/40'
                  )}
                >
                  {entry.type === 'directory' ? (
                    <FolderOpen size={14} className="text-yellow-400 shrink-0" />
                  ) : (
                    <File size={14} className="text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 text-sm truncate">{entry.name}</span>
                  {entry.size && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {formatFileSize(entry.size)}
                    </span>
                  )}
                  {selectedFile === entry.path && entry.type === 'file' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(
                          `${useConnectionStore.getState().getBaseUrl()}/api/files/download?path=${encodeURIComponent(entry.path)}`,
                          '_blank'
                        )
                      }}
                      className="p-1 rounded hover:bg-primary/20 text-primary transition-colors"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploadMutation.isPending && (
        <div className="px-6 py-2 border-t border-border bg-card flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Loader2 size={12} className="animate-spin" />
          Uploading...
        </div>
      )}
    </div>
  )
}
