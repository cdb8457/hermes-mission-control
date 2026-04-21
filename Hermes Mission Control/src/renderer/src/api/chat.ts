import { hermesGet, hermesPost, hermesDelete, hermesStream } from './client'

export interface Session {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  model?: string
}

export interface Model {
  id: string
  object: string
  created?: number
  owned_by?: string
}

export async function getSessions(): Promise<Session[]> {
  try {
    const data = await hermesGet<{ sessions: Session[] } | Session[]>('/api/sessions')
    return Array.isArray(data) ? data : data.sessions ?? []
  } catch {
    return []
  }
}

export async function createSession(title?: string): Promise<Session> {
  return hermesPost<Session>('/api/sessions', { title: title ?? 'New Chat' })
}

export async function deleteSession(id: string): Promise<void> {
  await hermesDelete(`/api/sessions/${id}`)
}

export async function getModels(): Promise<Model[]> {
  try {
    const data = await hermesGet<{ data: Model[] }>('/v1/models')
    return data.data ?? []
  } catch {
    return []
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream: boolean
  session_id?: string
  max_tokens?: number
  temperature?: number
}

// Stream chat completion — yields parsed delta chunks
export async function* streamChatCompletion(
  request: ChatCompletionRequest,
  signal: AbortSignal
): AsyncGenerator<{
  content?: string
  toolCall?: { name: string; input: string; id: string }
  done?: boolean
  error?: string
}> {
  try {
    for await (const raw of hermesStream('/v1/chat/completions', request, signal)) {
      try {
        const parsed = JSON.parse(raw)
        const choice = parsed.choices?.[0]
        if (!choice) continue

        const delta = choice.delta
        if (!delta) continue

        if (choice.finish_reason) {
          yield { done: true }
          return
        }

        if (delta.content) {
          yield { content: delta.content }
        }

        // Tool call delta
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.function) {
              yield {
                toolCall: {
                  id: tc.id ?? tc.index?.toString() ?? '0',
                  name: tc.function.name ?? '',
                  input: tc.function.arguments ?? ''
                }
              }
            }
          }
        }
      } catch {
        // Skip malformed chunks
      }
    }
    yield { done: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      yield { done: true }
    } else {
      yield { error: error instanceof Error ? error.message : 'Stream error' }
    }
  }
}
