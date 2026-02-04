import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'
import { pairChunkLines } from '@/lib/diff-line-pairing'
import { DiffContainer } from './DiffContainer'
import { CommentIndicator } from './CommentIndicator'
import { useReviewStore } from '@/stores/review'
import { useMemo } from 'react'

interface UnifiedViewProps {
  file: DiffFile
}

export function UnifiedView({ file }: UnifiedViewProps) {
  const { comments } = useReviewStore()

  const pairedLines = useMemo(() => {
    return file.chunks.flatMap((chunk) => ({
      chunk,
      lines: pairChunkLines(chunk),
    }))
  }, [file.chunks])

  const fileComments = useMemo(() => {
    const normalizedPath = file.path.replace(/^\.?\//, '')
    return comments.filter(c => {
      const normalizedCommentPath = c.file.replace(/^\.?\//, '')
      return (
        normalizedCommentPath === normalizedPath ||
        normalizedCommentPath.endsWith('/' + normalizedPath) ||
        normalizedPath.endsWith('/' + normalizedCommentPath)
      )
    })
  }, [comments, file.path])

  const getCommentForLine = (lineNumber: number | undefined) => {
    if (!lineNumber) return null
    return fileComments.find(c => c.line === lineNumber) || null
  }

  return (
    <DiffContainer className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="p-0">
        {pairedLines.map(({ chunk, lines }, chunkIndex) => (
          <div key={chunkIndex}>
            <div className="px-4 py-1 bg-accent/10 text-accent text-xs">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </div>
            {lines.map(({ line, pairedContent }, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'flex',
                  line.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]',
                  line.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]'
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
                <span className="w-6 flex items-center justify-center">
                  {getCommentForLine(line.newLineNumber) && (
                    <CommentIndicator comment={getCommentForLine(line.newLineNumber)!} />
                  )}
                </span>
                <pre className="flex-1 px-2">
                  <TokenizedLine
                    content={line.content}
                    filePath={file.path}
                    lineType={line.type}
                    pairedContent={pairedContent}
                  />
                </pre>
              </div>
            ))}
          </div>
        ))}
      </div>
    </DiffContainer>
  )
}
