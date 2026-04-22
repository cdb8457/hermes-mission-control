import { ipcMain, safeStorage } from 'electron'
import ElectronStore from 'electron-store'

// Use Electron safeStorage (DPAPI on Windows, Keychain on macOS) to encrypt
// credentials, stored as base64 in electron-store. No native compilation needed.

interface CredentialStore {
  credentials: Record<string, string>
}

const credStore = new ElectronStore<CredentialStore>({
  name: 'credentials',
  defaults: { credentials: {} }
})

function makeKey(service: string, account: string): string {
  return `${service}::${account}`
}

function encrypt(value: string): string | null {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(value).toString('base64')
    }
  } catch { /* fall through */ }
  // Fallback: base64 only (no OS encryption — still better than plaintext in most cases)
  return Buffer.from(value).toString('base64')
}

function decrypt(encoded: string): string | null {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
    }
  } catch { /* fall through */ }
  return Buffer.from(encoded, 'base64').toString('utf8')
}

export function setupStorageIpc(): void {
  ipcMain.handle('storage:get', (_,  service: string, account: string) => {
    const raw = credStore.get('credentials')[makeKey(service, account)]
    if (!raw) return null
    return decrypt(raw)
  })

  ipcMain.handle('storage:set', (_, service: string, account: string, password: string) => {
    const encrypted = encrypt(password)
    if (encrypted === null) return false
    const all = credStore.get('credentials')
    all[makeKey(service, account)] = encrypted
    credStore.set('credentials', all)
    return true
  })

  ipcMain.handle('storage:delete', (_, service: string, account: string) => {
    const all = credStore.get('credentials')
    delete all[makeKey(service, account)]
    credStore.set('credentials', all)
    return true
  })
}
