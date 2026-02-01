# Branch UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve branch selection UX with visual comparison indicator, favorites, search/filter, scrollable remote branches, and expandable file list.

**Architecture:** Extend UI store with favorites (persisted) and filter state. Add comparison header component. Refactor BranchList with collapsible sections and search input. Make FileList height configurable.

**Tech Stack:** React, Zustand (with persist), Tailwind CSS

---

## Task 1: Add Comparison Header Component

**Files:**
- Create: `src/components/branches/ComparisonHeader.tsx`
- Modify: `src/components/layout/MainPanel.tsx`

**Step 1: Create ComparisonHeader component**

Create `src/components/branches/ComparisonHeader.tsx`:

```tsx
import { useDiffStore } from '@/stores/diff'

export function ComparisonHeader() {
  const { baseBranch, compareBranch, mode, clearDiff, setBaseBranch } = useDiffStore()

  if (mode !== 'branches' || !baseBranch) {
    return null
  }

  const handleClear = () => {
    setBaseBranch(null)
    clearDiff()
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-sm">
      <span className="text-muted-foreground">Comparing:</span>
      <span className="font-mono font-medium text-accent">{baseBranch}</span>
      {compareBranch && (
        <>
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="font-mono font-medium text-accent">{compareBranch}</span>
        </>
      )}
      {!compareBranch && (
        <span className="text-muted-foreground italic">select target branch</span>
      )}
      <button
        onClick={handleClear}
        className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Clear comparison"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
```

**Step 2: Add ComparisonHeader to MainPanel**

Modify `src/components/layout/MainPanel.tsx` - add import and render ComparisonHeader at the top of the main panel:

```tsx
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { DiffView } from '@/components/diff/DiffView'
import { FileList } from '@/components/diff/FileList'
import { ComparisonHeader } from '@/components/branches/ComparisonHeader'

export function MainPanel() {
  const { files, selectedFile, isLoading, error, baseBranch, compareBranch, mode } = useDiffStore()
  const { diffViewMode } = useUIStore()

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p className="text-sm">Loading diff...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center text-destructive">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </main>
    )
  }

  if (files.length === 0) {
    const message = mode === 'branches' && baseBranch && compareBranch
      ? `No differences between ${baseBranch} and ${compareBranch}`
      : 'Select branches to compare or view staged/unstaged changes'

    return (
      <main className="flex-1 flex flex-col overflow-hidden">
        <ComparisonHeader />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <ComparisonHeader />
      <div className="flex-1 overflow-hidden">
        {selectedFile && <DiffView file={selectedFile} viewMode={diffViewMode} />}
      </div>
      <FileList files={files} selectedFile={selectedFile} />
    </main>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/branches/ComparisonHeader.tsx src/components/layout/MainPanel.tsx
git commit -m "feat: add comparison header showing selected branches"
```

---

## Task 2: Add Favorites to UI Store

**Files:**
- Modify: `src/stores/ui.ts`

**Step 1: Extend UI store with favorites**

Modify `src/stores/ui.ts`:

```tsx
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DiffViewMode = 'split' | 'unified'
type SidebarSection = 'branches' | 'staging' | 'commits'

interface UIState {
  diffViewMode: DiffViewMode
  sidebarWidth: number
  expandedSections: SidebarSection[]
  recentRepositories: string[]
  favoriteBranches: Record<string, string[]>
  fileListExpanded: boolean

  setDiffViewMode: (mode: DiffViewMode) => void
  setSidebarWidth: (width: number) => void
  toggleSection: (section: SidebarSection) => void
  addRecentRepository: (path: string) => void
  toggleFavoriteBranch: (repoPath: string, branchName: string) => void
  isFavoriteBranch: (repoPath: string, branchName: string) => boolean
  getFavoriteBranches: (repoPath: string) => string[]
  setFileListExpanded: (expanded: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      diffViewMode: 'split',
      sidebarWidth: 280,
      expandedSections: ['branches', 'staging', 'commits'],
      recentRepositories: [],
      favoriteBranches: {},
      fileListExpanded: false,

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

      setFileListExpanded: (expanded: boolean) => {
        set({ fileListExpanded: expanded })
      }
    }),
    {
      name: 'git-branch-viewer-ui'
    }
  )
)
```

**Step 2: Commit**

```bash
git add src/stores/ui.ts
git commit -m "feat: add favorite branches and file list expansion to UI store"
```

---

## Task 3: Add Favorite Toggle to BranchItem

**Files:**
- Modify: `src/components/branches/BranchItem.tsx`

**Step 1: Update BranchItem with favorite toggle**

Modify `src/components/branches/BranchItem.tsx`:

```tsx
import { useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import type { Branch } from '../../../electron/git/types'

interface BranchItemProps {
  branch: Branch
  isBase?: boolean
  isFavorite?: boolean
  onSetBase?: () => void
  onToggleFavorite?: () => void
}

export function BranchItem({ branch, isBase, isFavorite, onSetBase, onToggleFavorite }: BranchItemProps) {
  const { checkout, deleteBranch } = useBranchesStore()
  const { compareBranches, baseBranch } = useDiffStore()
  const { currentBranch } = useRepositoryStore()
  const [showActions, setShowActions] = useState(false)

  const isCurrent = branch.name === currentBranch

  const handleClick = () => {
    if (baseBranch && baseBranch !== branch.name) {
      compareBranches(baseBranch, branch.name)
    } else if (onSetBase) {
      onSetBase()
    }
  }

  const handleCheckout = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await checkout(branch.name)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete branch "${branch.name}"?`)) {
      await deleteBranch(branch.name)
    }
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleFavorite?.()
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors',
        isBase ? 'bg-accent/10 text-accent' : 'hover:bg-muted',
        isCurrent && 'font-medium'
      )}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isFavorite && (
        <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )}
      {isCurrent && !isFavorite && (
        <svg className="w-3 h-3 text-success flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
      )}
      {branch.remote && !isFavorite && !isCurrent && (
        <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
        </svg>
      )}
      <span className="truncate flex-1">{branch.name}</span>
      {showActions && (
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleFavorite}
            className={cn('p-1 rounded hover:bg-background', isFavorite ? 'text-yellow-500' : 'text-muted-foreground')}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
          {!branch.remote && !isCurrent && (
            <button
              onClick={handleCheckout}
              className="p-1 rounded hover:bg-background"
              title="Checkout"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
            </button>
          )}
          {!branch.remote && !isCurrent && (
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-background text-destructive"
              title="Delete"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/branches/BranchItem.tsx
git commit -m "feat: add favorite toggle button to branch item"
```

---

## Task 4: Refactor BranchList with Search, Favorites Section, and Scrollable Remote

**Files:**
- Modify: `src/components/branches/BranchList.tsx`

**Step 1: Rewrite BranchList with new features**

Modify `src/components/branches/BranchList.tsx`:

```tsx
import { useEffect, useState, useMemo } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'
import { BranchItem } from './BranchItem'
import { CreateBranchDialog } from './CreateBranchDialog'

export function BranchList() {
  const { branches, loadBranches, isLoading } = useBranchesStore()
  const { baseBranch, setBaseBranch, setMode, clearDiff } = useDiffStore()
  const { repoPath } = useRepositoryStore()
  const { toggleFavoriteBranch, getFavoriteBranches } = useUIStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllRemote, setShowAllRemote] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const favoriteBranchNames = useMemo(() => {
    return repoPath ? getFavoriteBranches(repoPath) : []
  }, [repoPath, getFavoriteBranches])

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches
    const query = searchQuery.toLowerCase()
    return branches.filter(b => b.name.toLowerCase().includes(query))
  }, [branches, searchQuery])

  const localBranches = useMemo(() => {
    return filteredBranches.filter(b => !b.remote)
  }, [filteredBranches])

  const remoteBranches = useMemo(() => {
    return filteredBranches.filter(b => b.remote)
  }, [filteredBranches])

  const favoriteBranches = useMemo(() => {
    return filteredBranches.filter(b => favoriteBranchNames.includes(b.name))
  }, [filteredBranches, favoriteBranchNames])

  const nonFavoriteLocalBranches = useMemo(() => {
    return localBranches.filter(b => !favoriteBranchNames.includes(b.name))
  }, [localBranches, favoriteBranchNames])

  const displayedRemoteBranches = useMemo(() => {
    if (showAllRemote || searchQuery.trim()) return remoteBranches
    return remoteBranches.slice(0, 5)
  }, [remoteBranches, showAllRemote, searchQuery])

  const handleSetBase = (branchName: string) => {
    if (baseBranch === branchName) {
      setBaseBranch(null)
      clearDiff()
    } else {
      setBaseBranch(branchName)
      setMode('branches')
    }
  }

  const handleToggleFavorite = (branchName: string) => {
    if (repoPath) {
      toggleFavoriteBranch(repoPath, branchName)
    }
  }

  if (isLoading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="px-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {baseBranch ? `Base: ${baseBranch}` : 'Click to set base'}
          </span>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-1 rounded hover:bg-muted"
            title="Create branch"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <div className="relative">
          <svg className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter branches..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {favoriteBranches.length > 0 && (
        <>
          <div className="px-3 py-1 text-xs text-yellow-500 font-medium flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Favorites
          </div>
          <div className="space-y-0.5">
            {favoriteBranches.map(branch => (
              <BranchItem
                key={`fav-${branch.name}`}
                branch={branch}
                isBase={baseBranch === branch.name}
                isFavorite={true}
                onSetBase={() => handleSetBase(branch.name)}
                onToggleFavorite={() => handleToggleFavorite(branch.name)}
              />
            ))}
          </div>
        </>
      )}

      {nonFavoriteLocalBranches.length > 0 && (
        <>
          <div className="px-3 py-1 text-xs text-muted-foreground">Local</div>
          <div className="space-y-0.5">
            {nonFavoriteLocalBranches.map(branch => (
              <BranchItem
                key={branch.name}
                branch={branch}
                isBase={baseBranch === branch.name}
                isFavorite={false}
                onSetBase={() => handleSetBase(branch.name)}
                onToggleFavorite={() => handleToggleFavorite(branch.name)}
              />
            ))}
          </div>
        </>
      )}

      {remoteBranches.length > 0 && (
        <>
          <div className="px-3 py-1 text-xs text-muted-foreground flex items-center justify-between">
            <span>Remote ({remoteBranches.length})</span>
            {remoteBranches.length > 5 && !searchQuery && (
              <button
                onClick={() => setShowAllRemote(!showAllRemote)}
                className="text-accent hover:underline"
              >
                {showAllRemote ? 'Show less' : `Show all`}
              </button>
            )}
          </div>
          <div className={showAllRemote && !searchQuery ? 'max-h-48 overflow-y-auto' : ''}>
            <div className="space-y-0.5">
              {displayedRemoteBranches.map(branch => (
                <BranchItem
                  key={branch.name}
                  branch={branch}
                  isBase={baseBranch === branch.name}
                  isFavorite={favoriteBranchNames.includes(branch.name)}
                  onSetBase={() => handleSetBase(branch.name)}
                  onToggleFavorite={() => handleToggleFavorite(branch.name)}
                />
              ))}
            </div>
          </div>
          {!showAllRemote && remoteBranches.length > 5 && !searchQuery && (
            <div className="px-3 py-1 text-xs text-muted-foreground">
              +{remoteBranches.length - 5} more
            </div>
          )}
        </>
      )}

      {filteredBranches.length === 0 && searchQuery && (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          No branches match "{searchQuery}"
        </div>
      )}

      {showCreateDialog && <CreateBranchDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/branches/BranchList.tsx
git commit -m "feat: add search filter, favorites section, and scrollable remote branches"
```

---

## Task 5: Add Expandable FileList

**Files:**
- Modify: `src/components/diff/FileList.tsx`

**Step 1: Update FileList with expand/collapse functionality**

Modify `src/components/diff/FileList.tsx`:

```tsx
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
}

export function FileList({ files, selectedFile }: FileListProps) {
  const { selectFile } = useDiffStore()
  const { fileListExpanded, setFileListExpanded } = useUIStore()

  const collapsedHeight = 'max-h-40'
  const expandedHeight = 'max-h-[50vh]'

  return (
    <div className="border-t border-border bg-background/50">
      <button
        onClick={() => setFileListExpanded(!fileListExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
      >
        <span>Files Changed ({files.length})</span>
        <svg
          className={cn('w-4 h-4 transition-transform', fileListExpanded && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <div className={cn('overflow-y-auto transition-all', fileListExpanded ? expandedHeight : collapsedHeight)}>
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => selectFile(file)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
              selectedFile?.path === file.path && 'bg-muted'
            )}
          >
            <span className="truncate font-mono text-xs">{file.path}</span>
            <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
              <span className="text-success">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/diff/FileList.tsx
git commit -m "feat: add expand/collapse toggle to file list"
```

---

## Task 6: Final Testing and Cleanup

**Step 1: Build and verify**

Run:
```bash
npm run build:electron
npx tsc --noEmit
```

Expected: No errors

**Step 2: Test application**

Run:
```bash
npm run dev:electron
```

Verify:
- [ ] Comparison header shows selected branches with clear button
- [ ] Search input filters branches in real-time
- [ ] Favorite toggle (star icon) appears on hover
- [ ] Favorite branches appear in dedicated section at top
- [ ] Remote branches limited to 5 by default with "Show all" button
- [ ] Remote branches scrollable when expanded
- [ ] File list has expand/collapse chevron button
- [ ] File list expands to 50vh when toggled
- [ ] All preferences persist across app restart

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete branch UX improvements"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | ComparisonHeader showing base -> compare branches |
| 2 | UI store with favorites and fileListExpanded |
| 3 | BranchItem with favorite toggle button |
| 4 | BranchList with search, favorites section, scrollable remote |
| 5 | FileList with expand/collapse toggle |
| 6 | Final testing and verification |
