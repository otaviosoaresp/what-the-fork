import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
}

export function FileList({ files, selectedFile }: FileListProps) {
  const { selectFile } = useDiffStore()
  const { fileListExpanded, setFileListExpanded } = useUIStore()

  const collapsedHeight = 'max-h-40'
  const expandedHeight = 'max-h-[50vh]'

  return (
    <div className="border-t border-border bg-background/50">
      <button
        onClick={() => setFileListExpanded(!fileListExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
      >
        <span>Files Changed ({files.length})</span>
        <svg
          className={cn('w-4 h-4 transition-transform', fileListExpanded && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
      <div className={cn('overflow-y-auto transition-all', fileListExpanded ? expandedHeight : collapsedHeight)}>
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => selectFile(file)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
              selectedFile?.path === file.path && 'bg-muted'
            )}
          >
            <span className="truncate font-mono text-xs">{file.path}</span>
            <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
              <span className="text-success">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
