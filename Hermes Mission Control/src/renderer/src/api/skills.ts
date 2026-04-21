import { hermesGet, hermesPost, hermesPut, hermesDelete } from './client'

export interface SkillParameter {
  name: string
  type: string
  description: string
  required: boolean
}

export interface Skill {
  id?: string
  name: string
  description?: string
  category?: string
  tags?: string[]
  parameters?: Record<string, unknown>
  parameterList?: SkillParameter[]
  enabled?: boolean
}

export interface SkillsResponse {
  skills?: Skill[]
  data?: Skill[]
}

export async function getSkills(): Promise<Skill[]> {
  try {
    const data = await hermesGet<SkillsResponse | Skill[]>('/api/skills')
    if (Array.isArray(data)) return data
    return data.skills ?? data.data ?? []
  } catch {
    return []
  }
}

export async function createSkill(skill: Omit<Skill, 'id'>): Promise<Skill> {
  return hermesPost<Skill>('/api/skills', skill)
}

export async function updateSkill(id: string, skill: Partial<Skill>): Promise<Skill> {
  return hermesPut<Skill>(`/api/skills/${id}`, skill)
}

export async function deleteSkill(id: string): Promise<void> {
  return hermesDelete(`/api/skills/${id}`)
}
