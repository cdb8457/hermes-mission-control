import { useState, useCallback, DragEvent } from 'react'

export interface DroppedFile {
  name: string
  size: number
  type: string
  content: string | null  // base64 for images, text for text files, null for binary
  isImage: boolean
}

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'])
const TEXT_TYPES = new Set(['text/plain', 'text/markdown', 'text/csv', 'application/json', 'text/html', 'text/css', 'text/javascript'])
const MAX_TEXT_SIZE = 200_000  // 200 KB text limit
const MAX_IMAGE_SIZE = 5_000_000  // 5 MB image limit

async function readFileContent(file: File): Promise<{ content: string | null; isImage: boolean }> {
  if (IMAGE_TYPES.has(file.type) && file.size <= MAX_IMAGE_SIZE) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve({ content: reader.result as string, isImage: true })
      reader.onerror = () => resolve({ content: null, isImage: true })
      reader.readAsDataURL(file)
    })
  }

  if ((TEXT_TYPES.has(file.type) || file.name.match(/\.(txt|md|py|ts|tsx|js|jsx|json|yaml|yml|toml|sh|bash|zsh|css|html|xml|csv|log)$/i)) && file.size <= MAX_TEXT_SIZE) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve({ content: reader.result as string, isImage: false })
      reader.onerror = () => resolve({ content: null, isImage: false })
      reader.readAsText(file)
    })
  }

  return { content: null, isImage: false }
}

interface UseFileDropResult {
  isDragOver: boolean
  droppedFiles: DroppedFile[]
  dragHandlers: {
    onDragOver: (e: DragEvent) => void
    onDragEnter: (e: DragEvent) => void
    onDragLeave: (e: DragEvent) => void
    onDrop: (e: DragEvent) => void
  }
  removeFile: (name: string) => void
  clearFiles: () => void
  buildFileContext: () => string
}

export function useFileDrop(): UseFileDropResult {
  const [isDragOver, setIsDragOver] = useState(false)
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([])
  const [dragCounter, setDragCounter] = useState(0)

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(c => {
      if (c === 0) setIsDragOver(true)
      return c + 1
    })
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(c => {
      const next = c - 1
      if (next <= 0) { setIsDragOver(false); return 0 }
      return next
    })
  }, [])

  const onDrop = useCallback(async (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setDragCounter(0)

    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length === 0) return

    const processed = await Promise.all(
      files.slice(0, 5).map(async (file): Promise<DroppedFile> => {
        const { content, isImage } = await readFileContent(file)
        return { name: file.name, size: file.size, type: file.type, content, isImage }
      })
    )

    setDroppedFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...processed.filter(f => !existing.has(f.name))]
    })
  }, [])

  const removeFile = useCallback((name: string) => {
    setDroppedFiles(prev => prev.filter(f => f.name !== name))
  }, [])

  const clearFiles = useCallback(() => setDroppedFiles([]), [])

  const buildFileContext = useCallback((): string => {
    if (droppedFiles.length === 0) return ''
    const parts = droppedFiles
      .filter(f => f.content !== null && !f.isImage)
      .map(f => `<file name="${f.name}">\n${f.content}\n</file>`)
    return parts.length > 0 ? `\n\n${parts.join('\n\n')}` : ''
  }, [droppedFiles])

  return {
    isDragOver,
    droppedFiles,
    dragHandlers: { onDragOver, onDragEnter, onDragLeave, onDrop },
    removeFile,
    clearFiles,
    buildFileContext
  }
}
