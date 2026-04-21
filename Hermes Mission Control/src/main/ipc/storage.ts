import { ipcMain } from 'electron'

// Use keytar if available (Windows Credential Manager), otherwise fall back to in-memory
let keytar: typeof import('keytar') | null = null

try {
  keytar = require('keytar')
} catch {
  console.warn('keytar not available — credential storage will use memory fallback')
}

const memoryStore = new Map<string, string>()

export function setupStorageIpc(): void {
  ipcMain.handle('storage:get', async (_, service: string, account: string) => {
    if (keytar) {
      return await keytar.getPassword(service, account)
    }
    return memoryStore.get(`${service}:${account}`) ?? null
  })

  ipcMain.handle('storage:set', async (_, service: string, account: string, password: string) => {
    if (keytar) {
      await keytar.setPassword(service, account, password)
      return true
    }
    memoryStore.set(`${service}:${account}`, password)
    return true
  })

  ipcMain.handle('storage:delete', async (_, service: string, account: string) => {
    if (keytar) {
      return await keytar.deletePassword(service, account)
    }
    memoryStore.delete(`${service}:${account}`)
    return true
  })
}
