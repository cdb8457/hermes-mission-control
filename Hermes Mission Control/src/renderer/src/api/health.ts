export interface HealthResponse {
  status?: string
  version?: string
  uptime?: number
  model?: string
  provider?: string
}

export async function getHealth(baseUrl: string, headers: Record<string, string>): Promise<HealthResponse> {
  const res = await fetch(`${baseUrl}/api/health`, {
    headers,
    signal: AbortSignal.timeout(5000)
  })

  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status}`)
  }

  try {
    return await res.json()
  } catch {
    return { status: 'ok' }
  }
}
