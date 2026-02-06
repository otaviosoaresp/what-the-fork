import { useState } from 'react'
import { GitPullRequest } from 'lucide-react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { useToastStore } from '@/stores/toast'
import { useGitHubStore } from '@/stores/github'
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
  const addToast = useToastStore((s) => s.addToast)
  const [showActions, setShowActions] = useState(false)
  const { branchPrMap } = useGitHubStore()
  const pr = branchPrMap[branch.name]

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
    try {
      await checkout(branch.name)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Checkout failed', 'error')
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete branch "${branch.name}"?`)) return

    try {
      await deleteBranch(branch.name, false)
      addToast(`Branch "${branch.name}" deleted`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('not fully merged')) {
        if (confirm(`Branch "${branch.name}" is not fully merged. Force delete?`)) {
          try {
            await deleteBranch(branch.name, true)
            addToast(`Branch "${branch.name}" force deleted`, 'success')
          } catch (forceError) {
            addToast(forceError instanceof Error ? forceError.message : 'Force delete failed', 'error')
          }
        }
      } else {
        addToast(message || 'Delete failed', 'error')
      }
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
      <span className={cn('truncate flex-1', branch.gone && 'text-muted-foreground line-through')}>
        {branch.name}
        {pr && (
          <span
            className={`ml-1 ${
              pr.isDraft ? 'text-zinc-500' :
              pr.state === 'open' ? 'text-green-500' :
              pr.state === 'merged' ? 'text-purple-500' :
              'text-zinc-500'
            }`}
            title={`PR #${pr.number}: ${pr.title}`}
          >
            <GitPullRequest className="w-3 h-3 inline" />
          </span>
        )}
      </span>
      {branch.gone && (
        <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded flex-shrink-0" title="Remote branch was deleted">
          gone
        </span>
      )}
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
