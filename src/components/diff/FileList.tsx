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
    <div ref={containerRef} className="border-t border-border bg-background/50 flex flex-col">
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'h-1 cursor-ns-resize hover:bg-accent/50 transition-colors flex-shrink-0',
          isDragging && 'bg-accent'
        )}
      />
      <div className="px-4 py-2 flex items-center justify-between text-xs font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">
        <span>Files Changed ({files.length})</span>
        <span className="text-[10px] normal-case">drag to resize</span>
      </div>
      <div
        className="overflow-y-auto flex-1"
        style={{ height: fileListHeight }}
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
