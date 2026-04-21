import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '../lib/utils'

export interface QueuedMessage {
  id: string
  sessionId: string
  content: string
  model: string
  queuedAt: string
}

interface OfflineQueueState {
  queue: QueuedMessage[]
  isDraining: boolean

  enqueue: (sessionId: string, content: string, model: string) => QueuedMessage
  dequeue: (id: string) => void
  clearQueue: () => void
  setDraining: (v: boolean) => void
  getPending: () => QueuedMessage[]
}

export const useOfflineQueue = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isDraining: false,

      enqueue: (sessionId, content, model) => {
        const msg: QueuedMessage = {
          id: generateId(),
          sessionId,
          content,
          model,
          queuedAt: new Date().toISOString()
        }
        set(state => ({ queue: [...state.queue, msg] }))
        return msg
      },

      dequeue: (id) => {
        set(state => ({ queue: state.queue.filter(m => m.id !== id) }))
      },

      clearQueue: () => set({ queue: [] }),

      setDraining: (v) => set({ isDraining: v }),

      getPending: () => get().queue
    }),
    {
      name: 'hermes-offline-queue',
      partialize: (state) => ({ queue: state.queue })
    }
  )
)
