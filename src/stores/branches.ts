import { create } from 'zustand'
import type { Branch } from '../../electron/git/types'
import { useRepositoryStore } from './repository'
import { useGitHubStore } from './github'

interface BranchesState {
  branches: Branch[]
  isLoading: boolean
  error: string | null

  loadBranches: () => Promise<void>
  checkout: (branchName: string) => Promise<void>
  createBranch: (branchName: string, startPoint?: string) => Promise<void>
  deleteBranch: (branchName: string, force?: boolean) => Promise<void>
}

export const useBranchesStore = create<BranchesState>((set, get) => ({
  branches: [],
  isLoading: false,
  error: null,

  loadBranches: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null })
    try {
      const branches = await window.electron.git.branches.list(repoPath)
      set({ branches, isLoading: false })

      const githubStore = useGitHubStore.getState()
      const { repoName } = useRepositoryStore.getState()

      if (githubStore.isAvailable && githubStore.selectedAccount && repoName) {
        const branchNames = branches.map(b => b.name)
        githubStore.loadBranchPrMap(repoName, branchNames)
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load branches',
        isLoading: false
      })
    }
  },

  checkout: async (branchName: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    try {
      await window.electron.git.branches.checkout(repoPath, branchName)
      await get().loadBranches()
      await useRepositoryStore.getState().refreshStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to checkout branch' })
    }
  },

  createBranch: async (branchName: string, startPoint?: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    try {
      await window.electron.git.branches.create(repoPath, branchName, startPoint)
      await get().loadBranches()
      await useRepositoryStore.getState().refreshStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create branch' })
    }
  },

  deleteBranch: async (branchName: string, force?: boolean) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    await window.electron.git.branches.delete(repoPath, branchName, force)
    await get().loadBranches()
  }
}))
