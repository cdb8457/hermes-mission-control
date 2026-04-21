import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

interface StatusBadgeProps {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'
  showLabel?: boolean
  className?: string
}

const statusMap = {
  connected: { label: 'Connected', dot: 'bg-green-500', pulse: true, text: 'text-green-400' },
  connecting: { label: 'Connecting', dot: 'bg-yellow-500', pulse: false, text: 'text-yellow-400', spin: true },
  reconnecting: { label: 'Reconnecting', dot: 'bg-yellow-500', pulse: false, text: 'text-yellow-400', spin: true },
  disconnected: { label: 'Offline', dot: 'bg-muted-foreground', pulse: false, text: 'text-muted-foreground' },
  error: { label: 'Error', dot: 'bg-red-500', pulse: false, text: 'text-red-400' }
}

export function StatusBadge({ status, showLabel = true, className }: StatusBadgeProps): JSX.Element {
  const config = statusMap[status]
  const isSpin = 'spin' in config && config.spin

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {isSpin ? (
        <Loader2 size={8} className={cn(config.text, 'animate-spin')} />
      ) : (
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', config.dot)} />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
        </span>
      )}
      {showLabel && (
        <span className={cn('text-[11px] font-medium', config.text)}>{config.label}</span>
      )}
    </span>
  )
}
