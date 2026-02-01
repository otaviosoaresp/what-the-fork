import { create } from 'zustand'
import type { DiffFile, Commit } from '../../electron/git/types'
import { useRepositoryStore } from './repository'

type DiffMode = 'branches' | 'staged' | 'unstaged' | 'commit'

interface DiffState {
  mode: DiffMode
  baseBranch: string | null
  compareBranch: string | null
  selectedCommit: Commit | null
  files: DiffFile[]
  selectedFile: DiffFile | null
  isLoading: boolean
  error: string | null

  setMode: (mode: DiffMode) => void
  compareBranches: (baseBranch: string, compareBranch: string) => Promise<void>
  loadStagedDiff: () => Promise<void>
  loadUnstagedDiff: () => Promise<void>
  loadCommitDiff: (commit: Commit) => Promise<void>
  selectFile: (file: DiffFile | null) => void
  clearDiff: () => void
}

export const useDiffStore = create<DiffState>((set) => ({
  mode: 'branches',
  baseBranch: null,
  compareBranch: null,
  selectedCommit: null,
  files: [],
  selectedFile: null,
  isLoading: false,
  error: null,

  setMode: (mode: DiffMode) => {
    set({ mode, files: [], selectedFile: null, selectedCommit: null })
  },

  compareBranches: async (baseBranch: string, compareBranch: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'branches', baseBranch, compareBranch })
    try {
      const files = await window.electron.git.diff.branches(repoPath, baseBranch, compareBranch)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to compare branches',
        isLoading: false
      })
    }
  },

  loadStagedDiff: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'staged' })
    try {
      const files = await window.electron.git.diff.staged(repoPath)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load staged diff',
        isLoading: false
      })
    }
  },

  loadUnstagedDiff: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'unstaged' })
    try {
      const files = await window.electron.git.diff.unstaged(repoPath)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load unstaged diff',
        isLoading: false
      })
    }
  },

  loadCommitDiff: async (commit: Commit) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'commit', selectedCommit: commit })
    try {
      const files = await window.electron.git.commitDiff(repoPath, commit.hash)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load commit diff',
        isLoading: false
      })
    }
  },

  selectFile: (file: DiffFile | null) => {
    set({ selectedFile: file })
  },

  clearDiff: () => {
    set({
      files: [],
      selectedFile: null,
      baseBranch: null,
      compareBranch: null,
      selectedCommit: null
    })
  }
}))
