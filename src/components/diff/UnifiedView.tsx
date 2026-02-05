import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import type { DiffFile, DiffChunk, DiffLine } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'
import { pairChunkLines } from '@/lib/diff-line-pairing'
import { DiffContainer } from './DiffContainer'
import { CommentIndicator } from './CommentIndicator'
import { InlineComment } from './InlineComment'
import { useReviewStore } from '@/stores/review'
import { useGitHubStore } from '@/stores/github'
import { useDiffStore } from '@/stores/diff'
import { useMemo, useState } from 'react'
import { ExpandButton } from './ExpandButton'

interface UnifiedViewProps {
  file: DiffFile
}

function getHiddenLinesBefore(chunk: DiffChunk, prevChunk?: DiffChunk): number {
  if (!prevChunk) {
    return chunk.newStart - 1
  }
  const prevEnd = prevChunk.newStart + prevChunk.newLines
  return chunk.newStart - prevEnd
}

export function UnifiedView({ file }: UnifiedViewProps) {
  const { comments } = useReviewStore()
  const { prComments } = useGitHubStore()
  const { expandContext, expandedRanges } = useDiffStore()
  const [expandingChunk, setExpandingChunk] = useState<{ chunkIndex: number; direction: 'up' | 'down' } | null>(null)

  const prCommentsByLine = useMemo(() => {
    if (!file?.path) return new Map<number, typeof prComments>()
    const normalizedPath = file.path.replace(/^\.?\//, '')
    const map = new Map<number, typeof prComments>()
    prComments
      .filter(c => c.path?.replace(/^\.?\//, '') === normalizedPath && c.line)
      .forEach(c => {
        const line = c.line as number
        const existing = map.get(line) || []
        map.set(line, [...existing, c])
      })
    return map
  }, [prComments, file?.path])

  const prCommentLines = useMemo(() => {
    return new Set(prCommentsByLine.keys())
  }, [prCommentsByLine])

  const fileExpanded = expandedRanges[file.path] ?? []

  const getExpandedLinesForChunk = (chunkIndex: number, direction: 'up' | 'down'): DiffLine[] => {
    return fileExpanded
      .filter(range => range.chunkIndex === chunkIndex && range.direction === direction)
      .flatMap(range => range.lines)
  }

  const handleExpand = async (chunkIndex: number, direction: 'up' | 'down', count: number) => {
    setExpandingChunk({ chunkIndex, direction })
    await expandContext(file.path, chunkIndex, direction, count)
    setExpandingChunk(null)
  }

  const pairedLines = useMemo(() => {
    return file.chunks.map((chunk) => ({
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

  const renderLine = (line: DiffLine, pairedContent: string | undefined, lineIndex: number) => {
    const lineNumber = line.newLineNumber
    const hasPrComment = lineNumber !== undefined && prCommentLines.has(lineNumber)

    return (
      <div
        key={lineIndex}
        className={cn(
          'flex relative',
          line.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]',
          line.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]',
          hasPrComment && line.type === 'context' && 'bg-blue-500/10 border-l-2 border-l-blue-500',
          hasPrComment && line.type === 'add' && 'ring-1 ring-inset ring-blue-500/30'
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
          {hasPrComment && (
            <MessageSquare className="w-3 h-3 text-blue-500" />
          )}
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
    )
  }

  const calculateHiddenLinesUp = (chunkIndex: number): number => {
    const chunk = file.chunks[chunkIndex]
    const prevChunk = chunkIndex > 0 ? file.chunks[chunkIndex - 1] : undefined
    const baseHidden = getHiddenLinesBefore(chunk, prevChunk)
    const expandedUp = getExpandedLinesForChunk(chunkIndex, 'up').length
    const expandedDownPrev = prevChunk ? getExpandedLinesForChunk(chunkIndex - 1, 'down').length : 0
    return Math.max(0, baseHidden - expandedUp - expandedDownPrev)
  }

  return (
    <DiffContainer className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="p-0">
        {pairedLines.map(({ chunk, lines }, chunkIndex) => {
          const hiddenLinesUp = calculateHiddenLinesUp(chunkIndex)
          const expandedLinesUp = getExpandedLinesForChunk(chunkIndex, 'up')
          const expandedLinesDown = getExpandedLinesForChunk(chunkIndex, 'down')
          const isLoadingUp = expandingChunk?.chunkIndex === chunkIndex && expandingChunk?.direction === 'up'
          const isLoadingDown = expandingChunk?.chunkIndex === chunkIndex && expandingChunk?.direction === 'down'

          return (
            <div key={chunkIndex}>
              <div className="px-4 py-1 bg-accent/10 text-accent text-xs">
                @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
              </div>

              {hiddenLinesUp > 0 && (
                <ExpandButton
                  direction="up"
                  hiddenLines={hiddenLinesUp}
                  onExpand={(count) => handleExpand(chunkIndex, 'up', count)}
                  loading={isLoadingUp}
                />
              )}

              {expandedLinesUp.map((line, idx) => renderLine(line, undefined, `expanded-up-${idx}` as unknown as number))}

              {lines.map(({ line, pairedContent }, lineIndex) => {
                const lineComments = line.newLineNumber ? prCommentsByLine.get(line.newLineNumber) : undefined
                return (
                  <div key={lineIndex}>
                    {renderLine(line, pairedContent, lineIndex)}
                    {lineComments && lineComments.length > 0 && (
                      <InlineComment comments={lineComments} />
                    )}
                  </div>
                )
              })}

              {expandedLinesDown.map((line, idx) => renderLine(line, undefined, `expanded-down-${idx}` as unknown as number))}

              {chunkIndex === file.chunks.length - 1 && (
                <ExpandButton
                  direction="down"
                  hiddenLines={0}
                  onExpand={(count) => handleExpand(chunkIndex, 'down', count)}
                  loading={isLoadingDown}
                />
              )}
            </div>
          )
        })}
      </div>
    </DiffContainer>
  )
}
