import { useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { cn } from '@/lib/utils'
import type { Branch } from '../../../electron/git/types'

interface BranchItemProps {
  branch: Branch
  isBase?: boolean
  onSetBase?: () => void
}

export function BranchItem({ branch, isBase, onSetBase }: BranchItemProps): JSX.Element {
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
      {isCurrent && (
        <svg className="w-3 h-3 text-success flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
      )}
      {branch.remote && (
        <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
        </svg>
      )}
      <span className="truncate flex-1">{branch.name}</span>
      {showActions && !isCurrent && (
        <div className="flex items-center gap-1">
          {!branch.remote && (
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
