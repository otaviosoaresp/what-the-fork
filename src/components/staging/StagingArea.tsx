import { useRepositoryStore } from '@/stores/repository'
import { FileItem } from './FileItem'
import { CommitForm } from './CommitForm'

export function StagingArea(): JSX.Element {
  const { status, stageAll, unstageAll } = useRepositoryStore()

  const staged = status.filter(f => f.staged)
  const unstaged = status.filter(f => !f.staged)

  if (status.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No changes
      </div>
    )
  }

  return (
    <div>
      {staged.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground">Staged ({staged.length})</span>
            <button
              onClick={unstageAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Unstage all
            </button>
          </div>
          {staged.map(file => (
            <FileItem key={file.path} file={file} />
          ))}
        </div>
      )}

      {unstaged.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground">Unstaged ({unstaged.length})</span>
            <button
              onClick={stageAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Stage all
            </button>
          </div>
          {unstaged.map(file => (
            <FileItem key={file.path} file={file} />
          ))}
        </div>
      )}

      <CommitForm />
    </div>
  )
}
