import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { DiffView } from '@/components/diff/DiffView'
import { FileList } from '@/components/diff/FileList'

export function MainPanel() {
  const { files, selectedFile } = useDiffStore()
  const { diffViewMode } = useUIStore()

  if (files.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Select branches to compare or view staged/unstaged changes</p>
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
