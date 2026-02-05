import { MessageSquare } from 'lucide-react'

interface PRComment {
  id: number
  path: string
  line: number | null
  body: string
  author: string
  createdAt: string
}

interface InlineCommentProps {
  comments: PRComment[]
}

export function InlineComment({ comments }: InlineCommentProps) {
  if (comments.length === 0) return null

  return (
    <div className="bg-blue-500/5 border-l-2 border-blue-500 mx-2 my-1 rounded-r">
      {comments.map(comment => (
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
