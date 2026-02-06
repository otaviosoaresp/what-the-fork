import { MessageSquare, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useGitHubStore } from '@/stores/github'
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'

interface PRCommentsPanelProps {
  onCommentClick: (path: string, line: number) => void
}

export function PRCommentsPanel({ onCommentClick }: PRCommentsPanelProps) {
  const { prComments, prCommentsLoading } = useGitHubStore()
  const { selectedFile } = useDiffStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  const commentsByFile = useMemo(() => {
    return prComments.reduce((acc, comment) => {
      const path = comment.path
      if (!acc[path]) acc[path] = []
      acc[path].push(comment)
      return acc
    }, {} as Record<string, typeof prComments>)
  }, [prComments])

  if (prCommentsLoading) {
    return (
      <div className="w-72 border-l border-border bg-background flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">PR Comments</span>
        </div>
        <div className="flex-1 flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (prComments.length === 0) {
    return null
  }

  const isSelectedFilePath = (path: string): boolean => {
    if (!selectedFile) return false
    const normalizedSelected = selectedFile.path.replace(/^\.?\//, '')
    const normalizedPath = path.replace(/^\.?\//, '')
    return normalizedSelected === normalizedPath
  }

  return (
    <div className="w-72 border-l border-border bg-background flex flex-col">
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border cursor-pointer hover:bg-muted"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">PR Comments ({prComments.length})</span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(commentsByFile).map(([path, comments]) => {
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
                {comments.map(comment => {
                  const isExpanded = expandedComments.has(comment.id)
                  const toggleExpand = (e: React.MouseEvent) => {
                    e.stopPropagation()
                    setExpandedComments(prev => {
                      const next = new Set(prev)
                      if (next.has(comment.id)) {
                        next.delete(comment.id)
                      } else {
                        next.add(comment.id)
                      }
                      return next
                    })
                  }
                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        'px-3 py-2 transition-colors border-b border-border/50 last:border-b-0',
                        comment.line ? 'hover:bg-muted' : 'opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.author}</span>
                          <span>line {comment.line ?? '?'}</span>
                        </div>
                        {comment.line && (
                          <button
                            onClick={() => onCommentClick(comment.path, comment.line!)}
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
                          onClick={toggleExpand}
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
      )}
    </div>
  )
}
