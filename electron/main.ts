import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import path from 'path'

function getIconPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../../build/icon.png')
  }
  return path.join(__dirname, '../../build/icon.png')
}
import { registerGitHandlers } from './git/ipc-handlers'
import { registerAIHandlers } from './ai/ipc-handlers'
import { registerReviewHandlers } from './ai/review-ipc'
import { registerGitHubHandlers } from './github'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a'
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerGitHandlers()
  registerAIHandlers()
  registerReviewHandlers()
  registerGitHubHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})
