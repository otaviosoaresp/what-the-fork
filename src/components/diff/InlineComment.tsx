import { MessageSquare, AlertTriangle, Zap, BookOpen, Lightbulb, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReviewComment, CommentType } from '@/types/electron'
import { useMemo } from 'react'

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

const commentTypeConfig: Record<CommentType, {
  icon: typeof AlertTriangle
  bgClass: string
  borderClass: string
  accentClass: string
  label: string
}> = {
  bug: {
    icon: AlertTriangle,
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-500/40',
    accentClass: 'text-red-400',
    label: 'Bug'
  },
  performance: {
    icon: Zap,
    bgClass: 'bg-yellow-950/40',
    borderClass: 'border-yellow-500/40',
    accentClass: 'text-yellow-400',
    label: 'Performance'
  },
  readability: {
    icon: BookOpen,
    bgClass: 'bg-purple-950/40',
    borderClass: 'border-purple-500/40',
    accentClass: 'text-purple-400',
    label: 'Readability'
  },
  suggestion: {
    icon: Lightbulb,
    bgClass: 'bg-blue-950/40',
    borderClass: 'border-blue-500/40',
    accentClass: 'text-blue-400',
    label: 'Suggestion'
  },
  positive: {
    icon: ThumbsUp,
    bgClass: 'bg-green-950/40',
    borderClass: 'border-green-500/40',
    accentClass: 'text-green-400',
    label: 'Positive'
  }
}

function parseMarkdown(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let key = 0

  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  const parts = text.split(codeBlockRegex)

  let i = 0
  while (i < parts.length) {
    const part = parts[i]

    if (i > 0 && (i - 1) % 3 === 0) {
      i++
      continue
    }

    if (i > 0 && (i - 2) % 3 === 0) {
      const code = parts[i]
      elements.push(
        <pre
          key={key++}
          className="my-2 p-3 bg-black/40 rounded border border-white/10 overflow-x-auto"
        >
          <code className="text-xs font-mono text-emerald-300">{code.trim()}</code>
        </pre>
      )
      i++
      continue
    }

    const inlineElements = parseInlineMarkdown(part, key)
    elements.push(...inlineElements.elements)
    key = inlineElements.nextKey
    i++
  }

  return elements
}

function parseInlineMarkdown(text: string, startKey: number): { elements: React.ReactNode[], nextKey: number } {
  const elements: React.ReactNode[] = []
  let key = startKey

  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index))
    }

    const matched = match[0]

    if (matched.startsWith('`') && matched.endsWith('`')) {
      const code = matched.slice(1, -1)
      elements.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 bg-black/50 rounded text-xs font-mono text-amber-300 border border-white/10"
        >
          {code}
        </code>
      )
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      elements.push(
        <strong key={key++} className="font-semibold text-foreground">
          {matched.slice(2, -2)}
        </strong>
      )
    } else if ((matched.startsWith('*') && matched.endsWith('*')) ||
               (matched.startsWith('_') && matched.endsWith('_'))) {
      elements.push(
        <em key={key++} className="italic">
          {matched.slice(1, -1)}
        </em>
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }

  return { elements, nextKey: key }
}

export function InlineComment({ prComments = [], reviewComments = [] }: InlineCommentProps) {
  if (prComments.length === 0 && reviewComments.length === 0) return null

  return (
    <div className="mx-4 my-3 space-y-2">
      {prComments.length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-950/30 shadow-sm shadow-blue-500/5 overflow-hidden">
          {prComments.map((comment, idx) => (
            <div
              key={comment.id}
              className={cn(
                'px-4 py-3',
                idx > 0 && 'border-t border-blue-500/20'
              )}
            >
              <div className="flex items-center gap-2 text-xs mb-2">
                <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-500/20">
                  <MessageSquare className="w-3 h-3 text-blue-400" />
                </div>
                <span className="font-medium text-blue-300">{comment.author}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/60">{formatDate(comment.createdAt)}</span>
                {comment.isResolved && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                    Resolved
                  </span>
                )}
              </div>
              <div className="text-sm text-foreground/90 leading-relaxed">
                <MarkdownContent content={comment.body} />
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewComments.length > 0 && (
        <div className="space-y-2">
          {reviewComments.map((comment, idx) => {
            const config = commentTypeConfig[comment.type]
            const Icon = config.icon
            return (
              <div
                key={idx}
                className={cn(
                  'rounded-lg border shadow-sm overflow-hidden',
                  config.bgClass,
                  config.borderClass
                )}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <div className={cn(
                      'flex items-center justify-center w-5 h-5 rounded',
                      comment.type === 'bug' && 'bg-red-500/20',
                      comment.type === 'performance' && 'bg-yellow-500/20',
                      comment.type === 'readability' && 'bg-purple-500/20',
                      comment.type === 'suggestion' && 'bg-blue-500/20',
                      comment.type === 'positive' && 'bg-green-500/20'
                    )}>
                      <Icon className={cn('w-3 h-3', config.accentClass)} />
                    </div>
                    <span className={cn('font-medium', config.accentClass)}>{config.label}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="text-muted-foreground/60">AI Review</span>
                  </div>
                  <div className="text-sm text-foreground/90 leading-relaxed">
                    <MarkdownContent content={comment.content} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const parsed = useMemo(() => parseMarkdown(content), [content])
  return <div className="space-y-1">{parsed}</div>
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
