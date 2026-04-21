import { useToast } from '../../hooks/useToast'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Toaster(): JSX.Element {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border animate-slide-in-up',
            'bg-card border-border text-foreground text-sm',
            toast.variant === 'destructive' && 'bg-destructive/10 border-destructive/30 text-destructive'
          )}
        >
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="font-medium text-sm mb-0.5">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-xs text-muted-foreground">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
