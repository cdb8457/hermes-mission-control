import { useConnectionStore } from '../store/connection'

export class HermesAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'HermesAPIError'
  }
}

async function getHeaders(): Promise<Record<string, string>> {
  const store = useConnectionStore.getState()
  const authHeaders = await store.getAuthHeaders()
  return {
    'Content-Type': 'application/json',
    ...authHeaders
  }
}

export async function hermesGet<T>(path: string): Promise<T> {
  const baseUrl = useConnectionStore.getState().getBaseUrl()
  if (!baseUrl) throw new HermesAPIError('Not connected to Hermes')

  const headers = await getHeaders()
  const res = await fetch(`${baseUrl}${path}`, { headers })

  if (!res.ok) {
    throw new HermesAPIError(`Request failed: ${res.statusText}`, res.status)
  }

  return res.json()
}

export async function hermesPost<T>(path: string, body?: unknown): Promise<T> {
  const baseUrl = useConnectionStore.getState().getBaseUrl()
  if (!baseUrl) throw new HermesAPIError('Not connected to Hermes')

  const headers = await getHeaders()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new HermesAPIError(`Request failed: ${text}`, res.status)
  }

  return res.json()
}

export async function hermesPut<T>(path: string, body?: unknown): Promise<T> {
  const baseUrl = useConnectionStore.getState().getBaseUrl()
  if (!baseUrl) throw new HermesAPIError('Not connected to Hermes')

  const headers = await getHeaders()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    throw new HermesAPIError(`Request failed: ${res.statusText}`, res.status)
  }

  return res.json()
}

export async function hermesDelete<T>(path: string): Promise<T> {
  const baseUrl = useConnectionStore.getState().getBaseUrl()
  if (!baseUrl) throw new HermesAPIError('Not connected to Hermes')

  const headers = await getHeaders()
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers
  })

  if (!res.ok) {
    throw new HermesAPIError(`Request failed: ${res.statusText}`, res.status)
  }

  return res.json()
}

// SSE Streaming fetch — returns an async generator of parsed data lines
export async function* hermesStream(
  path: string,
  body: unknown,
  signal: AbortSignal
): AsyncGenerator<string> {
  const baseUrl = useConnectionStore.getState().getBaseUrl()
  if (!baseUrl) throw new HermesAPIError('Not connected to Hermes')

  const headers = await getHeaders()

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...headers,
      Accept: 'text/event-stream'
    },
    body: JSON.stringify(body),
    signal
  })

  if (!res.ok) {
    throw new HermesAPIError(`Stream request failed: ${res.statusText}`, res.status)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new HermesAPIError('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          if (data !== '[DONE]') {
            yield data
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// Health check — returns latency in ms or throws
export async function pingHermes(baseUrl: string, headers: Record<string, string>): Promise<number> {
  const start = Date.now()
  const res = await fetch(`${baseUrl}/api/health`, { headers, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return Date.now() - start
}

// Feature discovery — probe which endpoints exist
export async function discoverFeatures(
  baseUrl: string,
  headers: Record<string, string>
): Promise<Record<string, boolean>> {
  const probeEndpoints = [
    ['/api/sessions', 'sessions'],
    ['/api/memory', 'memory'],
    ['/api/skills', 'skills'],
    ['/api/jobs', 'jobs'],
    ['/api/files', 'files'],
    ['/v1/models', 'models']
  ] as const

  const results: Record<string, boolean> = {}

  await Promise.all(
    probeEndpoints.map(async ([endpoint, feature]) => {
      try {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          headers,
          signal: AbortSignal.timeout(3000)
        })
        results[feature] = res.status !== 404 && res.status !== 405
      } catch {
        results[feature] = false
      }
    })
  )

  return results
}
