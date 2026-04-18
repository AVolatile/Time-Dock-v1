import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } from 'electron'
import type { NativeImage, Rectangle } from 'electron'
import path from 'path'
import { getDatabase, closeDatabase } from './database/index'
import { registerIpcHandlers } from './ipc/handlers'
import { timeTrackingService } from './services/timeTrackingService'
import { seedDatabase } from './database/seed'
import { IPC_CHANNELS } from '@shared/types'

let topbarWindow: BrowserWindow | null = null
let dashboardWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

const WIDGET_COMPACT_WIDTH = 360
const WIDGET_COMPACT_HEIGHT = 54
const WIDGET_OVERLAY_HEIGHT = 172
const WIDGET_EXPANDED_WIDTH = 720
const WIDGET_EXPANDED_HEIGHT = 430
const WIDGET_EDGE_OFFSET = 14
const WIDGET_TOP_OFFSET = 10
let topbarSurfaceOpen = false
let topbarExpanded = false

function dashboardSuppressesTopbar(): boolean {
  return Boolean(
    dashboardWindow &&
    !dashboardWindow.isDestroyed() &&
    dashboardWindow.isVisible() &&
    !dashboardWindow.isMinimized()
  )
}

function getTopbarBounds(): Rectangle {
  const display = topbarWindow
    ? screen.getDisplayMatching(topbarWindow.getBounds())
    : screen.getPrimaryDisplay()
  const { x, y, width, height } = display.workArea

  const targetWidth = topbarExpanded ? WIDGET_EXPANDED_WIDTH : WIDGET_COMPACT_WIDTH
  const targetHeight = topbarExpanded
    ? WIDGET_EXPANDED_HEIGHT
    : topbarSurfaceOpen
    ? WIDGET_OVERLAY_HEIGHT
    : WIDGET_COMPACT_HEIGHT
  const widgetWidth = Math.min(targetWidth, Math.max(280, width - WIDGET_EDGE_OFFSET * 2))
  const widgetHeight = Math.min(targetHeight, Math.max(WIDGET_COMPACT_HEIGHT, height - WIDGET_TOP_OFFSET * 2))

  return {
    x: Math.round(x + width - widgetWidth - WIDGET_EDGE_OFFSET),
    y: y + WIDGET_TOP_OFFSET,
    width: widgetWidth,
    height: widgetHeight
  }
}

function updateTopbarBounds(): void {
  if (!topbarWindow || topbarWindow.isDestroyed()) return
  topbarWindow.setBounds(getTopbarBounds(), false)
}

function setTopbarSurfaceOpen(open: boolean): void {
  topbarSurfaceOpen = open
  updateTopbarBounds()
}

function setTopbarMinimized(minimized: boolean): void {
  topbarExpanded = !minimized
  if (!topbarExpanded) topbarSurfaceOpen = false
  updateTopbarBounds()
}

function setTopbarExpanded(expanded: boolean): void {
  topbarExpanded = expanded
  if (expanded) topbarSurfaceOpen = false
  updateTopbarBounds()
}

function hideTopbarForDashboard(): void {
  topbarSurfaceOpen = false
  topbarExpanded = false
  if (!topbarWindow || topbarWindow.isDestroyed()) return
  updateTopbarBounds()
  topbarWindow.hide()
}

function restoreTopbarIfAvailable(): void {
  if (isQuitting || dashboardSuppressesTopbar()) return
  createTopbarWindow({ focus: false })
}

function createTrayIcon(): NativeImage {
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

function createTopbarWindow({ focus = true }: { focus?: boolean } = {}): void {
  if (dashboardSuppressesTopbar()) {
    hideTopbarForDashboard()
    return
  }

  if (topbarWindow) {
    setTopbarSurfaceOpen(false)
    if (focus) {
      topbarWindow.show()
      topbarWindow.focus()
    } else {
      topbarWindow.showInactive()
    }
    return
  }

  const bounds = getTopbarBounds()

  topbarWindow = new BrowserWindow({
    ...bounds,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: false,
    skipTaskbar: true,
    hasShadow: false,
    transparent: true,
    roundedCorners: false,
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
    if (dashboardSuppressesTopbar()) {
      topbarWindow?.hide()
    } else if (focus) {
      topbarWindow?.show()
      topbarWindow?.focus()
    } else {
      topbarWindow?.showInactive()
    }
  })

  topbarWindow.on('closed', () => {
    topbarWindow = null
  })
}

function createDashboardWindow(): void {
  if (dashboardWindow) {
    if (dashboardWindow.isMinimized()) dashboardWindow.restore()
    dashboardWindow.show()
    dashboardWindow.focus()
    hideTopbarForDashboard()
    return
  }

  hideTopbarForDashboard()

  dashboardWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'under-window',
    backgroundColor: '#f4f3ef',
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
    hideTopbarForDashboard()
  })

  dashboardWindow.on('minimize', () => {
    restoreTopbarIfAvailable()
  })

  dashboardWindow.on('restore', () => {
    hideTopbarForDashboard()
  })

  dashboardWindow.on('show', () => {
    hideTopbarForDashboard()
  })

  dashboardWindow.on('focus', () => {
    hideTopbarForDashboard()
  })

  dashboardWindow.on('closed', () => {
    dashboardWindow = null
    restoreTopbarIfAvailable()
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
    if (dashboardSuppressesTopbar()) {
      dashboardWindow?.focus()
      return
    }

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
    return { success: true, data: true }
  })

  ipcMain.handle(IPC_CHANNELS.CLOSE_TRAY_POPUP, () => {
    topbarWindow?.hide()
    return { success: true, data: true }
  })

  ipcMain.handle(IPC_CHANNELS.SET_TOPBAR_MENU_OPEN, (_event, open: boolean) => {
    setTopbarSurfaceOpen(open)
    return { success: true, data: true }
  })

  ipcMain.handle(IPC_CHANNELS.SET_TOPBAR_MINIMIZED, (_event, minimized: boolean) => {
    setTopbarMinimized(minimized)
    return { success: true, data: true }
  })

  ipcMain.handle(IPC_CHANNELS.SET_TOPBAR_EXPANDED, (_event, expanded: boolean) => {
    setTopbarExpanded(expanded)
    return { success: true, data: true }
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
  isQuitting = true
  closeDatabase()
})

app.on('activate', () => {
  createTopbarWindow()
})
