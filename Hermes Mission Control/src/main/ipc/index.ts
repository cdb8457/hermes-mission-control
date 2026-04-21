import { ipcMain, BrowserWindow, app } from 'electron'
import Store from 'electron-store'
import { showTrayNotification, updateTrayBadge } from '../tray'
import { setupWindowIpc } from './window'
import { setupStorageIpc } from './storage'
import { setupConnectionIpc } from './connection'
import { setupScannerHandlers } from './scanner'

export function setupIpcHandlers(store: Store): void {
  setupWindowIpc(store)
  setupStorageIpc()
  setupConnectionIpc(store)
  setupScannerHandlers()

  // Notifications
  ipcMain.on('notification:show', (_, { title, body }: { title: string; body: string }) => {
    showTrayNotification(title, body)
  })

  // Tray badge
  ipcMain.on('tray:badge', (_, count: number) => {
    updateTrayBadge(count)
  })

  // Taskbar progress
  ipcMain.on('taskbar:progress', (_, { value, mode }: { value: number; mode?: string }) => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.setProgressBar(value, { mode: (mode as Electron.ProgressBarOptions['mode']) || 'normal' })
    }
  })

  // App info
  ipcMain.handle('app:getPath', (_, name: string) => {
    return app.getPath(name as Parameters<typeof app.getPath>[0])
  })
}
