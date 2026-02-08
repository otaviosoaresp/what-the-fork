import { create } from 'zustand'
import type { FileStatus, RemoteStatus } from '../../electron/git/types'
import { useGitHubStore } from './github'
import { useDiffStore } from './diff'
import { useReviewStore } from './review'

interface RepositoryState {
  repoPath: string | null
  repoName: string | null
  currentBranch: string | null
  status: FileStatus[]
  remoteStatus: RemoteStatus
  isLoading: boolean
  error: string | null

  loadRepository: (path: string) => Promise<void>
  closeRepository: () => void
  refreshStatus: () => Promise<void>
  refreshRemoteStatus: () => Promise<void>
  stageFile: (filePath: string) => Promise<void>
  stageAll: () => Promise<void>
  unstageFile: (filePath: string) => Promise<void>
  unstageAll: () => Promise<void>
  discardChanges: (filePath: string) => Promise<void>
  commit: (message: string) => Promise<void>
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repoPath: null,
  repoName: null,
  currentBranch: null,
  status: [],
  remoteStatus: { ahead: 0, behind: 0, hasUpstream: false },
  isLoading: false,
  error: null,

  loadRepository: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const isRepo = await window.electron.git.isRepository(path)
      if (!isRepo) {
        throw new Error('Not a git repository')
      }

      useDiffStore.getState().clearDiff()
      useGitHubStore.getState().clearState()
      useReviewStore.getState().clear()

      const currentBranch = await window.electron.git.branches.current(path)
      const status = await window.electron.git.status(path)
      const remoteStatus = await window.electron.git.remoteStatus(path)
      const repoName = path.split('/').pop() ?? path

      set({
        repoPath: path,
        repoName,
        currentBranch,
        status,
        remoteStatus,
        isLoading: false
      })

      const githubStore = useGitHubStore.getState()
      await githubStore.checkAvailability()

      const { isAvailable } = useGitHubStore.getState()
      if (isAvailable) {
        await githubStore.loadAccounts()

        const { accounts } = useGitHubStore.getState()
        const repoKey = repoName
        const savedAccount = await window.electron.github.accounts.getForRepo(repoKey)

        if (savedAccount && accounts.some(a => a.username === savedAccount)) {
          await githubStore.selectAccount(savedAccount)
        } else if (accounts.length > 0) {
          githubStore.setNeedsAccountSelection(true)
        }
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load repository',
        isLoading: false
      })
    }
  },

  closeRepository: () => {
    useDiffStore.getState().clearDiff()
    useGitHubStore.getState().clearState()
    useReviewStore.getState().clear()

    set({
      repoPath: null,
      repoName: null,
      currentBranch: null,
      status: [],
      remoteStatus: { ahead: 0, behind: 0, hasUpstream: false },
      error: null
    })
  },

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return

    try {
      const status = await window.electron.git.status(repoPath)
      const currentBranch = await window.electron.git.branches.current(repoPath)
      set({ status, currentBranch })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to refresh status' })
    }
  },

  refreshRemoteStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return

    try {
      const remoteStatus = await window.electron.git.remoteStatus(repoPath)
      set({ remoteStatus })
    } catch {
      // Ignore errors for remote status
    }
  },

  stageFile: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.stage(repoPath, filePath)
    await refreshStatus()
  },

  stageAll: async () => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.stageAll(repoPath)
    await refreshStatus()
  },

  unstageFile: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.unstage(repoPath, filePath)
    await refreshStatus()
  },

  unstageAll: async () => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.unstageAll(repoPath)
    await refreshStatus()
  },

  discardChanges: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.discard(repoPath, filePath)
    await refreshStatus()
  },

  commit: async (message: string) => {
    const { repoPath, refreshStatus, refreshRemoteStatus } = get()
    if (!repoPath) return

    await window.electron.git.commit(repoPath, message)
    await refreshStatus()
    await refreshRemoteStatus()
  }
}))
