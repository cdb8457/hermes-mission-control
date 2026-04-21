import { hermesGet, hermesPost, hermesPut, hermesDelete } from './client'

export interface MemoryItem {
  id: string
  key?: string
  name?: string
  content: string
  type?: string
  namespace?: string
  created_at?: string
  updated_at?: string
  tags?: string[]
}

export interface MemoryListResponse {
  items?: MemoryItem[]
  memories?: MemoryItem[]
  total?: number
}

export async function getMemory(search?: string): Promise<MemoryItem[]> {
  try {
    const query = search ? `?q=${encodeURIComponent(search)}` : ''
    const data = await hermesGet<MemoryListResponse | MemoryItem[]>(`/api/memory${query}`)
    if (Array.isArray(data)) return data
    return data.items ?? data.memories ?? []
  } catch {
    return []
  }
}

export async function createMemoryItem(item: Pick<MemoryItem, 'content' | 'type' | 'name'>): Promise<MemoryItem> {
  return hermesPost<MemoryItem>('/api/memory', item)
}

export async function updateMemoryItem(id: string, content: string): Promise<MemoryItem> {
  return hermesPut<MemoryItem>(`/api/memory/${id}`, { content })
}

export async function deleteMemoryItem(id: string): Promise<void> {
  await hermesDelete(`/api/memory/${id}`)
}
