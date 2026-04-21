import { useState, useEffect } from 'react'
import { Download, RefreshCw, X, CheckCircle, AlertCircle, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }
  | { type: 'dev' }

export function UpdateBanner(): JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return
    const remove = window.electronAPI.on('updater:status', (data: unknown) => {
      setStatus(data as UpdateStatus)
      setDismissed(false)
    })
    return () => remove()
  }, [])

  const handleCheck = (): void => {
    if (!window.electronAPI) return
    setStatus({ type: 'checking' })
    window.electronAPI.updater.check().then(result => setStatus(result as UpdateStatus))
  }

  const handleDownload = (): void => {
    window.electronAPI?.updater.download()
  }

  const handleInstall = (): void => {
    window.electronAPI?.updater.install()
  }

  // Don't show for idle, not-available, or dev
  if (dismissed || status.type === 'idle' || status.type === 'not-available' || status.type === 'dev') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={cn(
          'fixed bottom-16 left-1/2 -translate-x-1/2 z-50',
          'flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-2xl border text-sm',
          status.type === 'error'
            ? 'bg-destructive/20 border-destructive/40 text-destructive'
            : status.type === 'downloaded'
              ? 'bg-green-500/15 border-green-500/40 text-green-400'
              : 'bg-card border-border text-foreground'
        )}
      >
        {/* Icon */}
        {status.type === 'checking' && <RefreshCw size={13} className="text-primary animate-spin shrink-0" />}
        {status.type === 'available' && <ArrowUp size={13} className="text-primary shrink-0" />}
        {status.type === 'downloading' && <Download size={13} className="text-primary animate-bounce shrink-0" />}
        {status.type === 'downloaded' && <CheckCircle size={13} className="text-green-400 shrink-0" />}
        {status.type === 'error' && <AlertCircle size={13} className="shrink-0" />}

        {/* Message */}
        <span className="text-xs">
          {status.type === 'checking' && 'Checking for updates…'}
          {status.type === 'available' && `Update ${status.version} available`}
          {status.type === 'downloading' && `Downloading update… ${status.percent}%`}
          {status.type === 'downloaded' && `Update ${status.version} ready to install`}
          {status.type === 'error' && `Update error: ${status.message}`}
        </span>

        {/* Progress bar for downloading */}
        {status.type === 'downloading' && (
          <div className="w-24 h-1 bg-secondary rounded-full overflow-hidden shrink-0">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${status.percent}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        )}

        {/* Actions */}
        {status.type === 'available' && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Download size={10} />
            Download
          </button>
        )}

        {status.type === 'downloaded' && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors shrink-0"
          >
            <RefreshCw size={10} />
            Restart & Install
          </button>
        )}

        {/* Dismiss */}
        {status.type !== 'downloading' && (
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-1"
          >
            <X size={12} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Export a hook for the Settings page to trigger manual update checks
export function useUpdater(): { checkForUpdates: () => void; status: UpdateStatus } {
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })

  const checkForUpdates = (): void => {
    if (!window.electronAPI) return
    setStatus({ type: 'checking' })
    window.electronAPI.updater.check().then(result => setStatus(result as UpdateStatus))
  }

  return { checkForUpdates, status }
}
