import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine } from '../../../electron/git/types'

interface SplitViewProps {
  file: DiffFile
}

interface SideBySideLine {
  left: DiffLine | null
  right: DiffLine | null
}

function buildSideBySideLines(file: DiffFile): SideBySideLine[] {
  const result: SideBySideLine[] = []

  for (const chunk of file.chunks) {
    const removes: DiffLine[] = []
    const adds: DiffLine[] = []

    for (const line of chunk.lines) {
      if (line.type === 'context') {
        while (removes.length > 0 || adds.length > 0) {
          result.push({
            left: removes.shift() ?? null,
            right: adds.shift() ?? null
          })
        }
        result.push({ left: line, right: line })
      } else if (line.type === 'remove') {
        removes.push(line)
      } else if (line.type === 'add') {
        adds.push(line)
      }
    }

    while (removes.length > 0 || adds.length > 0) {
      result.push({
        left: removes.shift() ?? null,
        right: adds.shift() ?? null
      })
    }
  }

  return result
}

export function SplitView({ file }: SplitViewProps): JSX.Element {
  const lines = buildSideBySideLines(file)

  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="flex">
        <div className="flex-1 border-r border-border">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.left?.type === 'remove' && 'bg-destructive/10'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.left?.oldLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 whitespace-pre-wrap break-all min-h-[1.5rem]">
                {line.left?.content ?? ''}
              </pre>
            </div>
          ))}
        </div>
        <div className="flex-1">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.right?.type === 'add' && 'bg-success/10'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.right?.newLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 whitespace-pre-wrap break-all min-h-[1.5rem]">
                {line.right?.content ?? ''}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
