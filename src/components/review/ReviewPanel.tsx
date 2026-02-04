import { useMemo } from 'react'
import { useReviewStore } from '@/stores/review'
import { useDiffStore } from '@/stores/diff'
import { X, Loader2, FileCode } from 'lucide-react'
import { parseCodeReferences } from '@/lib/review-parser'
import { MarkdownContent } from '@/components/shared/MarkdownContent'

export function ReviewPanel() {
  const { isOpen, isLoading, content, error, provider, generalNotes, closePanel, setLoading } = useReviewStore()
  const { files, selectFile } = useDiffStore()

  const handleCancel = async () => {
    try {
      await window.electron.review.cancel()
    } catch {
      // ignore
    }
    setLoading(false)
  }

  const references = useMemo(() => {
    if (!content) return []
    return parseCodeReferences(content)
  }, [content])

  const handleReferenceClick = (filePath: string, _line: number) => {
    const normalizedPath = filePath.replace(/^\.?\//, '')

    const file = files.find(f => {
      const normalizedFilePath = f.path.replace(/^\.?\//, '')
      return (
        normalizedFilePath === normalizedPath ||
        normalizedFilePath.endsWith('/' + normalizedPath) ||
        normalizedFilePath.endsWith(normalizedPath) ||
        normalizedPath.endsWith(normalizedFilePath)
      )
    })

    if (file) {
      selectFile(file)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="w-96 border-l border-border flex flex-col bg-background">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">AI Review</span>
          {provider && (
            <span className="text-xs text-muted-foreground">({provider})</span>
          )}
        </div>
        <button
          onClick={closePanel}
          className="btn btn-ghost btn-icon"
          title="Close"
        >
          <X size={16} />
        </button>
      </div>

      {references.length > 0 && content && !isLoading && (
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <FileCode size={12} />
            <span>{references.length} referencias</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {references.slice(0, 5).map((ref, i) => (
              <button
                key={i}
                onClick={() => handleReferenceClick(ref.file, ref.line)}
                className="text-xs bg-muted hover:bg-muted/80 px-2 py-0.5 rounded transition-colors"
                title={ref.text}
              >
                {ref.file.split('/').pop()}:{ref.line}
              </button>
            ))}
            {references.length > 5 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">
                +{references.length - 5} mais
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <button
            onClick={handleCancel}
            className="flex flex-col items-center justify-center h-full gap-3 w-full hover:bg-muted/50 transition-colors cursor-pointer rounded-lg"
          >
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Analisando... (clique para cancelar)</span>
          </button>
        )}

        {error && !isLoading && (
          <div className="text-destructive">
            <h3 className="font-semibold mb-2">Erro</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {content && !isLoading && !error && (
          <>
            <MarkdownContent content={content} onReferenceClick={handleReferenceClick} />
            {generalNotes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold mb-2">Observacoes Gerais</h3>
                <ul className="text-sm space-y-1">
                  {generalNotes.map((note, i) => (
                    <li key={i} className="text-muted-foreground">- {note}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !content && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Clique em 'Review' para analisar a branch
          </p>
        )}
      </div>
    </div>
  )
}
