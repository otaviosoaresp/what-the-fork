import { ipcMain } from 'electron'
import { generateCommitMessage, testConnection } from './openrouter'
import { getConfigState, setConfig, clearConfig } from './config'
import type { OpenRouterConfig } from './types'

export function registerAIHandlers(): void {
  ipcMain.handle('ai:generate-commit-message', async (_event, repoPath: string) => {
    return generateCommitMessage(repoPath)
  })

  ipcMain.handle('ai:set-config', async (_event, config: Partial<OpenRouterConfig>) => {
    setConfig(config)
  })

  ipcMain.handle('ai:get-config', async () => {
    return getConfigState()
  })

  ipcMain.handle('ai:clear-config', async () => {
    clearConfig()
  })

  ipcMain.handle('ai:test-connection', async () => {
    return testConnection()
  })
}
