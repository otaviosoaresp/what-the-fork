import { ipcMain, shell } from 'electron'
import Store from 'electron-store'
import { listAccounts, switchAccount } from './commands/auth'
import { listPullRequests, getPullRequestForBranch } from './commands/pr'
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
    repo: string
    type: 'created' | 'review-requested' | 'all'
  }) => {
    return listPullRequests(options)
  })

  ipcMain.handle('github:pr:for-branch', async (_event, options: {
    repo: string
    branch: string
  }) => {
    return getPullRequestForBranch(options)
  })

  ipcMain.handle('github:issue:get', async (_event, options: {
    repo: string
    number: number
  }) => {
    return getIssue(options)
  })

  ipcMain.handle('github:open-url', async (_event, url: string) => {
    await shell.openExternal(url)
  })
}
