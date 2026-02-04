import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircleQuestion, X, Send, Loader2 } from 'lucide-react'
import { useRepositoryStore } from '@/stores/repository'
import { useReviewStore } from '@/stores/review'

interface SelectionPopoverProps {
  text: string
  rect: DOMRect
  onClose: () => void
}

export function SelectionPopover({ text, rect, onClose }: SelectionPopoverProps) {
  const [showInput, setShowInput] = useState(false)
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const { repoPath } = useRepositoryStore()
  const { openPanel, setLoading, setContent, setError } = useReviewStore()

  const top = rect.top - 40
  const left = rect.left + rect.width / 2

  const handleAsk = async () => {
    if (!repoPath || !question.trim() || isAsking || !text) return

    setIsAsking(true)
    openPanel()
    setLoading(true)

    try {
      const result = await window.electron.review.ask(repoPath, text, question.trim())
      setContent(result.content, result.provider)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer')
    } finally {
      setIsAsking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
    if (e.key === 'Escape') {
      if (showInput) {
        setShowInput(false)
        setQuestion('')
      } else {
        onClose()
      }
    }
  }

  return createPortal(
    <div
      data-popover="selection"
      className="fixed z-50 flex flex-col items-center"
      style={{ top, left, transform: 'translate(-50%, -100%)' }}
    >
      {showInput ? (
        <div className="bg-background border border-border rounded-lg shadow-lg p-2 min-w-72">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground flex-1">
              Perguntar sobre o codigo selecionado
            </span>
            <button
              onClick={() => {
                setShowInput(false)
                setQuestion('')
              }}
              className="btn btn-ghost btn-icon p-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              className="input flex-1 text-sm"
              autoFocus
              disabled={isAsking}
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isAsking}
              className="btn btn-primary btn-icon"
            >
              {isAsking ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="mt-2 max-h-20 overflow-auto">
            <pre className="text-xs text-muted-foreground bg-muted p-2 rounded whitespace-pre-wrap break-all">
              {text.length > 200 ? text.slice(0, 200) + '...' : text}
            </pre>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="bg-accent text-accent-foreground rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <MessageCircleQuestion size={16} />
          Perguntar
        </button>
      )}
      <div
        className="w-2 h-2 bg-background border-b border-r border-border rotate-45 -mt-1"
        style={{ marginLeft: showInput ? 0 : undefined }}
      />
    </div>,
    document.body
  )
}
