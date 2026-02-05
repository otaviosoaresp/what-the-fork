import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { SelectionPopover } from '@/components/review/SelectionPopover'

interface DiffContainerProps {
  children: React.ReactNode
  className?: string
}

interface PopoverState {
  text: string
  rect: DOMRect
}

export const DiffContainer = forwardRef<HTMLDivElement, DiffContainerProps>(function DiffContainer({ children, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => containerRef.current!, [])
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const isInteractingWithPopover = useRef(false)

  const handleMouseUp = useCallback(() => {
    if (isInteractingWithPopover.current) return

    setTimeout(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !containerRef.current) {
        setPopover(null)
        return
      }

      const text = sel.toString().trim()
      if (text.length < 3) {
        setPopover(null)
        return
      }

      const range = sel.getRangeAt(0)
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        return
      }

      const rect = range.getBoundingClientRect()
      setPopover({ text, rect })
    }, 10)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const popoverElement = document.querySelector('[data-popover="selection"]')
    if (popoverElement?.contains(target)) {
      isInteractingWithPopover.current = true
    } else {
      isInteractingWithPopover.current = false
      setPopover(null)
    }
  }, [])

  const handleClose = useCallback(() => {
    setPopover(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      {children}
      {popover && (
        <SelectionPopover
          text={popover.text}
          rect={popover.rect}
          onClose={handleClose}
        />
      )}
    </div>
  )
})
