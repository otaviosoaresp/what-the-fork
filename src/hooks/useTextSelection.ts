import { useState, useEffect, useCallback, useRef } from 'react'

interface TextSelection {
  text: string
  rect: DOMRect | null
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelection>({ text: '', rect: null })
  const isSelectingRef = useRef(false)

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !containerRef.current) {
      if (!isSelectingRef.current) {
        setSelection({ text: '', rect: null })
      }
      return
    }

    const range = sel.getRangeAt(0)
    const container = containerRef.current

    if (!container.contains(range.commonAncestorContainer)) {
      return
    }

    const text = sel.toString().trim()
    if (text.length < 3) {
      setSelection({ text: '', rect: null })
      return
    }

    const rect = range.getBoundingClientRect()
    setSelection({ text, rect })
  }, [containerRef])

  const handleMouseDown = useCallback(() => {
    isSelectingRef.current = true
  }, [])

  const handleMouseUp = useCallback(() => {
    isSelectingRef.current = false
    setTimeout(handleSelectionChange, 10)
  }, [handleSelectionChange])

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    setSelection({ text: '', rect: null })
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleSelectionChange, handleMouseDown, handleMouseUp])

  return { selection, clearSelection }
}
