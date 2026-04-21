import { hermesGet, hermesPost } from './client'

export interface Job {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  type?: string
  title?: string
  description?: string
  progress?: number
  created_at?: string
  updated_at?: string
  completed_at?: string
  error?: string
  output?: string
  session_id?: string
}

export interface JobsResponse {
  jobs?: Job[]
  data?: Job[]
}

export async function getJobs(): Promise<Job[]> {
  try {
    const data = await hermesGet<JobsResponse | Job[]>('/api/jobs')
    if (Array.isArray(data)) return data
    return data.jobs ?? data.data ?? []
  } catch {
    return []
  }
}

export async function getJob(id: string): Promise<Job> {
  return hermesGet<Job>(`/api/jobs/${id}`)
}

export async function cancelJob(id: string): Promise<void> {
  await hermesPost(`/api/jobs/${id}/cancel`)
}
