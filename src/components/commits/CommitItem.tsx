import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import type { Commit } from '../../../electron/git/types'

interface CommitItemProps {
  commit: Commit
}

export function CommitItem({ commit }: CommitItemProps) {
  const { loadCommitDiff, selectedCommit } = useDiffStore()
  const isSelected = selectedCommit?.hash === commit.hash

  const handleClick = () => {
    loadCommitDiff(commit)
  }

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(commit.hash)
  }

  return (
    <div
      className={cn(
        'px-3 py-2 cursor-pointer transition-colors',
        isSelected ? 'bg-accent/10' : 'hover:bg-muted'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <button
          onClick={handleCopyHash}
          className="font-mono text-xs text-accent hover:underline"
          title="Copy hash"
        >
          {commit.shortHash}
        </button>
        <span className="text-xs text-muted-foreground">{commit.date}</span>
        {commit.refs && commit.refs.map(ref => (
          <span
            key={ref}
            className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded"
          >
            {ref}
          </span>
        ))}
      </div>
      <p className="text-sm truncate">{commit.message}</p>
      <p className="text-xs text-muted-foreground truncate">{commit.author}</p>
    </div>
  )
}
