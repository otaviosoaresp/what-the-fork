import type { Branch, Commit, FileStatus, DiffFile, RemoteStatus } from '../../electron/git/types'
import type { AIConfigState, GenerateCommitMessageResult } from '../../electron/ai/types'

export interface AIConfig {
  apiKey?: string
  model?: string
}

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  git: {
    isRepository: (path: string) => Promise<boolean>
    branches: {
      list: (repoPath: string) => Promise<Branch[]>
      current: (repoPath: string) => Promise<string>
      checkout: (repoPath: string, branchName: string) => Promise<void>
      create: (repoPath: string, branchName: string, startPoint?: string) => Promise<void>
      delete: (repoPath: string, branchName: string, force?: boolean) => Promise<void>
    }
    status: (repoPath: string) => Promise<FileStatus[]>
    stage: (repoPath: string, filePath: string) => Promise<void>
    stageAll: (repoPath: string) => Promise<void>
    unstage: (repoPath: string, filePath: string) => Promise<void>
    unstageAll: (repoPath: string) => Promise<void>
    discard: (repoPath: string, filePath: string) => Promise<void>
    commit: (repoPath: string, message: string) => Promise<void>
    log: (repoPath: string, count?: number) => Promise<Commit[]>
    commitDiff: (repoPath: string, commitHash: string) => Promise<DiffFile[]>
    diff: {
      branches: (repoPath: string, baseBranch: string, compareBranch: string) => Promise<DiffFile[]>
      staged: (repoPath: string) => Promise<DiffFile[]>
      unstaged: (repoPath: string) => Promise<DiffFile[]>
      file: (repoPath: string, filePath: string, staged: boolean) => Promise<DiffFile[]>
    }
    fetch: (repoPath: string) => Promise<void>
    pull: (repoPath: string) => Promise<void>
    push: (repoPath: string) => Promise<void>
    remoteStatus: (repoPath: string) => Promise<RemoteStatus>
  }
  ai: {
    generateCommitMessage: (repoPath: string) => Promise<GenerateCommitMessageResult>
    setConfig: (config: AIConfig) => Promise<void>
    getConfig: () => Promise<AIConfigState>
    clearConfig: () => Promise<void>
    testConnection: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
