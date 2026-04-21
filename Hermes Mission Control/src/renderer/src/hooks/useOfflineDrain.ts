import { useEffect, useRef } from 'react'
import { useConnectionStore } from '../store/connection'
import { useOfflineQueue } from '../store/offline'
import { useHermesSSE } from './useHermesSSE'

/**
 * Drains the offline message queue when the connection is restored.
 * Runs in App.tsx so it's always active regardless of current page.
 */
export function useOfflineDrain(): void {
  const status = useConnectionStore(s => s.status)
  const { queue, dequeue, setDraining } = useOfflineQueue()
  const { sendMessage } = useHermesSSE()
  const draining = useRef(false)

  useEffect(() => {
    if (status !== 'connected') return
    if (queue.length === 0) return
    if (draining.current) return

    const drain = async (): Promise<void> => {
      draining.current = true
      setDraining(true)

      // Process queued messages sequentially
      const snapshot = [...queue]
      for (const msg of snapshot) {
        try {
          await sendMessage({ sessionId: msg.sessionId, content: msg.content, model: msg.model })
          dequeue(msg.id)
          // Small gap between messages
          await new Promise(r => setTimeout(r, 500))
        } catch {
          // Leave failed message in queue for next attempt
          break
        }
      }

      draining.current = false
      setDraining(false)
    }

    drain()
  }, [status, queue.length])
}
