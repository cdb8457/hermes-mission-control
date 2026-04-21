import { useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useConnectionMonitor } from '../../hooks/useConnection'
import TitleBar from './TitleBar'
import Sidebar from './Sidebar'
import { PageTransition } from '../shared/PageTransition'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps): JSX.Element {
  // Start connection monitoring for the whole app lifecycle
  useConnectionMonitor()

  const location = useLocation()

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* Custom titlebar */}
      <TitleBar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Page content with animated transitions */}
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
