import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/shared/MarkdownContent'
import type { ReviewComment } from '@/types/electron'

interface CommentIndicatorProps {
  comment: ReviewComment
}

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  bug: { bg: 'bg-red-500/20', border: 'border-red-500/50', icon: 'text-red-400' },
  performance: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: 'text-orange-400' },
  readability: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: 'text-blue-400' },
  suggestion: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: 'text-yellow-400' },
  positive: { bg: 'bg-green-500/20', border: 'border-green-500/50', icon: 'text-green-400' }
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  performance: 'Performance',
  readability: 'Legibilidade',
  suggestion: 'Sugestao',
  positive: 'Positivo'
}

export function CommentIndicator({ comment }: CommentIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const colors = TYPE_COLORS[comment.type] || TYPE_COLORS.suggestion

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, left: rect.left })
    setShowPopover(!showPopover)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors',
          colors.bg,
          'hover:opacity-80'
        )}
        title={TYPE_LABELS[comment.type]}
      >
        <MessageCircle size={12} className={colors.icon} />
      </button>
      {showPopover && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div
            className={cn(
              'fixed z-50 w-96 max-h-80 rounded-lg shadow-lg border bg-background flex flex-col',
              colors.border
            )}
            style={{ top: position.top, left: position.left }}
          >
            <div className={cn('flex items-center justify-between p-3 border-b', colors.border)}>
              <span className={cn('text-xs font-medium', colors.icon)}>
                {TYPE_LABELS[comment.type]}
              </span>
              <button
                onClick={() => setShowPopover(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <MarkdownContent content={comment.content} className="text-sm leading-relaxed" />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
