import type { ElectronAPI } from '../preload/index'

declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_VERSION: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  interface Window {
    api: ElectronAPI
  }
}
