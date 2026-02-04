import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { useReviewStore } from '@/stores/review'
import { cn } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'
import type { DiffFile } from '../../../electron/git/types'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
}

export function FileList({ files, selectedFile }: FileListProps) {
  const { selectFile } = useDiffStore()
  const { fileListHeight, setFileListHeight } = useUIStore()
  const { comments } = useReviewStore()
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return files.filter(f => f.path.toLowerCase().includes(query))
  }, [files, searchQuery])

  const getCommentCount = useCallback((filePath: string) => {
    const normalizedPath = filePath.replace(/^\.?\//, '')
    return comments.filter(c => {
      const normalizedCommentPath = c.file.replace(/^\.?\//, '')
      return (
        normalizedCommentPath === normalizedPath ||
        normalizedCommentPath.endsWith('/' + normalizedPath) ||
        normalizedPath.endsWith('/' + normalizedCommentPath)
      )
    }).length
  }, [comments])

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
      <div className="px-4 py-1.5 flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Files Changed ({files.length})
        </span>
        <div className="relative flex-1 max-w-xs">
          <svg className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && filteredFiles.length !== files.length && (
          <span className="text-xs text-muted-foreground">
            {filteredFiles.length} found
          </span>
        )}
      </div>
      <div
        className="overflow-y-auto"
        style={{ height: `${fileListHeight}px` }}
      >
        {filteredFiles.map(file => {
          const commentCount = getCommentCount(file.path)
          return (
            <button
              key={file.path}
              onClick={() => selectFile(file)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
                selectedFile?.path === file.path && 'bg-muted'
              )}
            >
              <span className="truncate font-mono text-xs flex items-center gap-2">
                {file.path}
                {commentCount > 0 && (
                  <span className="flex items-center gap-0.5 text-yellow-400" title={`${commentCount} comentario(s)`}>
                    <MessageCircle size={10} />
                    <span className="text-[10px]">{commentCount}</span>
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
                <span className="text-success">+{file.additions}</span>
                <span className="text-destructive">-{file.deletions}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
