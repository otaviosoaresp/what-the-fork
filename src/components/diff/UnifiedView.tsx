import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface UnifiedViewProps {
  file: DiffFile
}

export function UnifiedView({ file }: UnifiedViewProps): JSX.Element {
  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="p-0">
        {file.chunks.map((chunk, chunkIndex) => (
          <div key={chunkIndex}>
            <div className="px-4 py-1 bg-accent/10 text-accent text-xs">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </div>
            {chunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'flex',
                  line.type === 'add' && 'bg-success/10',
                  line.type === 'remove' && 'bg-destructive/10'
                )}
              >
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.oldLineNumber ?? ''}
                </span>
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.newLineNumber ?? ''}
                </span>
                <span className="w-6 text-center select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <pre className="flex-1 px-2 whitespace-pre-wrap break-all">
                  {line.content}
                </pre>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
