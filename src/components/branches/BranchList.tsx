import { useEffect, useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { BranchItem } from './BranchItem'
import { CreateBranchDialog } from './CreateBranchDialog'

export function BranchList() {
  const { branches, loadBranches, isLoading } = useBranchesStore()
  const { baseBranch, setBaseBranch, setMode, clearDiff } = useDiffStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  const handleSetBase = (branchName: string) => {
    if (baseBranch === branchName) {
      setBaseBranch(null)
      clearDiff()
    } else {
      setBaseBranch(branchName)
      setMode('branches')
    }
  }

  if (isLoading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {baseBranch ? `Base: ${baseBranch} (click another to compare)` : 'Click to set base branch'}
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

      <div className="space-y-0.5">
        {localBranches.map(branch => (
          <BranchItem
            key={branch.name}
            branch={branch}
            isBase={baseBranch === branch.name}
            onSetBase={() => handleSetBase(branch.name)}
          />
        ))}
      </div>

      {remoteBranches.length > 0 && (
        <>
          <div className="px-3 py-2 text-xs text-muted-foreground">Remote</div>
          <div className="space-y-0.5">
            {remoteBranches.map(branch => (
              <BranchItem
                key={branch.name}
                branch={branch}
                isBase={baseBranch === branch.name}
                onSetBase={() => handleSetBase(branch.name)}
              />
            ))}
          </div>
        </>
      )}

      {showCreateDialog && <CreateBranchDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  )
}
