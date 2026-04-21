import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wifi, Github, ExternalLink, Heart, Zap, Shield, Terminal } from 'lucide-react'
import { FadeIn, StaggerList, StaggerItem } from '../components/shared/PageTransition'

const FEATURES = [
  { icon: Wifi,     label: 'Real-time SSE Streaming',  desc: 'Live responses with zero lag' },
  { icon: Zap,      label: 'Windows-Native Integration', desc: 'Tray, jump list, protocol handler' },
  { icon: Shield,   label: 'Secure Credential Storage', desc: 'Windows Credential Manager via keytar' },
  { icon: Terminal, label: 'Full Terminal Access',       desc: 'xterm.js WebSocket shell to gateway' }
]

const STACK = [
  'Electron 41',
  'React 18',
  'TypeScript 5',
  'Tailwind CSS 3',
  'Zustand 5',
  'TanStack Query 5',
  'framer-motion',
  'xterm.js',
  'keytar'
]

export default function AboutPage(): JSX.Element {
  const [version, setVersion] = useState('—')

  useEffect(() => {
    window.electronAPI?.app.getVersion().then(setVersion).catch(() => {})
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">

        {/* Hero */}
        <FadeIn>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-5">
              <Wifi size={36} className="text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Hermes Mission Control</h1>
            <p className="text-muted-foreground mt-1">
              The ultimate Windows command center for your Hermes AI agent
            </p>
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-secondary/50 border border-border rounded-full text-xs font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              v{version}
            </div>
          </div>
        </FadeIn>

        {/* Features */}
        <StaggerList className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <StaggerItem key={label}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon size={14} className="text-primary" />
                </div>
                <p className="text-sm font-medium mb-0.5">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerList>

        {/* Tech stack */}
        <FadeIn delay={0.1}>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Built with</p>
            <div className="flex flex-wrap gap-2">
              {STACK.map(tech => (
                <span
                  key={tech}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg bg-secondary border border-border text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={0.15}>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Source files', value: '42+' },
              { label: 'TypeScript errors', value: '0' },
              { label: 'Themes', value: '8' }
            ].map(({ label, value }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <div className="text-2xl font-bold text-primary">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Links */}
        <FadeIn delay={0.2}>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => window.electronAPI?.shell.openExternal('https://github.com/outsourc-e/hermes-workspace')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            >
              <Github size={14} />
              Hermes Project
              <ExternalLink size={11} />
            </button>
          </div>
        </FadeIn>

        {/* Footer */}
        <motion.div
          className="text-center text-xs text-muted-foreground/50 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Made with <Heart size={9} className="inline text-red-400 mx-0.5" /> for the Hermes ecosystem
        </motion.div>
      </div>
    </div>
  )
}
