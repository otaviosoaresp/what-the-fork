import { create } from 'zustand'
import type { DiffFile, DiffLine, Commit } from '../../electron/git/types'
import { useRepositoryStore } from './repository'

type DiffMode = 'branches' | 'staged' | 'unstaged' | 'commit'

interface ExpandedRange {
  chunkIndex: number
  direction: 'up' | 'down'
  lines: DiffLine[]
}

interface DiffState {
  mode: DiffMode
  baseBranch: string | null
  compareBranch: string | null
  selectedCommit: Commit | null
  files: DiffFile[]
  selectedFile: DiffFile | null
  isLoading: boolean
  error: string | null
  expandedRanges: Record<string, ExpandedRange[]>

  setMode: (mode: DiffMode) => void
  setBaseBranch: (branch: string | null) => void
  compareBranches: (baseBranch: string, compareBranch: string) => Promise<void>
  loadStagedDiff: (targetPath?: string) => Promise<void>
  loadUnstagedDiff: (targetPath?: string) => Promise<void>
  loadCommitDiff: (commit: Commit) => Promise<void>
  selectFile: (file: DiffFile | null) => void
  selectNextFile: () => void
  selectPreviousFile: () => void
  swapBranches: () => Promise<void>
  clearDiff: () => void
  expandContext: (filePath: string, chunkIndex: number, direction: 'up' | 'down', count: number) => Promise<void>
  clearExpandedRanges: () => void
}

export const useDiffStore = create<DiffState>((set, get) => ({
  mode: 'branches',
  baseBranch: null,
  compareBranch: null,
  selectedCommit: null,
  files: [],
  selectedFile: null,
  isLoading: false,
  error: null,
  expandedRanges: {},

  setMode: (mode: DiffMode) => {
    set({ mode, files: [], selectedFile: null, selectedCommit: null })
  },

  setBaseBranch: (branch: string | null) => {
    set({ baseBranch: branch, compareBranch: null, files: [], selectedFile: null })
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

  loadStagedDiff: async (targetPath?: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'staged' })
    try {
      const files = await window.electron.git.diff.staged(repoPath)
      const targetFile = targetPath ? files.find(f => f.path === targetPath) : undefined
      set({ files, selectedFile: targetFile ?? files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load staged diff',
        isLoading: false
      })
    }
  },

  loadUnstagedDiff: async (targetPath?: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'unstaged' })
    try {
      const files = await window.electron.git.diff.unstaged(repoPath)
      const targetFile = targetPath ? files.find(f => f.path === targetPath) : undefined
      set({ files, selectedFile: targetFile ?? files[0] ?? null, isLoading: false })
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
    set({ selectedFile: file, expandedRanges: {} })
  },

  selectNextFile: () => {
    set((state) => {
      if (!state.selectedFile || state.files.length === 0) return state
      const currentIndex = state.files.findIndex(f => f.path === state.selectedFile?.path)
      if (currentIndex === -1 || currentIndex >= state.files.length - 1) return state
      return { selectedFile: state.files[currentIndex + 1] }
    })
  },

  selectPreviousFile: () => {
    set((state) => {
      if (!state.selectedFile || state.files.length === 0) return state
      const currentIndex = state.files.findIndex(f => f.path === state.selectedFile?.path)
      if (currentIndex <= 0) return state
      return { selectedFile: state.files[currentIndex - 1] }
    })
  },

  swapBranches: async () => {
    const { baseBranch, compareBranch, compareBranches } = get()
    if (!baseBranch || !compareBranch) return
    await compareBranches(compareBranch, baseBranch)
  },

  clearDiff: () => {
    set({
      files: [],
      selectedFile: null,
      baseBranch: null,
      compareBranch: null,
      selectedCommit: null,
      expandedRanges: {}
    })
  },

  expandContext: async (filePath: string, chunkIndex: number, direction: 'up' | 'down', count: number) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    const { mode, compareBranch, selectedCommit, files, expandedRanges } = get()

    const file = files.find(f => f.path === filePath)
    if (!file || chunkIndex < 0 || chunkIndex >= file.chunks.length) return

    let ref: string
    if (mode === 'branches' && compareBranch) {
      ref = compareBranch
    } else if (mode === 'commit' && selectedCommit) {
      ref = selectedCommit.hash
    } else {
      ref = 'HEAD'
    }

    try {
      const fileContent = await window.electron.git.file.content(repoPath, ref, filePath)
      const chunk = file.chunks[chunkIndex]

      let startLine: number
      let endLine: number

      if (direction === 'up') {
        startLine = chunk.newStart - count - 1
        endLine = chunk.newStart - 1
      } else {
        startLine = chunk.newStart + chunk.newLines
        endLine = chunk.newStart + chunk.newLines + count
      }

      startLine = Math.max(0, startLine)
      endLine = Math.min(fileContent.length, endLine)

      const lines: DiffLine[] = []
      for (let i = startLine; i < endLine; i++) {
        lines.push({
          type: 'context',
          content: fileContent[i] ?? '',
          oldLineNumber: i + 1,
          newLineNumber: i + 1
        })
      }

      const newRange: ExpandedRange = { chunkIndex, direction, lines }
      const existingRanges = expandedRanges[filePath] ?? []

      set({
        expandedRanges: {
          ...expandedRanges,
          [filePath]: [...existingRanges, newRange]
        }
      })
    } catch {
      return
    }
  },

  clearExpandedRanges: () => {
    set({ expandedRanges: {} })
  }
}))
