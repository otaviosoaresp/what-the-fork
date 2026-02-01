import { useCallback, useEffect, useRef, useState } from 'react'
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
}

export function FileList({ files, selectedFile }: FileListProps) {
  const { selectFile } = useDiffStore()
  const { fileListHeight, setFileListHeight } = useUIStore()
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

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
      <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Files Changed ({files.length})
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: `${fileListHeight}px` }}
      >
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => selectFile(file)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
              selectedFile?.path === file.path && 'bg-muted'
            )}
          >
            <span className="truncate font-mono text-xs">{file.path}</span>
            <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
              <span className="text-success">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
