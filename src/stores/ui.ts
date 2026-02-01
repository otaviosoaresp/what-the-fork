import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DiffViewMode = 'split' | 'unified'
type SidebarSection = 'branches' | 'staging' | 'commits'

interface UIState {
  diffViewMode: DiffViewMode
  sidebarWidth: number
  expandedSections: SidebarSection[]
  recentRepositories: string[]

  setDiffViewMode: (mode: DiffViewMode) => void
  setSidebarWidth: (width: number) => void
  toggleSection: (section: SidebarSection) => void
  addRecentRepository: (path: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      diffViewMode: 'split',
      sidebarWidth: 280,
      expandedSections: ['branches', 'staging', 'commits'],
      recentRepositories: [],

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
      }
    }),
    {
      name: 'git-branch-viewer-ui'
    }
  )
)
