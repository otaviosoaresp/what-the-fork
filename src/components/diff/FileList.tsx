import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { useReviewStore } from '@/stores/review'
import { useGitHubStore } from '@/stores/github'
import { cn } from '@/lib/utils'
import { MessageCircle, MessageSquare, Loader2, CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import type { DiffFile } from '../../../electron/git/types'

type TabType = 'files' | 'comments' | 'review'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
  onCommentClick?: (path: string, line: number) => void
}

export function FileList({ files, selectedFile, onCommentClick }: FileListProps) {
  const { selectFile, selectFileAndLine } = useDiffStore()
  const { fileListHeight, setFileListHeight } = useUIStore()
  const { comments } = useReviewStore()
  const { prComments, prCommentsLoading } = useGitHubStore()
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('files')
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return files.filter(f => f.path.toLowerCase().includes(query))
  }, [files, searchQuery])

  const getCommentCount = useCallback((filePath: string) => {
    const normalizedPath = filePath.replace(/^\.?\//, '')
    return comments.filter(c => {
      const normalizedCommentPath = c.file.replace(/^\.?\//, '')
      return (
        normalizedCommentPath === normalizedPath ||
        normalizedCommentPath.endsWith('/' + normalizedPath) ||
        normalizedPath.endsWith('/' + normalizedCommentPath)
      )
    }).length
  }, [comments])

  const prCommentsByFile = useMemo(() => {
    return prComments.reduce((acc, comment) => {
      const path = comment.path
      if (!acc[path]) acc[path] = []
      acc[path].push(comment)
      return acc
    }, {} as Record<string, typeof prComments>)
  }, [prComments])

  const reviewCommentsByFile = useMemo(() => {
    return comments.reduce((acc, comment) => {
      const path = comment.file
      if (!acc[path]) acc[path] = []
      acc[path].push(comment)
      return acc
    }, {} as Record<string, typeof comments>)
  }, [comments])

  const prCommentsCounts = useMemo(() => {
    const uniqueThreads = new Map<string, boolean>()
    prComments.forEach(c => {
      if (c.threadId && !uniqueThreads.has(c.threadId)) {
        uniqueThreads.set(c.threadId, c.isResolved)
      }
    })
    const resolved = Array.from(uniqueThreads.values()).filter(Boolean).length
    const pending = uniqueThreads.size - resolved
    return { resolved, pending, total: uniqueThreads.size }
  }, [prComments])

  const isSelectedFilePath = useCallback((path: string): boolean => {
    if (!selectedFile) return false
    const normalizedSelected = selectedFile.path.replace(/^\.?\//, '')
    const normalizedPath = path.replace(/^\.?\//, '')
    return normalizedSelected === normalizedPath
  }, [selectedFile])

  const handleCommentNavigate = useCallback((path: string, line: number) => {
    if (onCommentClick) {
      onCommentClick(path, line)
    } else {
      const file = files.find(f => {
        const normalizedFilePath = f.path.replace(/^\.?\//, '')
        const normalizedCommentPath = path.replace(/^\.?\//, '')
        return normalizedFilePath === normalizedCommentPath
      })
      if (file) {
        selectFileAndLine(file, line)
      }
    }
  }, [files, onCommentClick, selectFileAndLine])

  const toggleCommentExpand = useCallback((id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = fileListHeight
  }, [fileListHeight])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startYRef.current - e.clientY
      const newHeight = startHeightRef.current + delta
      setFileListHeight(newHeight)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setFileListHeight])

  const renderFilesTab = () => (
    <>
      <div className="px-4 py-1.5 flex items-center gap-3 border-b border-border">
        <div className="relative flex-1 max-w-xs">
          <svg className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && filteredFiles.length !== files.length && (
          <span className="text-xs text-muted-foreground">
            {filteredFiles.length} found
          </span>
        )}
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: `${fileListHeight}px` }}
      >
        {filteredFiles.map(file => {
          const commentCount = getCommentCount(file.path)
          return (
            <button
              key={file.path}
              onClick={() => selectFile(file)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
                selectedFile?.path === file.path && 'bg-muted'
              )}
            >
              <span className="truncate font-mono text-xs flex items-center gap-2">
                {file.path}
                {commentCount > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-400" title={`${commentCount} comentario(s)`}>
                    <MessageCircle size={10} />
                    <span className="text-[10px]">{commentCount}</span>
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                <span className="text-success">+{file.additions}</span>
                <span className="text-destructive">-{file.deletions}</span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )

  const renderCommentsTab = () => {
    if (prCommentsLoading) {
      return (
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (prComments.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground text-sm">
          No PR comments
        </div>
      )
    }

    return (
      <div
        className="overflow-y-auto"
        style={{ height: `${fileListHeight}px` }}
      >
        {Object.entries(prCommentsByFile).map(([path, fileComments]) => {
          const isSelected = isSelectedFilePath(path)
          return (
            <div
              key={path}
              className={cn(
                'border-b border-border',
                isSelected && 'ring-1 ring-accent ring-inset'
              )}
            >
              <div
                className={cn(
                  'px-3 py-1.5 text-xs truncate',
                  isSelected
                    ? 'bg-accent/20 text-accent-foreground font-medium'
                    : 'bg-muted/50 text-muted-foreground'
                )}
                title={path}
              >
                {path}
              </div>
              {fileComments.map(comment => {
                const isExpanded = expandedComments.has(`pr-${comment.id}`)
                return (
                  <div
                    key={comment.id}
                    className={cn(
                      'px-3 py-2 transition-colors border-b border-border/50 last:border-b-0',
                      comment.line ? 'hover:bg-muted' : 'opacity-60',
                      comment.isResolved && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {comment.isResolved ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : comment.isOutdated ? (
                          <AlertCircle className="w-3 h-3 text-yellow-500" />
                        ) : (
                          <Circle className="w-3 h-3 text-blue-500" />
                        )}
                        <span className="font-medium">{comment.author}</span>
                        <span>line {comment.line ?? '?'}</span>
                        {comment.isResolved && (
                          <span className="text-green-500 text-[10px]">Resolved</span>
                        )}
                        {comment.isOutdated && !comment.isResolved && (
                          <span className="text-yellow-500 text-[10px]">Outdated</span>
                        )}
                      </div>
                      {comment.line && (
                        <button
                          onClick={() => handleCommentNavigate(comment.path, comment.line!)}
                          className="text-accent hover:underline"
                        >
                          Go to line
                        </button>
                      )}
                    </div>
                    <div
                      className={cn(
                        'text-sm text-foreground mt-1 whitespace-pre-wrap',
                        !isExpanded && 'line-clamp-3'
                      )}
                    >
                      {comment.body}
                    </div>
                    {comment.body.length > 150 && (
                      <button
                        onClick={() => toggleCommentExpand(`pr-${comment.id}`)}
                        className="text-xs text-accent hover:underline mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  const renderReviewTab = () => {
    if (comments.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground text-sm">
          No AI review comments
        </div>
      )
    }

    return (
      <div
        className="overflow-y-auto"
        style={{ height: `${fileListHeight}px` }}
      >
        {Object.entries(reviewCommentsByFile).map(([path, fileComments]) => {
          const isSelected = isSelectedFilePath(path)
          return (
            <div
              key={path}
              className={cn(
                'border-b border-border',
                isSelected && 'ring-1 ring-accent ring-inset'
              )}
            >
              <div
                className={cn(
                  'px-3 py-1.5 text-xs truncate',
                  isSelected
                    ? 'bg-accent/20 text-accent-foreground font-medium'
                    : 'bg-muted/50 text-muted-foreground'
                )}
                title={path}
              >
                {path}
              </div>
              {fileComments.map((comment, idx) => {
                const isExpanded = expandedComments.has(`review-${path}-${idx}`)
                return (
                  <div
                    key={`${path}-${idx}`}
                    className="px-3 py-2 transition-colors border-b border-border/50 last:border-b-0 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MessageCircle className={cn(
                          'w-3 h-3',
                          comment.type === 'bug' && 'text-red-500',
                          comment.type === 'performance' && 'text-yellow-500',
                          comment.type === 'readability' && 'text-purple-500',
                          comment.type === 'suggestion' && 'text-blue-500',
                          comment.type === 'positive' && 'text-green-500'
                        )} />
                        <span className="font-medium capitalize">{comment.type}</span>
                        <span>line {comment.line}</span>
                      </div>
                      <button
                        onClick={() => handleCommentNavigate(comment.file, comment.line)}
                        className="text-accent hover:underline"
                      >
                        Go to line
                      </button>
                    </div>
                    <div
                      className={cn(
                        'text-sm text-foreground mt-1 whitespace-pre-wrap',
                        !isExpanded && 'line-clamp-3'
                      )}
                    >
                      {comment.content}
                    </div>
                    {comment.content.length > 150 && (
                      <button
                        onClick={() => toggleCommentExpand(`review-${path}-${idx}`)}
                        className="text-xs text-accent hover:underline mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="border-t border-border bg-background/50 flex-shrink-0">
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'h-2 cursor-ns-resize flex items-center justify-center group hover:bg-muted/50',
          isDragging && 'bg-accent/30'
        )}
      >
        <div className={cn(
          'w-12 h-1 rounded-full bg-muted-foreground/30 group-hover:bg-accent transition-colors',
          isDragging && 'bg-accent'
        )} />
      </div>
      <div className="flex items-center gap-1 px-2 border-b border-border">
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors relative',
            activeTab === 'files'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Files Changed ({files.length})
          {activeTab === 'files' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
          )}
        </button>
        {prComments.length > 0 && (
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors relative flex items-center gap-1.5',
              activeTab === 'comments'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-3 h-3" />
            PR Comments
            {prCommentsCounts.pending > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <Circle className="w-2 h-2 fill-current" />
                {prCommentsCounts.pending}
              </span>
            )}
            {prCommentsCounts.resolved > 0 && (
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {prCommentsCounts.resolved}
              </span>
            )}
            {activeTab === 'comments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        )}
        {comments.length > 0 && (
          <button
            onClick={() => setActiveTab('review' as TabType)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium transition-colors relative flex items-center gap-1.5',
              activeTab === 'review'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageCircle className="w-3 h-3" />
            AI Review ({comments.length})
            {activeTab === 'review' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        )}
      </div>
      {activeTab === 'files' && renderFilesTab()}
      {activeTab === 'comments' && renderCommentsTab()}
      {activeTab === 'review' && renderReviewTab()}
    </div>
  )
}
