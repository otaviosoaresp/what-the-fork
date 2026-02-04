import { ipcMain } from 'electron'
import { getReviewConfigState, setReviewConfig, getRepoReviewConfig, setRepoReviewConfig } from './review-config'
import { getAvailableProviders, reviewBranch, askAboutCode } from './provider-manager'
import type { ReviewConfig, RepoReviewConfig } from './providers/types'

export function registerReviewHandlers(): void {
  ipcMain.handle('review:get-config', async () => {
    return getReviewConfigState()
  })

  ipcMain.handle('review:set-config', async (_event, config: Partial<ReviewConfig>) => {
    setReviewConfig(config)
  })

  ipcMain.handle('review:get-repo-config', async (_event, repoPath: string) => {
    return getRepoReviewConfig(repoPath)
  })

  ipcMain.handle('review:set-repo-config', async (_event, repoPath: string, config: Partial<RepoReviewConfig>) => {
    setRepoReviewConfig(repoPath, config)
  })

  ipcMain.handle('review:get-available-providers', async () => {
    return getAvailableProviders()
  })

  ipcMain.handle('review:branch', async (_event, repoPath: string) => {
    return reviewBranch(repoPath)
  })

  ipcMain.handle('review:ask', async (_event, repoPath: string, code: string, question: string) => {
    return askAboutCode(repoPath, code, question)
  })
}
