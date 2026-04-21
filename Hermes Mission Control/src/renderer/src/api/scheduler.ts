import { hermesGet, hermesPost, hermesPut, hermesDelete } from './client'

export interface ScheduledTask {
  id: string
  name: string
  prompt: string
  model: string
  schedule: string       // cron expression e.g. "0 9 * * 1-5"
  schedule_label: string // human-readable e.g. "Weekdays at 9 AM"
  enabled: boolean
  last_run?: string
  next_run?: string
  last_result?: string
  run_count: number
  created_at: string
}

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  const data = await hermesGet('/api/scheduler/tasks')
  return Array.isArray(data) ? data : (data?.tasks ?? [])
}

export async function createScheduledTask(task: Partial<ScheduledTask>): Promise<ScheduledTask> {
  return hermesPost('/api/scheduler/tasks', task)
}

export async function updateScheduledTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask> {
  return hermesPut(`/api/scheduler/tasks/${id}`, updates)
}

export async function deleteScheduledTask(id: string): Promise<void> {
  return hermesDelete(`/api/scheduler/tasks/${id}`)
}

export async function runTaskNow(id: string): Promise<{ job_id: string }> {
  return hermesPost(`/api/scheduler/tasks/${id}/run`, {})
}
