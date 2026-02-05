import type { Branch, Commit, FileStatus, DiffFile, RemoteStatus } from '../../electron/git/types'
import type { AIConfigState, GenerateCommitMessageResult } from '../../electron/ai/types'

interface ReviewConfigState {
  provider: string
  glmApiKeyConfigured: boolean
}

interface RepoReviewConfig {
  reviewPrompt: string
  baseBranch: string
}

interface ReviewResponse {
  content: string
  provider: string
  model?: string
  cached?: boolean
  structured?: StructuredReview
}

export type CommentType = 'bug' | 'performance' | 'readability' | 'suggestion' | 'positive'

export interface ReviewComment {
  file: string
  line: number
  type: CommentType
  content: string
}

export interface StructuredReview {
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}

export interface ReviewHistoryEntry {
  timestamp: number
  baseBranch: string
  compareBranch: string
  diffHash: string
  provider: string
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}

interface GitHubAccount {
  username: string
  isActive: boolean
}

interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  updatedAt: string
  headBranch: string
  baseBranch: string
  reviewStatus: {
    approved: number
    changesRequested: number
    pending: string[]
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  milestone: string | null
  commentsCount: number
  mergeable: boolean | null
  url: string
}

interface Issue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  labels: string[]
  url: string
}

interface PRComment {
  id: number
  path: string
  line: number | null
  originalLine: number | null
  side: 'LEFT' | 'RIGHT'
  body: string
  author: string
  createdAt: string
  inReplyToId: number | null
}

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
  review: {
    getConfig: () => Promise<ReviewConfigState>
    setConfig: (config: { provider?: string; glmApiKey?: string }) => Promise<void>
    getRepoConfig: (repoPath: string) => Promise<RepoReviewConfig>
    setRepoConfig: (repoPath: string, config: { reviewPrompt?: string; baseBranch?: string }) => Promise<void>
    getAvailableProviders: () => Promise<string[]>
    reviewBranch: (repoPath: string, baseBranch: string, compareBranch: string, skipCache?: boolean, taskContext?: { type: 'issue' | 'manual'; issue?: { number: number; title: string; body: string }; text?: string } | null) => Promise<ReviewResponse>
    ask: (repoPath: string, code: string, question: string) => Promise<ReviewResponse>
    cancel: () => Promise<void>
    resetRepoPrompt: (repoPath: string) => Promise<void>
    getHistory: (repoPath: string) => Promise<ReviewHistoryEntry[]>
    deleteHistoryEntry: (repoPath: string, timestamp: number) => Promise<void>
  }
  github: {
    isAvailable: () => Promise<boolean>
    accounts: {
      list: () => Promise<GitHubAccount[]>
      switch: (username: string) => Promise<void>
      getForRepo: (repoKey: string) => Promise<string | null>
      setForRepo: (repoKey: string, username: string) => Promise<void>
    }
    pr: {
      list: (options: { repoPath: string; type: 'created' | 'review-requested' | 'all' }) => Promise<PullRequest[]>
      forBranch: (options: { repoPath: string; branch: string }) => Promise<PullRequest | null>
      comments: (options: { repoPath: string; prNumber: number }) => Promise<PRComment[]>
    }
    issue: {
      get: (options: { repoPath: string; number: number; repo?: string }) => Promise<Issue | null>
    }
    openUrl: (url: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
