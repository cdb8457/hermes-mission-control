import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Activity, Loader2, AlertCircle, CheckCircle2,
  XCircle, Clock, StopCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getJobs, cancelJob, type Job } from '../api/jobs'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import { toast } from '../hooks/useToast'

const statusConfig: Record<Job['status'], { icon: LucideIcon; label: string; color: string; bg: string; animate: boolean }> = {
  running:   { icon: Loader2,      label: 'Running',   color: 'text-blue-400',          bg: 'bg-blue-400/10',          animate: true  },
  pending:   { icon: Clock,        label: 'Pending',   color: 'text-yellow-400',        bg: 'bg-yellow-400/10',        animate: false },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-400',         bg: 'bg-green-400/10',         animate: false },
  failed:    { icon: XCircle,      label: 'Failed',    color: 'text-red-400',           bg: 'bg-red-400/10',           animate: false },
  cancelled: { icon: StopCircle,   label: 'Cancelled', color: 'text-muted-foreground',  bg: 'bg-muted',                animate: false }
}

function JobCard({ job }: { job: Job }): JSX.Element {
  const queryClient = useQueryClient()
  const config = statusConfig[job.status] ?? statusConfig.pending
  const Icon = config.icon

  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(job.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['jobs'] }); toast({ title: 'Job cancelled' }) },
    onError: () => toast({ title: 'Failed to cancel job', variant: 'destructive' })
  })

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div className={cn('p-2 rounded-lg shrink-0', config.bg)}>
          <Icon size={14} className={cn(config.color, config.animate && 'animate-spin')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {job.title ?? job.type ?? job.id.slice(0, 8)}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', config.bg, config.color)}>
              {config.label}
            </span>
          </div>
          {job.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{job.description}</p>}

          {job.progress !== undefined && job.status === 'running' && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.round(job.progress * 100)}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress * 100}%` }} />
              </div>
            </div>
          )}
          {job.error && (
            <p className="text-xs text-red-400 mt-1 bg-red-400/10 px-2 py-1 rounded-lg font-mono">{job.error}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            {job.created_at ? formatRelative(job.created_at) : '—'}
          </p>
        </div>
        {(job.status === 'running' || job.status === 'pending') && (
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Cancel job"
          >
            {cancelMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />}
          </button>
        )}
      </div>
      {job.output && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Output</p>
          <pre className="text-xs font-mono text-foreground/70 bg-background/50 p-3 rounded-lg overflow-x-auto max-h-32 overflow-y-auto">
            {job.output}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function JobsPage(): JSX.Element {
  const { features, status } = useConnectionStore()
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all')

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: getJobs,
    enabled: features.jobs && status === 'connected',
    refetchInterval: 3_000
  })

  const filtered = jobs.filter(j => {
    if (filter === 'active') return j.status === 'running' || j.status === 'pending'
    if (filter === 'completed') return j.status === 'completed'
    if (filter === 'failed') return j.status === 'failed'
    return true
  })

  const activeCount = jobs.filter(j => j.status === 'running' || j.status === 'pending').length

  if (!features.jobs) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <Activity size={40} className="text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium mb-1">Jobs Not Available</h2>
        <p className="text-sm text-muted-foreground">Your Hermes gateway doesn't expose the jobs API.</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <Activity size={18} className="text-primary" />
        <h1 className="text-base font-medium flex-1">Jobs</h1>
        {activeCount > 0 && (
          <span className="text-xs bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded-full">{activeCount} active</span>
        )}
      </div>

      <div className="flex gap-1 px-6 py-2 border-b border-border shrink-0">
        {(['all', 'active', 'completed', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all',
              filter === f ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={24} className="text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load jobs</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Activity size={32} className="text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No {filter !== 'all' ? filter : ''} jobs</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </div>
  )
}
