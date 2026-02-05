import { MessageSquare, AlertTriangle, Zap, BookOpen, Lightbulb, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReviewComment, CommentType } from '@/types/electron'

interface PRComment {
  id: number
  path: string
  line: number | null
  body: string
  author: string
  createdAt: string
  isResolved?: boolean
  isOutdated?: boolean
  threadId?: string | null
}

interface InlineCommentProps {
  prComments?: PRComment[]
  reviewComments?: ReviewComment[]
}

const commentTypeConfig: Record<CommentType, { icon: typeof AlertTriangle; color: string; label: string }> = {
  bug: { icon: AlertTriangle, color: 'text-red-500', label: 'Bug' },
  performance: { icon: Zap, color: 'text-yellow-500', label: 'Performance' },
  readability: { icon: BookOpen, color: 'text-purple-500', label: 'Readability' },
  suggestion: { icon: Lightbulb, color: 'text-blue-500', label: 'Suggestion' },
  positive: { icon: ThumbsUp, color: 'text-green-500', label: 'Positive' }
}

export function InlineComment({ prComments = [], reviewComments = [] }: InlineCommentProps) {
  if (prComments.length === 0 && reviewComments.length === 0) return null

  return (
    <div className="mx-2 my-1 space-y-1">
      {prComments.length > 0 && (
        <div className="bg-blue-500/5 border-l-2 border-blue-500 rounded-r">
          {prComments.map(comment => (
            <div key={comment.id} className="px-3 py-2 border-b border-blue-500/20 last:border-b-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MessageSquare className="w-3 h-3 text-blue-500" />
                <span className="font-medium text-blue-400">{comment.author}</span>
                <span className="text-muted">·</span>
                <span>{formatDate(comment.createdAt)}</span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap">
                {comment.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewComments.length > 0 && (
        <div className="space-y-1">
          {reviewComments.map((comment, idx) => {
            const config = commentTypeConfig[comment.type]
            const Icon = config.icon
            return (
              <div
                key={idx}
                className={cn(
                  'rounded-r px-3 py-2 border-l-2',
                  comment.type === 'bug' && 'bg-red-500/5 border-red-500',
                  comment.type === 'performance' && 'bg-yellow-500/5 border-yellow-500',
                  comment.type === 'readability' && 'bg-purple-500/5 border-purple-500',
                  comment.type === 'suggestion' && 'bg-blue-500/5 border-blue-500',
                  comment.type === 'positive' && 'bg-green-500/5 border-green-500'
                )}
              >
                <div className="flex items-center gap-2 text-xs mb-1">
                  <Icon className={cn('w-3 h-3', config.color)} />
                  <span className={cn('font-medium', config.color)}>{config.label}</span>
                  <span className="text-muted">· AI Review</span>
                </div>
                <div className="text-sm text-foreground whitespace-pre-wrap">
                  {comment.content}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
