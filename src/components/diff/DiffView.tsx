import { SplitView } from './SplitView'
import { UnifiedView } from './UnifiedView'
import type { DiffFile } from '../../../electron/git/types'

interface DiffViewProps {
  file: DiffFile
  viewMode: 'split' | 'unified'
}

export function DiffView({ file, viewMode }: DiffViewProps) {
  if (file.chunks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No diff available for this file</p>
          <p className="text-xs mt-1">File may be binary or empty</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'split') {
    return <SplitView file={file} />
  }

  return <UnifiedView file={file} />
}
