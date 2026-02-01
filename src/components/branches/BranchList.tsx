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
  const { toggleFavoriteBranch, favoriteBranches: allFavorites } = useUIStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllRemote, setShowAllRemote] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

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
