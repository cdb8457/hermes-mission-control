import { Tray, Menu, nativeImage, BrowserWindow, app, Notification } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/tray-icon.png')

  // Fallback to a generated icon if file not found
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Hermes Mission Control')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Hermes Mission Control',
      enabled: false,
      icon: icon.resize({ width: 16, height: 16 })
    },
    { type: 'separator' },
    {
      label: 'Show Mission Control',
      click: (): void => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: 'New Chat',
      click: (): void => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('nav:newChat')
      }
    },
    {
      label: 'Dashboard',
      click: (): void => {
        mainWindow.show()
        mainWindow.focus()
        mainWindow.webContents.send('nav:dashboard')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  // Left-click shows/hides window
  tray.on('click', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export function showTrayNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title,
    body,
    icon: join(__dirname, '../../resources/icon.ico'),
    silent: false
  })
  notification.on('click', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length > 0) {
      windows[0].show()
      windows[0].focus()
    }
  })
  notification.show()
}

export function updateTrayBadge(count: number): void {
  if (tray) {
    const tooltip = count > 0
      ? `Hermes Mission Control — ${count} active job${count > 1 ? 's' : ''}`
      : 'Hermes Mission Control'
    tray.setToolTip(tooltip)
  }
}
