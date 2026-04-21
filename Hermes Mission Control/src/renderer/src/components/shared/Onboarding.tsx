import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wifi, Palette, Zap, CheckCircle2, ChevronRight,
  ArrowRight, Loader2, AlertCircle
} from 'lucide-react'
import { useSettingsStore, type ThemeName } from '../../store/settings'
import { getHealth } from '../../api/health'
import { cn } from '../../lib/utils'

const STORAGE_KEY = 'hermes-mc-onboarded'

function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch { /* ignore */ }
}

// ─── Step components ─────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface StepConnectProps {
  onNext: (host: string, port: string) => void
}

function StepConnect({ onNext }: StepConnectProps): JSX.Element {
  const [host, setHost] = useState('192.168.1.100')
  const [port, setPort] = useState('8642')
  const [status, setStatus] = useState<TestStatus>('idle')
  const [error, setError] = useState('')
  const [latency, setLatency] = useState(0)

  const testAndNext = async (): Promise<void> => {
    setStatus('testing')
    setError('')
    try {
      const url = `http://${host}:${port}`
      const start = Date.now()
      await getHealth(url, {})
      setLatency(Date.now() - start)
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Connection failed')
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Host / IP
          </label>
          <input
            type="text"
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
            Port
          </label>
          <input
            type="number"
            value={port}
            onChange={e => setPort(e.target.value)}
            placeholder="8642"
            className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle2 size={14} />
          <span>Connected! Latency: {latency}ms</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={14} />
          <span>{error || 'Connection failed'}</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={testAndNext}
          disabled={status === 'testing' || !host}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-secondary/50 transition-all disabled:opacity-50"
        >
          {status === 'testing' ? <Loader2 size={14} className="animate-spin" /> : null}
          Test Connection
        </button>
        <button
          onClick={() => onNext(host, port)}
          disabled={!host}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          Continue <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

const THEME_PREVIEWS: { name: ThemeName; label: string; primary: string; bg: string }[] = [
  { name: 'mission-dark',  label: 'Mission Dark',  primary: '#3b82f6', bg: '#0f1117' },
  { name: 'mission-light', label: 'Mission Light', primary: '#3b82f6', bg: '#f8faff' },
  { name: 'slate-dark',    label: 'Slate Dark',    primary: '#6366f1', bg: '#0f172a' },
  { name: 'slate-light',   label: 'Slate Light',   primary: '#6366f1', bg: '#f1f5f9' },
  { name: 'mono-dark',     label: 'Terminal',      primary: '#22c55e', bg: '#0a0f0a' },
  { name: 'neon-dark',     label: 'Neon',          primary: '#a855f7', bg: '#08010f' },
  { name: 'classic-dark',  label: 'Classic',       primary: '#f59e0b', bg: '#1a1200' },
  { name: 'mono-light',    label: 'Paper',         primary: '#374151', bg: '#fafaf8' }
]

interface StepThemeProps {
  onNext: () => void
}

function StepTheme({ onNext }: StepThemeProps): JSX.Element {
  const { theme, setTheme } = useSettingsStore()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {THEME_PREVIEWS.map(t => (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={cn(
              'relative rounded-xl overflow-hidden border-2 transition-all',
              theme === t.name ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-border/80'
            )}
          >
            <div
              className="h-10 flex items-center justify-center"
              style={{ background: t.bg }}
            >
              <div className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
            </div>
            <div className="px-1 py-1 text-center">
              <p className="text-[9px] text-muted-foreground truncate">{t.label}</p>
            </div>
            {theme === t.name && (
              <div className="absolute top-1 right-1">
                <CheckCircle2 size={10} className="text-primary" />
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
      >
        Looks good! <ChevronRight size={14} />
      </button>
    </div>
  )
}

function StepDone({ onFinish }: { onFinish: () => void }): JSX.Element {
  return (
    <div className="text-center space-y-5">
      <motion.div
        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <CheckCircle2 size={28} className="text-green-400" />
      </motion.div>

      <div>
        <h3 className="text-base font-semibold mb-1">You're all set!</h3>
        <p className="text-sm text-muted-foreground">
          Hermes Mission Control is ready. Start by opening the dashboard or chatting with your agent.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-left text-xs text-muted-foreground">
        {[
          'Ctrl+K — Command palette',
          'Ctrl+G — Global search',
          'Ctrl+Shift+H — Toggle window',
          'Drag files into chat'
        ].map(tip => (
          <div key={tip} className="flex items-center gap-2 bg-secondary/40 rounded-lg px-3 py-2">
            <Zap size={10} className="text-primary shrink-0" />
            {tip}
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
      >
        Launch Mission Control <ArrowRight size={14} />
      </button>
    </div>
  )
}

// ─── Main Onboarding component ────────────────────────────────────────────────

const STEPS = [
  { id: 'connect', icon: Wifi,    title: 'Connect to Hermes',   subtitle: 'Enter your gateway address' },
  { id: 'theme',   icon: Palette, title: 'Choose your theme',    subtitle: 'Pick the look you love' },
  { id: 'done',    icon: Zap,     title: 'Ready to launch',      subtitle: 'Everything is configured' }
]

export function Onboarding(): JSX.Element | null {
  const navigate = useNavigate()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!hasOnboarded()) {
      setShow(true)
    }
  }, [])

  if (!show) return null

  const current = STEPS[step]
  const Icon = current.icon

  const finish = (): void => {
    markOnboarded()
    setShow(false)
    navigate('/connect')
  }

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-center justify-center p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3, ease: 'easeOut' }}
            >
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {STEPS.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      i === step ? 'w-6 h-2 bg-primary' : i < step ? 'w-2 h-2 bg-primary/50' : 'w-2 h-2 bg-border'
                    )}
                  />
                ))}
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                  <Icon size={24} className="text-primary" />
                </div>
                <h2 className="text-xl font-semibold">{current.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 0 && (
                    <StepConnect onNext={(host, port) => {
                      // Store connection hint in localStorage for Connect page
                      try {
                        localStorage.setItem('hermes-mc-onboard-host', host)
                        localStorage.setItem('hermes-mc-onboard-port', port)
                      } catch { /* ignore */ }
                      setStep(1)
                    }} />
                  )}
                  {step === 1 && <StepTheme onNext={() => setStep(2)} />}
                  {step === 2 && <StepDone onFinish={finish} />}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
