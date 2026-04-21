import type { ElectronBridgeAPI } from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronBridgeAPI
    electron: unknown
  }
}

export {}
