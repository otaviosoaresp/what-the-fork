import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { DiffView } from '@/components/diff/DiffView'
import { FileList } from '@/components/diff/FileList'

export function MainPanel() {
  const { files, selectedFile, isLoading, error, baseBranch, compareBranch, mode } = useDiffStore()
  const { diffViewMode } = useUIStore()

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <svg className="w-8 h-8 mx-auto mb-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p className="text-sm">Loading diff...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center text-destructive">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </main>
    )
  }

  if (files.length === 0) {
    const message = mode === 'branches' && baseBranch && compareBranch
      ? `No differences between ${baseBranch} and ${compareBranch}`
      : 'Select branches to compare or view staged/unstaged changes'

    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{message}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {selectedFile && <DiffView file={selectedFile} viewMode={diffViewMode} />}
      </div>
      <FileList files={files} selectedFile={selectedFile} />
    </main>
  )
}
