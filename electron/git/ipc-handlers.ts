import { ipcMain } from 'electron'
import { isGitRepository } from './executor'
import * as commands from './commands'

export function registerGitHandlers(): void {
  ipcMain.handle('git:isRepository', async (_event, path: string) => {
    return isGitRepository(path)
  })

  ipcMain.handle('git:branches:list', async (_event, repoPath: string) => {
    return commands.listBranches(repoPath)
  })

  ipcMain.handle('git:branches:current', async (_event, repoPath: string) => {
    return commands.getCurrentBranch(repoPath)
  })

  ipcMain.handle('git:branches:checkout', async (_event, repoPath: string, branchName: string) => {
    return commands.checkoutBranch(repoPath, branchName)
  })

  ipcMain.handle('git:branches:create', async (_event, repoPath: string, branchName: string, startPoint?: string) => {
    return commands.createBranch(repoPath, branchName, startPoint)
  })

  ipcMain.handle('git:branches:delete', async (_event, repoPath: string, branchName: string, force: boolean) => {
    return commands.deleteBranch(repoPath, branchName, force)
  })

  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    return commands.getStatus(repoPath)
  })

  ipcMain.handle('git:stage', async (_event, repoPath: string, filePath: string) => {
    return commands.stageFile(repoPath, filePath)
  })

  ipcMain.handle('git:stageAll', async (_event, repoPath: string) => {
    return commands.stageAll(repoPath)
  })

  ipcMain.handle('git:unstage', async (_event, repoPath: string, filePath: string) => {
    return commands.unstageFile(repoPath, filePath)
  })

  ipcMain.handle('git:unstageAll', async (_event, repoPath: string) => {
    return commands.unstageAll(repoPath)
  })

  ipcMain.handle('git:discard', async (_event, repoPath: string, filePath: string) => {
    return commands.discardChanges(repoPath, filePath)
  })

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
    return commands.createCommit(repoPath, message)
  })

  ipcMain.handle('git:log', async (_event, repoPath: string, count?: number) => {
    return commands.getLog(repoPath, count)
  })

  ipcMain.handle('git:commitDiff', async (_event, repoPath: string, commitHash: string) => {
    return commands.getCommitDiff(repoPath, commitHash)
  })

  ipcMain.handle('git:diff:branches', async (_event, repoPath: string, baseBranch: string, compareBranch: string) => {
    return commands.getDiffBetweenBranches(repoPath, baseBranch, compareBranch)
  })

  ipcMain.handle('git:diff:staged', async (_event, repoPath: string) => {
    return commands.getStagedDiff(repoPath)
  })

  ipcMain.handle('git:diff:unstaged', async (_event, repoPath: string) => {
    return commands.getUnstagedDiff(repoPath)
  })

  ipcMain.handle('git:diff:file', async (_event, repoPath: string, filePath: string, staged: boolean) => {
    return commands.getFileDiff(repoPath, filePath, staged)
  })

  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    return commands.fetch(repoPath)
  })

  ipcMain.handle('git:pull', async (_event, repoPath: string) => {
    return commands.pull(repoPath)
  })

  ipcMain.handle('git:push', async (_event, repoPath: string) => {
    return commands.push(repoPath)
  })

  ipcMain.handle('git:remoteStatus', async (_event, repoPath: string) => {
    return commands.getRemoteStatus(repoPath)
  })

  ipcMain.handle('git:file:content', async (_event, repoPath: string, ref: string, filePath: string) => {
    return commands.getFileContent({ repoPath, ref, filePath })
  })
}
