import { ipcMain, BrowserWindow } from 'electron'
import Store from 'electron-store'

export function setupWindowIpc(store: Store): void {
  ipcMain.on('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })

  ipcMain.on('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window:close', () => {
    const win = BrowserWindow.getFocusedWindow()
    const minimizeToTray = store.get('minimizeToTray', false) as boolean
    if (minimizeToTray) {
      win?.hide()
    } else {
      win?.close()
    }
  })

  ipcMain.handle('window:isMaximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false
  })

  ipcMain.on('window:setMinimizeToTray', (_, value: boolean) => {
    store.set('minimizeToTray', value)
  })
}
