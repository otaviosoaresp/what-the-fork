import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'

export function DiffHeader() {
  const { files, selectedFile, selectNextFile, selectPreviousFile } = useDiffStore()

  if (!selectedFile || files.length === 0) return null

  const currentIndex = files.findIndex(f => f.path === selectedFile.path)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < files.length - 1

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-1">
        <button
          onClick={selectPreviousFile}
          disabled={!hasPrevious}
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors',
            hasPrevious ? 'text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'
          )}
          title="Previous file"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          onClick={selectNextFile}
          disabled={!hasNext}
          className={cn(
            'p-1 rounded hover:bg-muted transition-colors',
            hasNext ? 'text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'
          )}
          title="Next file"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
      <span className="text-xs text-muted-foreground">
        {currentIndex + 1} / {files.length}
      </span>
      <span className="font-mono text-sm truncate flex-1">{selectedFile.path}</span>
      <span className="flex items-center gap-2 text-xs flex-shrink-0">
        <span className="text-green-400">+{selectedFile.additions}</span>
        <span className="text-red-400">-{selectedFile.deletions}</span>
      </span>
    </div>
  )
}
