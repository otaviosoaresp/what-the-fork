import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DiffViewMode = 'split' | 'unified'
type SidebarSection = 'branches' | 'staging' | 'commits' | 'pull-requests'

interface UIState {
  diffViewMode: DiffViewMode
  sidebarWidth: number
  expandedSections: SidebarSection[]
  recentRepositories: string[]
  favoriteBranches: Record<string, string[]>
  fileListHeight: number

  setDiffViewMode: (mode: DiffViewMode) => void
  setSidebarWidth: (width: number) => void
  toggleSection: (section: SidebarSection) => void
  addRecentRepository: (path: string) => void
  toggleFavoriteBranch: (repoPath: string, branchName: string) => void
  isFavoriteBranch: (repoPath: string, branchName: string) => boolean
  getFavoriteBranches: (repoPath: string) => string[]
  setFileListHeight: (height: number) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      diffViewMode: 'split',
      sidebarWidth: 280,
      expandedSections: ['branches', 'staging', 'commits'],
      recentRepositories: [],
      favoriteBranches: {},
      fileListHeight: 160,

      setDiffViewMode: (mode: DiffViewMode) => {
        set({ diffViewMode: mode })
      },

      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: Math.max(200, Math.min(400, width)) })
      },

      toggleSection: (section: SidebarSection) => {
        const { expandedSections } = get()
        const isExpanded = expandedSections.includes(section)
        set({
          expandedSections: isExpanded
            ? expandedSections.filter(s => s !== section)
            : [...expandedSections, section]
        })
      },

      addRecentRepository: (path: string) => {
        const { recentRepositories } = get()
        const filtered = recentRepositories.filter(p => p !== path)
        set({
          recentRepositories: [path, ...filtered].slice(0, 10)
        })
      },

      toggleFavoriteBranch: (repoPath: string, branchName: string) => {
        const { favoriteBranches } = get()
        const repoFavorites = favoriteBranches[repoPath] || []
        const isFavorite = repoFavorites.includes(branchName)
        set({
          favoriteBranches: {
            ...favoriteBranches,
            [repoPath]: isFavorite
              ? repoFavorites.filter(b => b !== branchName)
              : [...repoFavorites, branchName]
          }
        })
      },

      isFavoriteBranch: (repoPath: string, branchName: string) => {
        const { favoriteBranches } = get()
        return (favoriteBranches[repoPath] || []).includes(branchName)
      },

      getFavoriteBranches: (repoPath: string) => {
        const { favoriteBranches } = get()
        return favoriteBranches[repoPath] || []
      },

      setFileListHeight: (height: number) => {
        set({ fileListHeight: Math.max(80, Math.min(500, height)) })
      }
    }),
    {
      name: 'git-branch-viewer-ui'
    }
  )
)
