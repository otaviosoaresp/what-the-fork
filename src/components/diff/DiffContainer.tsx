import { useRef } from 'react'
import { useTextSelection } from '@/hooks/useTextSelection'
import { SelectionPopover } from '@/components/review/SelectionPopover'

interface DiffContainerProps {
  children: React.ReactNode
  className?: string
}

export function DiffContainer({ children, className }: DiffContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { selection, clearSelection } = useTextSelection(containerRef)

  return (
    <div ref={containerRef} className={className}>
      {children}
      {selection.text && selection.rect && (
        <SelectionPopover
          text={selection.text}
          rect={selection.rect}
          onClose={clearSelection}
        />
      )}
    </div>
  )
}
