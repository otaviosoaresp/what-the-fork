import { ipcMain, shell } from 'electron'
import Store from 'electron-store'
import { listAccounts, switchAccount } from './commands/auth'
import { listPullRequests, getPullRequestForBranch } from './commands/pr'
import { getPRComments } from './commands/pr-comments'
import { getIssue } from './commands/issue'
import { isGHInstalled } from './executor'

interface RepoAccountStore {
  repoAccounts: Record<string, string>
}

const store = new Store<RepoAccountStore>({
  name: 'github-config',
  defaults: {
    repoAccounts: {}
  }
})

export function registerGitHubHandlers(): void {
  ipcMain.handle('github:is-available', async () => {
    return isGHInstalled()
  })

  ipcMain.handle('github:accounts:list', async () => {
    return listAccounts()
  })

  ipcMain.handle('github:accounts:switch', async (_event, username: string) => {
    await switchAccount(username)
  })

  ipcMain.handle('github:accounts:get-for-repo', async (_event, repoKey: string) => {
    return store.get(`repoAccounts.${repoKey}`) || null
  })

  ipcMain.handle('github:accounts:set-for-repo', async (_event, repoKey: string, username: string) => {
    store.set(`repoAccounts.${repoKey}`, username)
  })

  ipcMain.handle('github:pr:list', async (_event, options: {
    repoPath: string
    type: 'created' | 'review-requested' | 'all'
  }) => {
    if (!options.repoPath) {
      throw new Error('repoPath is required for github:pr:list')
    }
    return listPullRequests(options)
  })

  ipcMain.handle('github:pr:for-branch', async (_event, options: {
    repoPath: string
    branch: string
  }) => {
    if (!options.repoPath) {
      throw new Error('repoPath is required for github:pr:for-branch')
    }
    return getPullRequestForBranch(options)
  })

  ipcMain.handle('github:pr:comments', async (_event, options: {
    repoPath: string
    prNumber: number
  }) => {
    if (!options.repoPath) {
      throw new Error('repoPath is required for github:pr:comments')
    }
    if (!options.prNumber) {
      throw new Error('prNumber is required for github:pr:comments')
    }
    return getPRComments(options)
  })

  ipcMain.handle('github:issue:get', async (_event, options: {
    repoPath: string
    number: number
    repo?: string
  }) => {
    if (!options.repoPath) {
      throw new Error('repoPath is required for github:issue:get')
    }
    return getIssue(options)
  })

  ipcMain.handle('github:open-url', async (_event, url: string) => {
    await shell.openExternal(url)
  })
}
