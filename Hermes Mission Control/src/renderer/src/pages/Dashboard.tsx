import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  MessageSquare, Brain, Zap, Activity, Wifi, WifiOff,
  Plus, ArrowRight, RefreshCw, Server, Loader2
} from 'lucide-react'
import { useConnectionStore } from '../store/connection'
import { useChatStore } from '../store/chat'
import { getMemory } from '../api/memory'
import { getSkills } from '../api/skills'
import { getJobs } from '../api/jobs'
import { cn } from '../lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  sub?: string
  color?: string
  loading?: boolean
  onClick?: () => void
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary', loading, onClick }: StatCardProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'bg-card border border-border rounded-xl p-4 text-left transition-all',
        onClick ? 'hover:border-primary/40 hover:bg-card/80 cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg bg-background', color)}>
          <Icon size={16} />
        </div>
        {loading && <Loader2 size={12} className="text-muted-foreground animate-spin mt-1" />}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{loading ? '—' : value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </button>
  )
}

interface LatencyPoint { time: string; value: number }

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { status, latency, profile, features, gatewayVersion } = useConnectionStore()
  const { sessions, createSession, setActiveSession } = useChatStore()
  const [latencyHistory, setLatencyHistory] = useState<LatencyPoint[]>([])

  useEffect(() => {
    if (latency > 0) {
      setLatencyHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), value: latency }])
    }
  }, [latency])

  const { data: memoryItems = [], isLoading: memoryLoading } = useQuery({
    queryKey: ['memory'],
    queryFn: getMemory,
    enabled: features.memory && status === 'connected',
    refetchInterval: 60_000
  })

  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
    enabled: features.skills && status === 'connected',
    staleTime: 300_000
  })

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    enabled: features.jobs && status === 'connected',
    refetchInterval: 5_000
  })

  const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending')
  const recentSessions = sessions.slice(0, 5)

  // Update taskbar progress when jobs change
  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.tray.badge(activeJobs.length)
    if (activeJobs.length > 0) {
      window.electronAPI.taskbar.setProgress(0.5, 'indeterminate')
    } else {
      window.electronAPI.taskbar.setProgress(-1)
    }
  }, [activeJobs.length])

  const handleNewChat = (): void => {
    const id = createSession()
    setActiveSession(id)
    navigate('/chat')
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Mission Control</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile?.name ?? 'No connection'} · {status === 'connected' ? 'Online' : 'Offline'}
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        {/* Offline banner */}
        {status !== 'connected' && (
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-xl border text-sm',
            status === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          )}>
            {status === 'connecting' || status === 'reconnecting'
              ? <Loader2 size={16} className="animate-spin shrink-0" />
              : <WifiOff size={16} className="shrink-0" />}
            <div>
              <p className="font-medium">
                {status === 'connecting' ? 'Connecting to Hermes...' :
                 status === 'reconnecting' ? 'Reconnecting...' : 'Not connected'}
              </p>
              {status === 'error' && (
                <p className="text-xs opacity-80 mt-0.5">Check your connection settings and ensure Hermes is running</p>
              )}
            </div>
            {status === 'error' && (
              <button onClick={() => navigate('/connect')} className="ml-auto text-xs underline hover:no-underline">
                Settings
              </button>
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={MessageSquare} label="Chat Sessions" value={sessions.length}
            color="text-blue-400" onClick={() => navigate('/chat')} />
          <StatCard icon={Brain} label="Memory Items"
            value={features.memory ? memoryItems.length : 'N/A'} loading={memoryLoading}
            color="text-purple-400"
            onClick={features.memory ? () => navigate('/memory') : undefined}
            sub={!features.memory ? 'Not available' : undefined} />
          <StatCard icon={Zap} label="Skills"
            value={features.skills ? skills.length : 'N/A'} loading={skillsLoading}
            color="text-yellow-400"
            onClick={features.skills ? () => navigate('/skills') : undefined}
            sub={!features.skills ? 'Not available' : undefined} />
          <StatCard icon={Activity} label="Active Jobs"
            value={features.jobs ? activeJobs.length : 'N/A'} loading={jobsLoading}
            color="text-green-400"
            onClick={features.jobs ? () => navigate('/jobs') : undefined}
            sub={!features.jobs ? 'Not available' : undefined} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent sessions */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Recent Chats</h2>
              <button onClick={() => navigate('/chat')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                View all <ArrowRight size={10} />
              </button>
            </div>
            {recentSessions.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare size={24} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No chats yet</p>
                <button onClick={handleNewChat} className="mt-2 text-xs text-primary hover:underline">
                  Start a conversation
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {recentSessions.map(session => (
                  <button
                    key={session.id}
                    onClick={() => { setActiveSession(session.id); navigate('/chat') }}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-all text-left group"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <MessageSquare size={12} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{session.title}</p>
                      <p className="text-[11px] text-muted-foreground">{session.messageCount} messages</p>
                    </div>
                    <ArrowRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Gateway info + quick actions */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-medium mb-3">Gateway Status</h2>
              <div className="space-y-2">
                {[
                  { icon: Server, label: 'Gateway', value: status === 'connected' ? 'Online' : 'Offline', valueClass: status === 'connected' ? 'text-green-400' : 'text-muted-foreground' },
                  { icon: Wifi, label: 'Latency', value: latency > 0 ? `${latency}ms` : '—', valueClass: '' },
                  { icon: RefreshCw, label: 'Version', value: gatewayVersion ?? '—', valueClass: 'text-muted-foreground' }
                ].map(({ icon: Icon, label, value, valueClass }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Icon size={13} />{label}</span>
                    <span className={cn('text-xs font-mono', valueClass)}>{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Host</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {profile ? `${profile.host}:${profile.port}` : '—'}
                  </span>
                </div>
              </div>

              {/* Latency sparkline */}
              {latencyHistory.length > 1 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Latency History</p>
                  <div className="flex items-end gap-0.5 h-8">
                    {latencyHistory.map((point, i) => {
                      const maxVal = Math.max(...latencyHistory.map(p => p.value))
                      const height = maxVal > 0 ? Math.round((point.value / maxVal) * 100) : 10
                      return (
                        <div
                          key={i}
                          title={`${point.value}ms`}
                          className={cn('flex-1 rounded-sm', point.value < 50 ? 'bg-green-400/60' : point.value < 150 ? 'bg-yellow-400/60' : 'bg-red-400/60')}
                          style={{ height: `${Math.max(height, 8)}%` }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'New Chat',      icon: Plus,        action: handleNewChat,                     primary: true  },
                { label: 'Memory',        icon: Brain,       action: () => navigate('/memory'),         disabled: !features.memory },
                { label: 'Skills',        icon: Zap,         action: () => navigate('/skills'),         disabled: !features.skills },
                { label: 'Jobs',          icon: Activity,    action: () => navigate('/jobs'),           disabled: !features.jobs }
              ].map(({ label, icon: Icon, action, primary, disabled }) => (
                <button
                  key={label}
                  onClick={action}
                  disabled={disabled}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-all',
                    primary ? 'bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20'
                            : 'bg-secondary/50 border border-border hover:bg-secondary text-foreground',
                    disabled && 'opacity-40 pointer-events-none'
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
