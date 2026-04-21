import { WifiOff, Loader2, Clock } from 'lucide-react'
import { useOfflineQueue } from '../../store/offline'
import { useConnectionStore } from '../../store/connection'
import { cn } from '../../lib/utils'

/**
 * Persistent banner shown at the bottom of the screen when:
 * - There are messages in the offline queue (pending delivery), OR
 * - The queue is actively draining after reconnect
 */
export function OfflineQueueBanner(): JSX.Element | null {
  const { queue, isDraining } = useOfflineQueue()
  const status = useConnectionStore(s => s.status)

  if (queue.length === 0 && !isDraining) return null
  if (status === 'connected' && queue.length === 0) return null

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5 text-sm border-t',
      isDraining
        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
    )}>
      {isDraining ? (
        <>
          <Loader2 size={14} className="animate-spin shrink-0" />
          <span>Sending {queue.length} queued message{queue.length !== 1 ? 's' : ''}…</span>
        </>
      ) : (
        <>
          {status === 'connected'
            ? <Clock size={14} className="shrink-0" />
            : <WifiOff size={14} className="shrink-0" />
          }
          <span>
            {queue.length} message{queue.length !== 1 ? 's' : ''} queued
            {status !== 'connected' ? ' — will send when reconnected' : ''}
          </span>
        </>
      )}
    </div>
  )
}
