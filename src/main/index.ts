import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from 'electron'
import path from 'path'
import { getDatabase, closeDatabase } from './database/index'
import { registerIpcHandlers } from './ipc/handlers'
import { timeTrackingService } from './services/timeTrackingService'
import { seedDatabase } from './database/seed'
import { IPC_CHANNELS } from '@shared/types'

let topbarWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTrayIcon(): nativeImage {
  const size = 22
  const canvas = Buffer.alloc(size * size * 4, 0)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2
      const cy = y - size / 2
      const r = Math.sqrt(cx * cx + cy * cy)
      const idx = (y * size + x) * 4

      if (r >= 8 && r <= 10) {
        canvas[idx] = 0; canvas[idx + 1] = 0; canvas[idx + 2] = 0; canvas[idx + 3] = 255
      }
      if (x >= 10 && x <= 11 && y >= 4 && y <= 11) {
        canvas[idx] = 0; canvas[idx + 1] = 0; canvas[idx + 2] = 0; canvas[idx + 3] = 255
      }
      if (y >= 10 && y <= 11 && x >= 11 && x <= 17) {
        canvas[idx] = 0; canvas[idx + 1] = 0; canvas[idx + 2] = 0; canvas[idx + 3] = 255
      }
    }
  }

  const img = nativeImage.createFromBuffer(canvas, { width: size, height: size })
  img.setTemplateImage(true)
  return img
}

function createTopbarWindow(): void {
  if (topbarWindow) {
    topbarWindow.show()
    topbarWindow.focus()
    return
  }

  const display = screen.getPrimaryDisplay()
  const { width: screenWidth } = display.workAreaSize
  const barWidth = Math.min(screenWidth, 1200)
  const barHeight = 52
  const xPos = Math.round((screenWidth - barWidth) / 2)

  topbarWindow = new BrowserWindow({
    width: barWidth,
    height: barHeight,
    x: xPos,
    y: 0,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: true,
    transparent: true,
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    topbarWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/topbar`)
  } else {
    topbarWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/topbar' })
  }

  topbarWindow.once('ready-to-show', () => {
    topbarWindow?.show()
  })

  topbarWindow.on('closed', () => {
    topbarWindow = null
  })
}

function createDashboardWindow(): void {
  if (dashboardWindow) {
    dashboardWindow.focus()
    return
  }

  dashboardWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'under-window',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    dashboardWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}#/dashboard`)
  } else {
    dashboardWindow.loadFile(path.join(__dirname, '../renderer/index.html'), { hash: '/dashboard' })
  }

  dashboardWindow.once('ready-to-show', () => {
    dashboardWindow?.show()
  })

  dashboardWindow.on('closed', () => {
    dashboardWindow = null
  })
}

function setupTray(): void {
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('TimeDock')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Topbar', click: () => createTopbarWindow() },
    { label: 'Dashboard', click: () => createDashboardWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (topbarWindow?.isVisible()) {
      topbarWindow.hide()
    } else {
      createTopbarWindow()
    }
  })
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  getDatabase()
  seedDatabase()
  registerIpcHandlers()

  ipcMain.handle(IPC_CHANNELS.OPEN_DASHBOARD, () => {
    createDashboardWindow()
    return true
  })

  ipcMain.handle(IPC_CHANNELS.CLOSE_TRAY_POPUP, () => {
    topbarWindow?.hide()
    return true
  })

  setupTray()
  timeTrackingService.restoreSession()

  // Launch the topbar on startup
  createTopbarWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})

app.on('activate', () => {
  createTopbarWindow()
})
