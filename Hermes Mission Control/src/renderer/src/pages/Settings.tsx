import { useNavigate } from 'react-router-dom'
import { Settings, Palette, Bell, Keyboard, Wifi, Moon, Sun, Monitor, LogOut, Info } from 'lucide-react'
import { useSettingsStore, ThemeName } from '../store/settings'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'

const themes: { id: ThemeName; label: string; preview: string; dark: boolean }[] = [
  { id: 'mission-dark', label: 'Mission Dark', preview: '#0f1117', dark: true },
  { id: 'mission-light', label: 'Mission Light', preview: '#f8fafc', dark: false },
  { id: 'slate-dark', label: 'Slate Dark', preview: '#111827', dark: true },
  { id: 'slate-light', label: 'Slate Light', preview: '#f8fafc', dark: false },
  { id: 'mono-dark', label: 'Mono Dark', preview: '#0f0f0f', dark: true },
  { id: 'mono-light', label: 'Mono Light', preview: '#fafafa', dark: false },
  { id: 'neon-dark', label: 'Neon Dark', preview: '#0d0a1a', dark: true },
  { id: 'classic-dark', label: 'Classic Dark', preview: '#100d09', dark: true }
]

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-secondary/20">
        <Icon size={14} className="text-primary" />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-secondary border border-border'
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-1'
        )}
      />
    </button>
  )
}

export default function SettingsPage(): JSX.Element {
  const navigate = useNavigate()
  const {
    theme, setTheme, fontSize, setFontSize,
    minimizeToTray, setMinimizeToTray,
    globalHotkey, setGlobalHotkey,
    notifications, setNotifications
  } = useSettingsStore()
  const { profile, setProfile, setStatus } = useConnectionStore()

  const handleDisconnect = (): void => {
    setProfile(null)
    setStatus('disconnected')
    navigate('/connect')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Settings size={18} className="text-primary" />
          <h1 className="text-base font-medium">Settings</h1>
        </div>

        {/* Themes */}
        <Section title="Appearance" icon={Palette}>
          <div>
            <p className="text-xs text-muted-foreground mb-3">Theme</p>
            <div className="grid grid-cols-4 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all',
                    theme === t.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/60 hover:bg-secondary/30'
                  )}
                >
                  <div
                    className="w-full h-8 rounded-md border border-white/10"
                    style={{ background: t.preview }}
                  >
                    <div className="h-full flex items-center justify-center">
                      {t.dark ? <Moon size={10} className="text-white/60" /> : <Sun size={10} className="text-black/40" />}
                    </div>
                  </div>
                  <span className="text-[10px] text-center leading-tight">{t.label}</span>
                  {theme === t.id && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Font Size</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={12}
                max={18}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono w-8 text-center">{fontSize}px</span>
            </div>
          </div>
        </Section>

        {/* Window behavior */}
        <Section title="Window" icon={Monitor}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">Minimize to Tray</p>
                <p className="text-xs text-muted-foreground">
                  Hide to system tray instead of closing when window is closed
                </p>
              </div>
              <Toggle checked={minimizeToTray} onChange={setMinimizeToTray} />
            </div>
          </div>
        </Section>

        {/* Keyboard */}
        <Section title="Keyboard" icon={Keyboard}>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Global Show/Hide Hotkey</p>
            <div className="flex items-center gap-2">
              <input
                value={globalHotkey}
                onChange={(e) => setGlobalHotkey(e.target.value)}
                placeholder="CommandOrControl+Shift+H"
                className="flex-1 px-3 py-2 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Examples: CommandOrControl+Shift+H, Alt+Space, F12
            </p>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={Bell}>
          <div className="space-y-3">
            {[
              { key: 'jobComplete' as const, label: 'Job completed', sub: 'When a background job finishes' },
              { key: 'connectionChange' as const, label: 'Connection changes', sub: 'When Hermes connects or disconnects' },
              { key: 'agentMessage' as const, label: 'Agent messages', sub: 'When the agent sends a response' }
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <Toggle
                  checked={notifications[key]}
                  onChange={(v) => setNotifications({ [key]: v })}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* Connection */}
        <Section title="Connection" icon={Wifi}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{profile?.name ?? 'No connection'}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {profile ? `${profile.useHttps ? 'https' : 'http'}://${profile.host}:${profile.port}` : '—'}
              </p>
            </div>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary/50 transition-all text-muted-foreground hover:text-foreground"
            >
              <LogOut size={13} />
              Change
            </button>
          </div>
          <button
            onClick={() => navigate('/connect')}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Manage connections
          </button>
        </Section>

        {/* About */}
        <Section title="About" icon={Info}>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-xs">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-mono text-xs">Windows</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Built with</span>
              <span className="font-mono text-xs">Electron + React</span>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
