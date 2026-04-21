import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI?.isMaximized().then(setIsMaximized)
    // Poll for maximize state changes (simplest approach)
    const interval = setInterval(() => {
      window.electronAPI?.isMaximized().then(setIsMaximized)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="titlebar-drag h-9 flex items-center justify-between select-none shrink-0"
      style={{ backgroundColor: 'hsl(var(--sidebar))' }}
    >
      {/* Left: App icon + title */}
      <div className="titlebar-no-drag flex items-center gap-2 px-3 h-full">
        <div className="w-4 h-4 rounded-sm bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-bold leading-none">
          H
        </div>
        <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
          Hermes Mission Control
        </span>
      </div>

      {/* Right: Window controls */}
      <div className="titlebar-no-drag flex items-center h-full">
        <button
          onClick={() => window.electronAPI?.minimize()}
          className={cn(
            'h-9 w-11 flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors'
          )}
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          onClick={() => window.electronAPI?.maximize()}
          className={cn(
            'h-9 w-11 flex items-center justify-center',
            'text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors'
          )}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Maximize2 size={12} /> : <Square size={10} />}
        </button>
        <button
          onClick={() => window.electronAPI?.close()}
          className={cn(
            'h-9 w-11 flex items-center justify-center',
            'text-muted-foreground hover:text-red-400 hover:bg-red-500/20 transition-colors'
          )}
          title="Close"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
