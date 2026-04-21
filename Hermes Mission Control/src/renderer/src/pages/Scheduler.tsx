import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, Plus, Trash2, Play, Loader2, AlertCircle,
  CheckCircle2, Clock, ToggleLeft, ToggleRight, ChevronDown, ChevronRight
} from 'lucide-react'
import {
  getScheduledTasks, createScheduledTask, updateScheduledTask,
  deleteScheduledTask, runTaskNow, type ScheduledTask
} from '../api/scheduler'
import { useConnectionStore } from '../store/connection'
import { cn } from '../lib/utils'
import { formatRelative } from '../lib/utils'
import { toast } from '../hooks/useToast'
import { FadeIn, StaggerList, StaggerItem } from '../components/shared/PageTransition'

// ─── Cron presets ─────────────────────────────────────────────────────────────
const CRON_PRESETS = [
  { label: 'Every hour',           cron: '0 * * * *' },
  { label: 'Every 6 hours',        cron: '0 */6 * * *' },
  { label: 'Daily at 9 AM',        cron: '0 9 * * *' },
  { label: 'Daily at midnight',    cron: '0 0 * * *' },
  { label: 'Weekdays at 9 AM',     cron: '0 9 * * 1-5' },
  { label: 'Monday mornings',      cron: '0 9 * * 1' },
  { label: 'Weekly (Sunday midnight)', cron: '0 0 * * 0' },
  { label: 'Every 30 minutes',     cron: '*/30 * * * *' }
]

function cronToLabel(cron: string): string {
  return CRON_PRESETS.find(p => p.cron === cron)?.label ?? cron
}

// ─── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task }: { task: ScheduledTask }): JSX.Element {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const toggleMutation = useMutation({
    mutationFn: () => updateScheduledTask(task.id, { enabled: !task.enabled }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['scheduler'] }) },
    onError: () => toast({ title: 'Failed to toggle task', variant: 'destructive' })
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteScheduledTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler'] })
      toast({ title: 'Task deleted' })
    },
    onError: () => toast({ title: 'Failed to delete task', variant: 'destructive' })
  })

  const runMutation = useMutation({
    mutationFn: () => runTaskNow(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      toast({ title: 'Task triggered — check Jobs page' })
    },
    onError: () => toast({ title: 'Failed to run task', variant: 'destructive' })
  })

  return (
    <div className={cn(
      'border border-border rounded-xl bg-card overflow-hidden transition-all',
      !task.enabled && 'opacity-60'
    )}>
      <div className="flex items-center gap-3 p-4">
        {/* Toggle */}
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title={task.enabled ? 'Disable' : 'Enable'}
        >
          {toggleMutation.isPending
            ? <Loader2 size={18} className="animate-spin" />
            : task.enabled
              ? <ToggleRight size={18} className="text-primary" />
              : <ToggleLeft size={18} />
          }
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{task.name}</p>
            {task.run_count > 0 && (
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {task.run_count} run{task.run_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={9} />
              {cronToLabel(task.schedule)}
            </span>
            {task.next_run && (
              <span className="text-xs text-muted-foreground/60">
                next: {formatRelative(task.next_run)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Run now"
          >
            {runMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          </button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
            title="Delete"
          >
            {deleteMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prompt</p>
            <p className="text-xs text-foreground/80 font-mono bg-background/50 rounded-lg p-2 leading-relaxed">
              {task.prompt}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Model</p>
              <p className="font-mono">{task.model}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Schedule</p>
              <p className="font-mono">{task.schedule}</p>
            </div>
          </div>
          {task.last_result && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last result</p>
              <p className="text-xs text-muted-foreground bg-background/50 rounded-lg p-2 line-clamp-3 font-mono">
                {task.last_result}
              </p>
              {task.last_run && (
                <p className="text-[10px] text-muted-foreground/60 mt-1">{formatRelative(task.last_run)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────
interface CreateFormProps {
  onClose: () => void
}

function CreateForm({ onClose }: CreateFormProps): JSX.Element {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    prompt: '',
    model: 'claude-opus-4-6',
    schedule: '0 9 * * *',
    customCron: false,
    customCronValue: ''
  })

  const createMutation = useMutation({
    mutationFn: () => createScheduledTask({
      name: form.name,
      prompt: form.prompt,
      model: form.model,
      schedule: form.customCron ? form.customCronValue : form.schedule,
      schedule_label: form.customCron ? form.customCronValue : cronToLabel(form.schedule),
      enabled: true,
      run_count: 0
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler'] })
      toast({ title: 'Task scheduled' })
      onClose()
    },
    onError: () => toast({ title: 'Failed to create task', variant: 'destructive' })
  })

  return (
    <div className="mx-6 mt-3 mb-1 p-4 rounded-xl border border-primary/20 bg-primary/5 shrink-0">
      <h3 className="text-sm font-medium mb-4">New Scheduled Task</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Task name</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Daily briefing"
            className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Prompt to run</label>
          <textarea
            value={form.prompt}
            onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
            placeholder="Summarize any pending tasks and give me a brief status update..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Model</label>
            <input
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              <span>Schedule</span>
              <button
                onClick={() => setForm(f => ({ ...f, customCron: !f.customCron }))}
                className="ml-2 text-primary hover:underline"
              >
                {form.customCron ? 'use preset' : 'custom cron'}
              </button>
            </label>
            {form.customCron ? (
              <input
                value={form.customCronValue}
                onChange={e => setForm(f => ({ ...f, customCronValue: e.target.value }))}
                placeholder="*/30 * * * *"
                className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            ) : (
              <select
                value={form.schedule}
                onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border bg-input border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {CRON_PRESETS.map(p => (
                  <option key={p.cron} value={p.cron}>{p.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-secondary/50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!form.name.trim() || !form.prompt.trim() || createMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {createMutation.isPending
              ? <Loader2 size={11} className="animate-spin" />
              : <CheckCircle2 size={11} />
            }
            Schedule Task
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function SchedulerPage(): JSX.Element {
  const { status } = useConnectionStore()
  const [showCreate, setShowCreate] = useState(false)

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['scheduler'],
    queryFn: getScheduledTasks,
    enabled: status === 'connected',
    refetchInterval: 10_000
  })

  const enabledCount = tasks.filter(t => t.enabled).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
          <Calendar size={18} className="text-primary" />
          <h1 className="text-base font-medium flex-1">Scheduler</h1>
          {enabledCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {enabledCount} active
            </span>
          )}
          <button
            onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-all"
          >
            <Plus size={12} />
            New Task
          </button>
        </div>
      </FadeIn>

      {/* Create form */}
      {showCreate && <CreateForm onClose={() => setShowCreate(false)} />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-muted-foreground animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle size={24} className="text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Scheduler API not available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your Hermes gateway may not support scheduled tasks
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar size={32} className="text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-1">No scheduled tasks</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Automate recurring prompts — daily briefings, status updates, or anything on a schedule
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
            >
              <Plus size={14} />
              Create first task
            </button>
          </div>
        ) : (
          <StaggerList className="space-y-2">
            {tasks.map(task => (
              <StaggerItem key={task.id}>
                <TaskCard task={task} />
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  )
}
