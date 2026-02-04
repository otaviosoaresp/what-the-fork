import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'
import { DiffContainer } from './DiffContainer'

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

export function SplitView({ file }: SplitViewProps) {
  const lines = buildSideBySideLines(file)

  return (
    <DiffContainer className="h-full overflow-auto font-mono text-sm">
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
                line.left?.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.left?.oldLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 min-h-[1.5rem]">
                {line.left && (
                  <TokenizedLine
                    content={line.left.content}
                    filePath={file.path}
                    lineType={line.left.type}
                    pairedContent={line.right?.type === 'add' ? line.right.content : undefined}
                  />
                )}
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
                line.right?.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.right?.newLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 min-h-[1.5rem]">
                {line.right && (
                  <TokenizedLine
                    content={line.right.content}
                    filePath={file.path}
                    lineType={line.right.type}
                    pairedContent={line.left?.type === 'remove' ? line.left.content : undefined}
                  />
                )}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </DiffContainer>
  )
}
