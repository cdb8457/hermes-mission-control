import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useConnectionStore } from './store/connection'
import { useSettingsStore } from './store/settings'
import { useChatStore } from './store/chat'
import AppLayout from './components/layout/AppLayout'
import ConnectPage from './pages/Connect'
import DashboardPage from './pages/Dashboard'
import ChatPage from './pages/Chat'
import MemoryPage from './pages/Memory'
import SkillsPage from './pages/Skills'
import TerminalPage from './pages/Terminal'
import FilesPage from './pages/Files'
import JobsPage from './pages/Jobs'
import SettingsPage from './pages/Settings'
import AboutPage from './pages/About'
import SchedulerPage from './pages/Scheduler'
import ConductorPage from './pages/Conductor'
import HermesDashboardPage from './pages/HermesDashboard'
import PluginManagerPage from './pages/PluginManager'
import PluginPage from './pages/PluginPage'
import { Toaster } from './components/ui/toaster'
import { CommandPalette } from './components/shared/CommandPalette'
import { GlobalSearch } from './components/shared/GlobalSearch'
import { KeyboardShortcuts } from './components/shared/KeyboardShortcuts'
import { OfflineQueueBanner } from './components/shared/OfflineQueueBanner'
import { Onboarding } from './components/shared/Onboarding'
import { ErrorBoundary } from './components/shared/ErrorBoundary'
import { useOfflineDrain } from './hooks/useOfflineDrain'
import { UpdateBanner } from './components/shared/UpdateBanner'

function AppInner(): JSX.Element {
  const navigate = useNavigate()
  const { profile, initFromStorage } = useConnectionStore()
  const { theme, fontSize, initSettings } = useSettingsStore()
  const { sessions, createSession, setActiveSession } = useChatStore()

  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Drain offline message queue when connection is restored
  useOfflineDrain()

  useEffect(() => {
    initSettings()
    initFromStorage()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`
  }, [fontSize])

  // Sync jump list whenever sessions change
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.jumplist.update(
      sessions.slice(0, 10).map(s => ({ id: s.id, title: s.title }))
    )
  }, [sessions])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey

      // Command palette — Ctrl+K
      if (mod && e.key === 'k') {
        e.preventDefault()
        setCmdPaletteOpen(prev => !prev)
        return
      }

      // Global search — Ctrl+G
      if (mod && e.key === 'g') {
        e.preventDefault()
        setGlobalSearchOpen(prev => !prev)
        return
      }

      // Keyboard shortcuts — Ctrl+?  or  Ctrl+Shift+/
      if (mod && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault()
        setShortcutsOpen(prev => !prev)
        return
      }

      // Numeric nav — Ctrl+1..8
      if (mod && !e.shiftKey && !e.altKey) {
        const routes = ['/dashboard', '/chat', '/memory', '/skills', '/terminal', '/files', '/jobs', '/scheduler']
        const n = parseInt(e.key)
        if (n >= 1 && n <= 8) {
          e.preventDefault()
          navigate(routes[n - 1])
          return
        }
      }

      // New chat — Ctrl+N
      if (mod && e.key === 'n') {
        e.preventDefault()
        const id = createSession()
        setActiveSession(id)
        navigate('/chat')
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, createSession, setActiveSession])

  // Tray navigation events from main process
  useEffect(() => {
    if (!window.electronAPI) return
    const removeNewChat   = window.electronAPI.on('nav:newChat',   () => { navigate('/chat') })
    const removeDashboard = window.electronAPI.on('nav:dashboard', () => { navigate('/dashboard') })
    return () => { removeNewChat(); removeDashboard() }
  }, [navigate])

  // Deep link navigation (hermes:// protocol + jump list)
  useEffect(() => {
    if (!window.electronAPI) return
    const removeDeepLink = window.electronAPI.on('nav:deepLink', (route: unknown) => {
      const r = String(route)
      if (r === 'chat/new') {
        const id = createSession()
        setActiveSession(id)
        navigate('/chat')
      } else if (r.startsWith('session/')) {
        const sessionId = r.replace('session/', '')
        setActiveSession(sessionId)
        navigate('/chat')
      } else {
        navigate(`/${r}`)
      }
    })
    return () => removeDeepLink()
  }, [navigate, createSession, setActiveSession])

  return (
    <>
      <Onboarding />

      <Routes>
        <Route path="/connect" element={<ConnectPage />} />
        <Route
          path="/*"
          element={
            profile ? (
              <AppLayout>
                <ErrorBoundary>
                  <Routes>
                    <Route path="/dashboard" element={<ErrorBoundary inline={false}><DashboardPage /></ErrorBoundary>} />
                    <Route path="/chat"      element={<ErrorBoundary inline={false}><ChatPage /></ErrorBoundary>} />
                    <Route path="/chat/:sessionId" element={<ErrorBoundary inline={false}><ChatPage /></ErrorBoundary>} />
                    <Route path="/memory"   element={<ErrorBoundary inline={false}><MemoryPage /></ErrorBoundary>} />
                    <Route path="/skills"   element={<ErrorBoundary inline={false}><SkillsPage /></ErrorBoundary>} />
                    <Route path="/terminal" element={<ErrorBoundary inline={false}><TerminalPage /></ErrorBoundary>} />
                    <Route path="/files"    element={<ErrorBoundary inline={false}><FilesPage /></ErrorBoundary>} />
                    <Route path="/jobs"     element={<ErrorBoundary inline={false}><JobsPage /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary inline={false}><SettingsPage /></ErrorBoundary>} />
                    <Route path="/about"     element={<ErrorBoundary inline={false}><AboutPage /></ErrorBoundary>} />
                    <Route path="/scheduler"  element={<ErrorBoundary inline={false}><SchedulerPage /></ErrorBoundary>} />
                    <Route path="/conductor"   element={<ErrorBoundary inline={false}><ConductorPage /></ErrorBoundary>} />
                    <Route path="/hermes-ui"  element={<ErrorBoundary inline={false}><HermesDashboardPage /></ErrorBoundary>} />
                    <Route path="/plugins"    element={<ErrorBoundary inline={false}><PluginManagerPage /></ErrorBoundary>} />
                    <Route path="/plugin/:pluginId" element={<ErrorBoundary inline={false}><PluginPage /></ErrorBoundary>} />
                    <Route path="*"           element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </ErrorBoundary>
              </AppLayout>
            ) : (
              <Navigate to="/connect" replace />
            )
          }
        />
      </Routes>

      <OfflineQueueBanner />
      <UpdateBanner />
      <GlobalSearch open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      <KeyboardShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster />
    </>
  )
}

export default function App(): JSX.Element {
  return <AppInner />
}
