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
import { useMemo, useState, useEffect, useRef } from 'react'
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
  const { expandContext, expandedRanges, scrollToLine, clearScrollToLine } = useDiffStore()
  const [expandingChunk, setExpandingChunk] = useState<{ chunkIndex: number; direction: 'up' | 'down' } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollToLine && containerRef.current) {
      const lineElement = containerRef.current.querySelector(`[data-line="${scrollToLine}"]`)
      if (lineElement) {
        lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        clearScrollToLine()
      }
    }
  }, [scrollToLine, clearScrollToLine])

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

  const reviewCommentsByLine = useMemo(() => {
    const normalizedPath = file.path.replace(/^\.?\//, '')
    const map = new Map<number, typeof comments>()
    comments
      .filter(c => {
        const normalizedCommentPath = c.file.replace(/^\.?\//, '')
        return (
          normalizedCommentPath === normalizedPath ||
          normalizedCommentPath.endsWith('/' + normalizedPath) ||
          normalizedPath.endsWith('/' + normalizedCommentPath)
        )
      })
      .forEach(c => {
        const existing = map.get(c.line) || []
        map.set(c.line, [...existing, c])
      })
    return map
  }, [comments, file.path])

  const reviewCommentLines = useMemo(() => {
    return new Set(reviewCommentsByLine.keys())
  }, [reviewCommentsByLine])

  const renderLine = (line: DiffLine, pairedContent: string | undefined, lineIndex: number) => {
    const lineNumber = line.newLineNumber
    const hasPrComment = lineNumber !== undefined && prCommentLines.has(lineNumber)
    const hasReviewComment = lineNumber !== undefined && reviewCommentLines.has(lineNumber)
    const hasAnyComment = hasPrComment || hasReviewComment

    return (
      <div
        key={lineIndex}
        data-line={lineNumber}
        className={cn(
          'flex relative',
          line.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]',
          line.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]',
          hasAnyComment && line.type === 'context' && 'bg-accent/10 border-l-2 border-l-accent',
          hasAnyComment && line.type === 'add' && 'ring-1 ring-inset ring-accent/30'
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
        <span className="w-6 flex items-center justify-center gap-0.5">
          {hasPrComment && (
            <MessageSquare className="w-3 h-3 text-blue-500" />
          )}
          {hasReviewComment && (
            <CommentIndicator comment={reviewCommentsByLine.get(lineNumber!)![0]} />
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
    <DiffContainer ref={containerRef} className="h-full overflow-auto font-mono text-sm">
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
                const linePrComments = line.newLineNumber ? prCommentsByLine.get(line.newLineNumber) : undefined
                const lineReviewComments = line.newLineNumber ? reviewCommentsByLine.get(line.newLineNumber) : undefined
                const hasComments = (linePrComments && linePrComments.length > 0) || (lineReviewComments && lineReviewComments.length > 0)
                return (
                  <div key={lineIndex}>
                    {renderLine(line, pairedContent, lineIndex)}
                    {hasComments && (
                      <InlineComment prComments={linePrComments} reviewComments={lineReviewComments} />
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
