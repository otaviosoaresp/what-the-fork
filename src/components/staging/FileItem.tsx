import { useRepositoryStore } from '@/stores/repository'
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import type { FileStatus } from '../../../electron/git/types'

interface FileItemProps {
  file: FileStatus
}

const statusColors: Record<FileStatus['status'], string> = {
  modified: 'text-warning',
  added: 'text-success',
  deleted: 'text-destructive',
  renamed: 'text-accent',
  untracked: 'text-muted-foreground'
}

const statusLabels: Record<FileStatus['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: '?'
}

export function FileItem({ file }: FileItemProps) {
  const { stageFile, unstageFile, discardChanges } = useRepositoryStore()
  const { loadStagedDiff, loadUnstagedDiff } = useDiffStore()

  const handleToggleStage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (file.staged) {
      await unstageFile(file.path)
    } else {
      await stageFile(file.path)
    }
  }

  const handleDiscard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Discard changes to "${file.path}"?`)) {
      await discardChanges(file.path)
    }
  }

  const handleClick = async () => {
    if (file.staged) {
      await loadStagedDiff()
    } else {
      await loadUnstagedDiff()
    }
  }

  const fileName = file.path.split('/').pop() ?? file.path

  return (
    <div
      className="group flex items-center gap-2 px-3 py-1 text-sm hover:bg-muted cursor-pointer"
      onClick={handleClick}
    >
      <button
        onClick={handleToggleStage}
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
          file.staged ? 'bg-accent border-accent' : 'border-border hover:border-accent'
        )}
      >
        {file.staged && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>
      <span className={cn('w-4 text-xs font-mono', statusColors[file.status])}>
        {statusLabels[file.status]}
      </span>
      <span className="truncate flex-1" title={file.path}>{fileName}</span>
      {!file.staged && file.status !== 'untracked' && (
        <button
          onClick={handleDiscard}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background text-destructive"
          title="Discard changes"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
    </div>
  )
}
