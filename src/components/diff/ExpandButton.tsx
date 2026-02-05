import { ChevronUp, ChevronDown } from 'lucide-react'

interface ExpandButtonProps {
  direction: 'up' | 'down'
  hiddenLines: number
  onExpand: (count: number) => void
  loading?: boolean
}

export function ExpandButton({ direction, hiddenLines, onExpand, loading }: ExpandButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown
  const count = Math.min(20, hiddenLines)

  if (hiddenLines <= 0) return null

  return (
    <div className="flex items-center justify-center py-1 bg-muted/30 border-y border-border">
      <button
        onClick={() => onExpand(count)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
      >
        <Icon className="w-3 h-3" />
        <span>
          {hiddenLines <= 20
            ? `Show ${hiddenLines} hidden lines`
            : `Load ${count} more lines`}
        </span>
        {hiddenLines > 20 && (
          <span className="text-muted">({hiddenLines} total)</span>
        )}
      </button>
    </div>
  )
}
