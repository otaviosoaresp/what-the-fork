import { useEffect, useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { BranchItem } from './BranchItem'
import { CreateBranchDialog } from './CreateBranchDialog'

export function BranchList(): JSX.Element {
  const { branches, loadBranches, isLoading } = useBranchesStore()
  const { setMode, clearDiff } = useDiffStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedBase, setSelectedBase] = useState<string | null>(null)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  const handleSetBase = (branchName: string) => {
    if (selectedBase === branchName) {
      setSelectedBase(null)
      clearDiff()
    } else {
      setSelectedBase(branchName)
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
          {selectedBase ? `Compare with: ${selectedBase}` : 'Click to set base branch'}
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
            isBase={selectedBase === branch.name}
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
                isBase={selectedBase === branch.name}
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
