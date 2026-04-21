import { ipcMain } from 'electron'
import { net } from 'electron'

interface DiscoveredHost {
  host: string
  port: number
  latency: number
}

/**
 * Fast parallel LAN scanner — probes a /24 subnet for Hermes gateways.
 * Uses Electron's net module (respects system proxy settings).
 * Concurrency limited to 32 parallel requests to avoid flooding the network.
 */
async function probeHost(host: string, port: number): Promise<DiscoveredHost | null> {
  return new Promise(resolve => {
    const start = Date.now()
    const timeout = 800 // ms — fast timeout for LAN scanning

    const request = net.request({
      method: 'GET',
      protocol: 'http:',
      hostname: host,
      port,
      path: '/health'
    })

    let resolved = false
    const done = (result: DiscoveredHost | null): void => {
      if (!resolved) {
        resolved = true
        resolve(result)
      }
    }

    const timer = setTimeout(() => done(null), timeout)

    request.on('response', (response) => {
      clearTimeout(timer)
      if (response.statusCode === 200) {
        done({ host, port, latency: Date.now() - start })
      } else {
        done(null)
      }
      // Drain response body
      response.on('data', () => {})
      response.on('end', () => {})
    })

    request.on('error', () => {
      clearTimeout(timer)
      done(null)
    })

    try {
      request.end()
    } catch {
      clearTimeout(timer)
      done(null)
    }
  })
}

async function scanSubnet(subnet: string, port: number): Promise<DiscoveredHost[]> {
  // Extract base from e.g. "192.168.1" or "192.168.1.0/24"
  const base = subnet.replace(/\.\d+\/\d+$/, '').replace(/\.\d+$/, '')
  const hosts: string[] = []

  for (let i = 1; i <= 254; i++) {
    hosts.push(`${base}.${i}`)
  }

  const results: DiscoveredHost[] = []
  const CONCURRENCY = 32

  for (let i = 0; i < hosts.length; i += CONCURRENCY) {
    const batch = hosts.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(h => probeHost(h, port)))
    for (const r of batchResults) {
      if (r) results.push(r)
    }
  }

  // Sort by latency
  return results.sort((a, b) => a.latency - b.latency)
}

export function setupScannerHandlers(): void {
  ipcMain.handle('scanner:scan', async (_, subnet: string, port: number) => {
    return scanSubnet(subnet, port)
  })
}
