import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wifi, ChevronRight, Plus, Trash2, Star,
  Loader2, CheckCircle2, AlertCircle, Scan, Radio, Clock
} from 'lucide-react'
import { useConnectionStore, type ConnectionProfile } from '../store/connection'
import { getHealth } from '../api/health'
import { cn, generateId } from '../lib/utils'
import TitleBar from '../components/layout/TitleBar'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface DiscoveredHost {
  host: string
  port: number
  latency: number
}

export default function ConnectPage(): JSX.Element {
  const navigate = useNavigate()
  const { profiles, setProfile, setProfiles, setStatus } = useConnectionStore()

  const [showForm, setShowForm] = useState(profiles.length === 0)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError] = useState('')
  const [testLatency, setTestLatency] = useState(0)
  const [form, setForm] = useState({ name: '', host: '192.168.1.100', port: '8642', dashboardPort: '9119', useHttps: false, apiKey: '' })

  // LAN scanner
  const [scanning, setScanning] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredHost[]>([])
  const [scanSubnet, setScanSubnet] = useState('')

  const baseUrl = `${form.useHttps ? 'https' : 'http'}://${form.host}:${form.port}`
  const authHeaders = form.apiKey ? { Authorization: `Bearer ${form.apiKey}` } : {}

  const testConnection = async (): Promise<void> => {
    setTestStatus('testing')
    setTestError('')
    try {
      const start = Date.now()
      await getHealth(baseUrl, authHeaders)
      setTestLatency(Date.now() - start)
      setTestStatus('success')
    } catch (e: unknown) {
      setTestStatus('error')
      setTestError(e instanceof Error ? e.message : 'Connection failed')
    }
  }

  const saveAndConnect = async (): Promise<void> => {
    const profile: ConnectionProfile = {
      id: generateId(),
      name: form.name || `${form.host}:${form.port}`,
      host: form.host,
      port: parseInt(form.port),
      dashboardPort: form.dashboardPort ? parseInt(form.dashboardPort) : 9119,
      useHttps: form.useHttps,
      hasApiKey: !!form.apiKey,
      hasPassword: false,
      isDefault: profiles.length === 0,
      createdAt: new Date().toISOString()
    }

    if (window.electronAPI) {
      if (form.apiKey) {
        await window.electronAPI.storage.set('hermes-mission-control', `${profile.id}:apikey`, form.apiKey)
      }
      await window.electronAPI.connection.saveProfile(profile)
      const updated = await window.electronAPI.connection.getProfiles()
      setProfiles(updated)
    } else {
      setProfiles([...profiles, profile])
    }

    setProfile(profile)
    setStatus('connecting')
    navigate('/dashboard')
  }

  const connectTo = (profile: ConnectionProfile): void => {
    setProfile(profile)
    setStatus('connecting')
    navigate('/dashboard')
  }

  const connectToDiscovered = (host: DiscoveredHost): void => {
    setForm(f => ({ ...f, host: host.host, port: String(host.port) }))
    setShowForm(true)
    setDiscovered([])
  }

  const deleteProfile = async (id: string, e: React.MouseEvent): Promise<void> => {
    e.stopPropagation()
    if (window.electronAPI) {
      await window.electronAPI.connection.deleteProfile(id)
      const updated = await window.electronAPI.connection.getProfiles()
      setProfiles(updated)
    } else {
      setProfiles(profiles.filter(p => p.id !== id))
    }
  }

  const scanLAN = async (): Promise<void> => {
    if (!window.electronAPI) {
      // Fallback: probe a few common IPs from current subnet
      setScanning(true)
      setDiscovered([])
      const base = form.host.split('.').slice(0, 3).join('.')
      const subnet = scanSubnet || base
      const port = parseInt(form.port) || 8642
      const results: DiscoveredHost[] = []

      // Quick probe of common gateway IPs in browser fallback
      const candidates = [1, 100, 101, 150, 200, 254].map(n => `${subnet}.${n}`)
      await Promise.all(candidates.map(async (host) => {
        try {
          const start = Date.now()
          const resp = await fetch(`http://${host}:${port}/health`, { signal: AbortSignal.timeout(800) })
          if (resp.ok) results.push({ host, port, latency: Date.now() - start })
        } catch { /* skip */ }
      }))

      setDiscovered(results.sort((a, b) => a.latency - b.latency))
      setScanning(false)
      return
    }

    setScanning(true)
    setDiscovered([])
    const base = form.host.split('.').slice(0, 3).join('.')
    const subnet = scanSubnet || base
    const port = parseInt(form.port) || 8642

    try {
      const results = await window.electronAPI.scanner.scan(subnet, port)
      setDiscovered(results)
    } catch (e) {
      console.error('LAN scan failed:', e)
    } finally {
      setScanning(false)
    }
  }

  // Auto-detect local subnet for scan default
  const getLocalSubnet = (): string => {
    // Extract subnet from current form host
    const parts = form.host.split('.')
    if (parts.length === 4) return parts.slice(0, 3).join('.') + '.0/24'
    return '192.168.1.0/24'
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
              <Wifi size={28} className="text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Connect to Hermes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your Hermes gateway address to command your agent
            </p>
          </div>

          {/* Saved profiles list */}
          {profiles.length > 0 && !showForm && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Saved Connections</p>
              {profiles.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => connectTo(profile)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card border-border hover:border-primary/40 hover:bg-card/80 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Wifi size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{profile.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {profile.useHttps ? 'https' : 'http'}://{profile.host}:{profile.port}
                    </p>
                  </div>
                  {profile.isDefault && <Star size={12} className="text-yellow-400 shrink-0" />}
                  <button
                    onClick={e => deleteProfile(profile.id, e)}
                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                </button>
              ))}
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-sm"
              >
                <Plus size={14} />
                Add new connection
              </button>
            </div>
          )}

          {/* New connection form */}
          {showForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Connection Name (optional)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Home Server"
                  className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Host / IP</label>
                  <input
                    type="text"
                    value={form.host}
                    onChange={e => setForm({ ...form, host: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">API Port</label>
                  <input
                    type="number"
                    value={form.port}
                    onChange={e => setForm({ ...form, port: e.target.value })}
                    placeholder="8642"
                    className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                  Dashboard Port
                  <span className="ml-2 normal-case font-normal text-muted-foreground/60">(Hermes v0.9 UI — default 9119)</span>
                </label>
                <input
                  type="number"
                  value={form.dashboardPort}
                  onChange={e => setForm({ ...form, dashboardPort: e.target.value })}
                  placeholder="9119"
                  className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Used to embed the Hermes dashboard and llm-wiki directly in Mission Control</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">API Key (optional)</label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={e => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2.5 rounded-lg border bg-input border-border text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Stored securely in Windows Credential Manager</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useHttps"
                  checked={form.useHttps}
                  onChange={e => setForm({ ...form, useHttps: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="useHttps" className="text-sm text-muted-foreground">Use HTTPS</label>
              </div>

              {/* Test result */}
              {testStatus !== 'idle' && (
                <div className={cn(
                  'flex items-center gap-2 p-3 rounded-lg text-sm border',
                  testStatus === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : '',
                  testStatus === 'error'   ? 'bg-red-500/10   text-red-400   border-red-500/20'   : '',
                  testStatus === 'testing' ? 'bg-muted text-muted-foreground border-border'        : ''
                )}>
                  {testStatus === 'testing' && <Loader2 size={14} className="animate-spin" />}
                  {testStatus === 'success' && <CheckCircle2 size={14} />}
                  {testStatus === 'error'   && <AlertCircle  size={14} />}
                  <span>
                    {testStatus === 'testing' && 'Testing connection...'}
                    {testStatus === 'success' && `Connected! Latency: ${testLatency}ms`}
                    {testStatus === 'error'   && (testError || 'Connection failed')}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Connecting to: <span className="font-mono text-foreground">{baseUrl}</span>
              </p>

              <div className="flex gap-2">
                {profiles.length > 0 && (
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary/50 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={testConnection}
                  disabled={testStatus === 'testing' || !form.host}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary/50 transition-all disabled:opacity-50"
                >
                  Test
                </button>
                <button
                  onClick={saveAndConnect}
                  disabled={!form.host}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Connect <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* LAN Scanner */}
          <div className="mt-6 border border-border rounded-xl overflow-hidden">
            <button
              onClick={scanLAN}
              disabled={scanning}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className={cn(
                'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                scanning ? 'bg-blue-400/10' : 'bg-secondary'
              )}>
                {scanning
                  ? <Loader2 size={14} className="text-blue-400 animate-spin" />
                  : <Scan size={14} className="text-muted-foreground" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {scanning ? 'Scanning local network…' : 'Scan for Hermes on local network'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scanning ? `Probing ${getLocalSubnet()}` : `Auto-discover gateways on ${getLocalSubnet()}`}
                </p>
              </div>
              {!scanning && <Radio size={14} className="text-muted-foreground" />}
            </button>

            {/* Scan results */}
            {discovered.length > 0 && (
              <div className="border-t border-border">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                  Found {discovered.length} gateway{discovered.length !== 1 ? 's' : ''}
                </p>
                {discovered.map(host => (
                  <button
                    key={`${host.host}:${host.port}`}
                    onClick={() => connectToDiscovered(host)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors border-t border-border/50 text-left group"
                  >
                    <div className="w-7 h-7 rounded-md bg-green-400/10 flex items-center justify-center shrink-0">
                      <Wifi size={12} className="text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono">{host.host}:{host.port}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock size={10} />
                      <span>{host.latency}ms</span>
                    </div>
                    <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* No results after scan */}
            {!scanning && discovered.length === 0 && (
              <div className="border-t border-border px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">
                  Click above to scan your local network for Hermes gateways
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
