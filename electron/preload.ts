import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  git: {
    isRepository: (path: string) => ipcRenderer.invoke('git:isRepository', path),
    branches: {
      list: (repoPath: string) => ipcRenderer.invoke('git:branches:list', repoPath),
      current: (repoPath: string) => ipcRenderer.invoke('git:branches:current', repoPath),
      checkout: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:branches:checkout', repoPath, branchName),
      create: (repoPath: string, branchName: string, startPoint?: string) => ipcRenderer.invoke('git:branches:create', repoPath, branchName, startPoint),
      delete: (repoPath: string, branchName: string, force?: boolean) => ipcRenderer.invoke('git:branches:delete', repoPath, branchName, force ?? false)
    },
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    stage: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:stage', repoPath, filePath),
    stageAll: (repoPath: string) => ipcRenderer.invoke('git:stageAll', repoPath),
    unstage: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:unstage', repoPath, filePath),
    unstageAll: (repoPath: string) => ipcRenderer.invoke('git:unstageAll', repoPath),
    discard: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:discard', repoPath, filePath),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    log: (repoPath: string, count?: number) => ipcRenderer.invoke('git:log', repoPath, count),
    commitDiff: (repoPath: string, commitHash: string) => ipcRenderer.invoke('git:commitDiff', repoPath, commitHash),
    diff: {
      branches: (repoPath: string, baseBranch: string, compareBranch: string) => ipcRenderer.invoke('git:diff:branches', repoPath, baseBranch, compareBranch),
      staged: (repoPath: string) => ipcRenderer.invoke('git:diff:staged', repoPath),
      unstaged: (repoPath: string) => ipcRenderer.invoke('git:diff:unstaged', repoPath),
      file: (repoPath: string, filePath: string, staged: boolean) => ipcRenderer.invoke('git:diff:file', repoPath, filePath, staged)
    },
    fetch: (repoPath: string) => ipcRenderer.invoke('git:fetch', repoPath),
    pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
    push: (repoPath: string) => ipcRenderer.invoke('git:push', repoPath),
    remoteStatus: (repoPath: string) => ipcRenderer.invoke('git:remoteStatus', repoPath)
  },
  ai: {
    generateCommitMessage: (repoPath: string) => ipcRenderer.invoke('ai:generate-commit-message', repoPath),
    setConfig: (config: { apiKey?: string; model?: string }) => ipcRenderer.invoke('ai:set-config', config),
    getConfig: () => ipcRenderer.invoke('ai:get-config'),
    clearConfig: () => ipcRenderer.invoke('ai:clear-config'),
    testConnection: () => ipcRenderer.invoke('ai:test-connection')
  },
  review: {
    getConfig: () => ipcRenderer.invoke('review:get-config'),
    setConfig: (config: { provider?: string; glmApiKey?: string }) => ipcRenderer.invoke('review:set-config', config),
    getRepoConfig: (repoPath: string) => ipcRenderer.invoke('review:get-repo-config', repoPath),
    setRepoConfig: (repoPath: string, config: { reviewPrompt?: string; baseBranch?: string }) => ipcRenderer.invoke('review:set-repo-config', repoPath, config),
    getAvailableProviders: () => ipcRenderer.invoke('review:get-available-providers'),
    reviewBranch: (repoPath: string, baseBranch: string, compareBranch: string, skipCache?: boolean) => ipcRenderer.invoke('review:branch', repoPath, baseBranch, compareBranch, skipCache),
    ask: (repoPath: string, code: string, question: string) => ipcRenderer.invoke('review:ask', repoPath, code, question),
    cancel: () => ipcRenderer.invoke('review:cancel'),
    resetRepoPrompt: (repoPath: string) => ipcRenderer.invoke('review:reset-repo-prompt', repoPath)
  }
})
