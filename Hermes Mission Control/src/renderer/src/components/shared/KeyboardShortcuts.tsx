import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutGroup {
  label: string
  shortcuts: Shortcut[]
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    label: 'Global',
    shortcuts: [
      { keys: ['Ctrl', 'K'],        description: 'Command palette' },
      { keys: ['Ctrl', 'G'],        description: 'Global search' },
      { keys: ['Ctrl', 'Shift', 'H'], description: 'Show / hide window' },
      { keys: ['Ctrl', '?'],        description: 'Keyboard shortcuts' }
    ]
  },
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', '1'],        description: 'Dashboard' },
      { keys: ['Ctrl', '2'],        description: 'Chat' },
      { keys: ['Ctrl', '3'],        description: 'Memory' },
      { keys: ['Ctrl', '4'],        description: 'Skills' },
      { keys: ['Ctrl', '5'],        description: 'Terminal' },
      { keys: ['Ctrl', '6'],        description: 'Files' },
      { keys: ['Ctrl', '7'],        description: 'Jobs' },
      { keys: ['Ctrl', '8'],        description: 'Scheduler' }
    ]
  },
  {
    label: 'Chat',
    shortcuts: [
      { keys: ['Enter'],            description: 'Send message' },
      { keys: ['Shift', 'Enter'],   description: 'New line' },
      { keys: ['Ctrl', 'N'],        description: 'New chat session' },
      { keys: ['Escape'],           description: 'Stop streaming' }
    ]
  },
  {
    label: 'Window',
    shortcuts: [
      { keys: ['Alt', 'F4'],        description: 'Close window' },
      { keys: ['F11'],              description: 'Toggle fullscreen' },
      { keys: ['Ctrl', 'W'],        description: 'Minimize to tray' }
    ]
  }
]

function KeyBadge({ key: k }: { key: string }): JSX.Element {
  return (
    <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-border bg-secondary text-foreground leading-none">
      {k}
    </kbd>
  )
}

interface KeyboardShortcutsProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps): JSX.Element | null {
  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <motion.div
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <Keyboard size={16} className="text-primary" />
                <h2 className="text-sm font-semibold flex-1">Keyboard Shortcuts</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Shortcut grid */}
              <div className="p-5 grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto">
                {SHORTCUTS.map(group => (
                  <div key={group.label}>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      {group.label}
                    </p>
                    <div className="space-y-2">
                      {group.shortcuts.map(shortcut => (
                        <div key={shortcut.description} className="flex items-center justify-between gap-4">
                          <span className="text-xs text-muted-foreground">{shortcut.description}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {shortcut.keys.map((k, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <KeyBadge key={k} />
                                {i < shortcut.keys.length - 1 && (
                                  <span className="text-[10px] text-muted-foreground/50">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
