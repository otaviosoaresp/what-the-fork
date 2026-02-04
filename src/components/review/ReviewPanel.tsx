import { useReviewStore } from '@/stores/review'
import { X, Loader2 } from 'lucide-react'

interface MarkdownContentProps {
  content: string
}

function MarkdownContent({ content }: MarkdownContentProps) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `line-${i}`

    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      elements.push(
        <pre key={key} className="bg-muted px-3 py-1 text-sm font-mono overflow-x-auto">
          {line}
        </pre>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<br key={key} />)
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key} className="text-base font-semibold mt-4 mb-2">
          {formatInlineMarkdown(line.slice(4))}
        </h3>
      )
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key} className="text-lg font-semibold mt-4 mb-2">
          {formatInlineMarkdown(line.slice(3))}
        </h2>
      )
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key} className="text-xl font-bold mt-4 mb-2">
          {formatInlineMarkdown(line.slice(2))}
        </h1>
      )
      continue
    }

    if (line.startsWith('- ')) {
      elements.push(
        <li key={key} className="ml-4 list-disc">
          {formatInlineMarkdown(line.slice(2))}
        </li>
      )
      continue
    }

    elements.push(
      <p key={key} className="mb-2">
        {formatInlineMarkdown(line)}
      </p>
    )
  }

  return <div className="text-sm leading-relaxed">{elements}</div>
}

function formatInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  while (remaining.length > 0) {
    const inlineCodeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
    if (inlineCodeMatch) {
      if (inlineCodeMatch[1]) {
        parts.push(...parseEmphasis(inlineCodeMatch[1], keyIndex))
        keyIndex += 10
      }
      parts.push(
        <code key={`code-${keyIndex}`} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
          {inlineCodeMatch[2]}
        </code>
      )
      keyIndex++
      remaining = inlineCodeMatch[3]
      continue
    }

    parts.push(...parseEmphasis(remaining, keyIndex))
    break
  }

  return parts.length === 1 ? parts[0] : parts
}

function parseEmphasis(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = startKey

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/)
    if (boldMatch) {
      if (boldMatch[1]) {
        parts.push(...parseItalic(boldMatch[1], keyIndex))
        keyIndex += 5
      }
      parts.push(
        <strong key={`bold-${keyIndex}`} className="font-semibold">
          {boldMatch[2]}
        </strong>
      )
      keyIndex++
      remaining = boldMatch[3]
      continue
    }

    parts.push(...parseItalic(remaining, keyIndex))
    break
  }

  return parts
}

function parseItalic(text: string, startKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = startKey

  while (remaining.length > 0) {
    const italicMatch = remaining.match(/^(.*?)\*([^*]+)\*(.*)$/)
    if (italicMatch) {
      if (italicMatch[1]) {
        parts.push(<span key={`text-${keyIndex}`}>{italicMatch[1]}</span>)
        keyIndex++
      }
      parts.push(
        <em key={`italic-${keyIndex}`} className="italic">
          {italicMatch[2]}
        </em>
      )
      keyIndex++
      remaining = italicMatch[3]
      continue
    }

    if (remaining) {
      parts.push(<span key={`text-${keyIndex}`}>{remaining}</span>)
    }
    break
  }

  return parts
}

export function ReviewPanel() {
  const { isOpen, isLoading, content, error, provider, closePanel } = useReviewStore()

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

      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Analisando...</span>
          </div>
        )}

        {error && !isLoading && (
          <div className="text-destructive">
            <h3 className="font-semibold mb-2">Erro</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {content && !isLoading && !error && (
          <MarkdownContent content={content} />
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
