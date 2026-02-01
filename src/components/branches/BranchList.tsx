import { useEffect, useState, useMemo, useRef } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'
import { BranchItem } from './BranchItem'
import { CreateBranchDialog } from './CreateBranchDialog'

const PAGE_SIZE = 10

type SortOption = 'recent' | 'name'

export function BranchList() {
  const { branches, loadBranches, isLoading } = useBranchesStore()
  const { baseBranch, setBaseBranch, setMode, clearDiff } = useDiffStore()
  const { repoPath } = useRepositoryStore()
  const { toggleFavoriteBranch, favoriteBranches: allFavorites } = useUIStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [localVisibleCount, setLocalVisibleCount] = useState(PAGE_SIZE)
  const [remoteVisibleCount, setRemoteVisibleCount] = useState(PAGE_SIZE)
  const [remoteCollapsed, setRemoteCollapsed] = useState(true)
  const [sortOption, setSortOption] = useState<SortOption>('recent')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    setLocalVisibleCount(PAGE_SIZE)
    setRemoteVisibleCount(PAGE_SIZE)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const favoriteBranchNames = useMemo(() => {
    return repoPath ? (allFavorites[repoPath] || []) : []
  }, [repoPath, allFavorites])

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
    const filtered = localBranches.filter(b => !favoriteBranchNames.includes(b.name))
    if (sortOption === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    }
    return filtered
  }, [localBranches, favoriteBranchNames, sortOption])

  const nonFavoriteRemoteBranches = useMemo(() => {
    return remoteBranches.filter(b => !favoriteBranchNames.includes(b.name))
  }, [remoteBranches, favoriteBranchNames])

  const displayedLocalBranches = useMemo(() => {
    if (searchQuery.trim()) return nonFavoriteLocalBranches
    return nonFavoriteLocalBranches.slice(0, localVisibleCount)
  }, [nonFavoriteLocalBranches, localVisibleCount, searchQuery])

  const displayedRemoteBranches = useMemo(() => {
    if (searchQuery.trim()) return nonFavoriteRemoteBranches
    return nonFavoriteRemoteBranches.slice(0, remoteVisibleCount)
  }, [nonFavoriteRemoteBranches, remoteVisibleCount, searchQuery])

  const hasMoreLocal = !searchQuery.trim() && nonFavoriteLocalBranches.length > localVisibleCount
  const hasMoreRemote = !searchQuery.trim() && nonFavoriteRemoteBranches.length > remoteVisibleCount
  const remainingLocal = nonFavoriteLocalBranches.length - localVisibleCount
  const remainingRemote = nonFavoriteRemoteBranches.length - remoteVisibleCount

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
            placeholder="Search branches..."
            className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
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

      {(displayedLocalBranches.length > 0 || hasMoreLocal) && (
        <>
          <div className="px-3 py-1 text-xs text-muted-foreground flex items-center justify-between">
            <span>Local ({localBranches.length})</span>
            <div className="relative" ref={sortMenuRef}>
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-1 rounded hover:bg-muted flex items-center gap-1"
                title="Sort branches"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M6 12h12M9 18h6" />
                </svg>
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg z-10 min-w-[140px]">
                  <button
                    onClick={() => { setSortOption('recent'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted flex items-center justify-between ${sortOption === 'recent' ? 'text-accent' : ''}`}
                  >
                    <span>Last updated</span>
                    {sortOption === 'recent' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => { setSortOption('name'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted flex items-center justify-between ${sortOption === 'name' ? 'text-accent' : ''}`}
                  >
                    <span>Name (A-Z)</span>
                    {sortOption === 'name' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            {displayedLocalBranches.map(branch => (
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
          {hasMoreLocal && (
            <button
              onClick={() => setLocalVisibleCount(prev => prev + PAGE_SIZE)}
              className="w-full px-3 py-1.5 text-xs text-accent hover:bg-muted transition-colors"
            >
              Show {Math.min(PAGE_SIZE, remainingLocal)} more
            </button>
          )}
        </>
      )}

      {remoteBranches.length > 0 && (
        <>
          <button
            onClick={() => setRemoteCollapsed(!remoteCollapsed)}
            className="w-full px-3 py-1 text-xs text-muted-foreground mt-2 flex items-center justify-between hover:text-foreground transition-colors"
          >
            <span>Remote ({remoteBranches.length})</span>
            <svg
              className={`w-3 h-3 transition-transform ${remoteCollapsed ? '' : 'rotate-180'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {!remoteCollapsed && (
            <>
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
              {hasMoreRemote && (
                <button
                  onClick={() => setRemoteVisibleCount(prev => prev + PAGE_SIZE)}
                  className="w-full px-3 py-1.5 text-xs text-accent hover:bg-muted transition-colors"
                >
                  Show {Math.min(PAGE_SIZE, remainingRemote)} more
                </button>
              )}
            </>
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
