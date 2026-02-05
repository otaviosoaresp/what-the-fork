import { useMemo, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine, DiffChunk } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'
import { DiffContainer } from './DiffContainer'
import { CommentIndicator } from './CommentIndicator'
import { InlineComment } from './InlineComment'
import { useReviewStore } from '@/stores/review'
import { useGitHubStore } from '@/stores/github'
import { useDiffStore } from '@/stores/diff'
import { ExpandButton } from './ExpandButton'

interface SplitViewProps {
  file: DiffFile
}

interface SideBySideLine {
  left: DiffLine | null
  right: DiffLine | null
}

function buildSideBySideLinesFromChunk(chunk: DiffChunk): SideBySideLine[] {
  const result: SideBySideLine[] = []
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

  return result
}

function buildSideBySideLinesFromLines(lines: DiffLine[]): SideBySideLine[] {
  return lines.map(line => ({ left: line, right: line }))
}

function getHiddenLinesBefore(chunk: DiffChunk, prevChunk?: DiffChunk): number {
  if (!prevChunk) {
    return chunk.newStart - 1
  }
  const prevEnd = prevChunk.newStart + prevChunk.newLines
  return chunk.newStart - prevEnd
}

export function SplitView({ file }: SplitViewProps) {
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

  const calculateHiddenLinesUp = (chunkIndex: number): number => {
    const chunk = file.chunks[chunkIndex]
    const prevChunk = chunkIndex > 0 ? file.chunks[chunkIndex - 1] : undefined
    const baseHidden = getHiddenLinesBefore(chunk, prevChunk)
    const expandedUp = getExpandedLinesForChunk(chunkIndex, 'up').length
    const expandedDownPrev = prevChunk ? getExpandedLinesForChunk(chunkIndex - 1, 'down').length : 0
    return Math.max(0, baseHidden - expandedUp - expandedDownPrev)
  }

  const chunkLines = useMemo(() => {
    return file.chunks.map(chunk => buildSideBySideLinesFromChunk(chunk))
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

  const renderLeftLine = (line: SideBySideLine, index: number, pairedRight?: DiffLine | null) => (
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
            pairedContent={pairedRight?.type === 'add' ? pairedRight.content : undefined}
          />
        )}
      </pre>
    </div>
  )

  const renderRightLine = (line: SideBySideLine, index: number, pairedLeft?: DiffLine | null) => {
    const lineNumber = line.right?.newLineNumber
    const hasPrComment = lineNumber !== undefined && prCommentLines.has(lineNumber)

    return (
      <div
        key={index}
        className={cn(
          'flex relative',
          line.right?.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]',
          hasPrComment && !line.right?.type && 'bg-blue-500/10 border-l-2 border-l-blue-500',
          hasPrComment && line.right?.type === 'add' && 'ring-1 ring-inset ring-blue-500/30'
        )}
      >
        <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
          {line.right?.newLineNumber ?? ''}
        </span>
        <span className="w-6 flex items-center justify-center">
          {hasPrComment && (
            <MessageSquare className="w-3 h-3 text-blue-500" />
          )}
          {getCommentForLine(line.right?.newLineNumber) && (
            <CommentIndicator comment={getCommentForLine(line.right?.newLineNumber)!} />
          )}
        </span>
        <pre className="flex-1 px-2 min-h-[1.5rem]">
          {line.right && (
            <TokenizedLine
              content={line.right.content}
              filePath={file.path}
              lineType={line.right.type}
              pairedContent={pairedLeft?.type === 'remove' ? pairedLeft.content : undefined}
            />
          )}
        </pre>
      </div>
    )
  }

  const allLines: { type: 'line' | 'expand'; line?: SideBySideLine; chunkIndex?: number; direction?: 'up' | 'down'; hiddenLines?: number; isLoading?: boolean }[] = []

  file.chunks.forEach((_, chunkIndex) => {
    const hiddenLinesUp = calculateHiddenLinesUp(chunkIndex)
    const expandedLinesUp = getExpandedLinesForChunk(chunkIndex, 'up')
    const expandedLinesDown = getExpandedLinesForChunk(chunkIndex, 'down')
    const isLoadingUp = expandingChunk?.chunkIndex === chunkIndex && expandingChunk?.direction === 'up'
    const isLoadingDown = expandingChunk?.chunkIndex === chunkIndex && expandingChunk?.direction === 'down'

    if (hiddenLinesUp > 0) {
      allLines.push({ type: 'expand', chunkIndex, direction: 'up', hiddenLines: hiddenLinesUp, isLoading: isLoadingUp })
    }

    const expandedUpLines = buildSideBySideLinesFromLines(expandedLinesUp)
    expandedUpLines.forEach(line => allLines.push({ type: 'line', line }))

    chunkLines[chunkIndex].forEach(line => allLines.push({ type: 'line', line }))

    const expandedDownLines = buildSideBySideLinesFromLines(expandedLinesDown)
    expandedDownLines.forEach(line => allLines.push({ type: 'line', line }))

    if (chunkIndex === file.chunks.length - 1) {
      allLines.push({ type: 'expand', chunkIndex, direction: 'down', hiddenLines: 0, isLoading: isLoadingDown })
    }
  })

  return (
    <DiffContainer className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
        <span className="text-xs">{file.path}</span>
      </div>
      <div>
        {allLines.map((item, index) => {
          if (item.type === 'expand') {
            return (
              <ExpandButton
                key={`expand-${index}`}
                direction={item.direction!}
                hiddenLines={item.hiddenLines!}
                onExpand={(count) => handleExpand(item.chunkIndex!, item.direction!, count)}
                loading={item.isLoading}
              />
            )
          }
          const lineNumber = item.line?.right?.newLineNumber
          const lineComments = lineNumber ? prCommentsByLine.get(lineNumber) : undefined
          return (
            <div key={index}>
              <div className="flex">
                <div className="flex-1 border-r border-border">
                  {renderLeftLine(item.line!, index, item.line?.right)}
                </div>
                <div className="flex-1">
                  {renderRightLine(item.line!, index, item.line?.left)}
                </div>
              </div>
              {lineComments && lineComments.length > 0 && (
                <InlineComment comments={lineComments} />
              )}
            </div>
          )
        })}
      </div>
    </DiffContainer>
  )
}
