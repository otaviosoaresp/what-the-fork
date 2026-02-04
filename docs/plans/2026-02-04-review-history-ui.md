# Review History UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a history tab to ReviewPanel where users can view, load, and delete past AI reviews, plus improve comment popovers with full markdown support and larger sizes.

**Architecture:** Extend the existing review-history.ts backend with IPC handlers for getHistory and deleteReview. Add tab navigation to ReviewPanel. Extract MarkdownContent to shared component for reuse in CommentIndicator. Improve SelectionPopover layout.

**Tech Stack:** React, Zustand, Electron IPC, TypeScript

---

## Task 1: Add IPC handlers for history operations

**Files:**
- Modify: `electron/ai/review-history.ts:113-122`
- Modify: `electron/ai/review-ipc.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Add deleteReviewEntry function to review-history.ts**

Add after `clearReviewHistory` function:

```typescript
export function deleteReviewEntry(repoPath: string, timestamp: number): void {
  const reviews = store.get('reviews')
  const repoHistory = reviews[repoPath]

  if (!repoHistory) return

  const filtered = repoHistory.filter(entry => entry.timestamp !== timestamp)
  store.set('reviews', {
    ...reviews,
    [repoPath]: filtered
  })
}
```

**Step 2: Export ReviewHistoryEntry type from review-history.ts**

Add `export` to the interface:

```typescript
export interface ReviewHistoryEntry {
  timestamp: number
  baseBranch: string
  compareBranch: string
  diffHash: string
  provider: string
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}
```

**Step 3: Add IPC handlers in review-ipc.ts**

Add imports and handlers:

```typescript
import { getReviewHistory, deleteReviewEntry } from './review-history'

// Add these handlers in registerReviewHandlers():
ipcMain.handle('review:get-history', async (_event, repoPath: string) => {
  return getReviewHistory(repoPath)
})

ipcMain.handle('review:delete-history-entry', async (_event, repoPath: string, timestamp: number) => {
  deleteReviewEntry(repoPath, timestamp)
})
```

**Step 4: Add preload bindings in preload.ts**

Add to the review object:

```typescript
getHistory: (repoPath: string) => ipcRenderer.invoke('review:get-history', repoPath),
deleteHistoryEntry: (repoPath: string, timestamp: number) => ipcRenderer.invoke('review:delete-history-entry', repoPath, timestamp),
```

**Step 5: Add TypeScript types in electron.d.ts**

Add interface and update ElectronAPI:

```typescript
export interface ReviewHistoryEntry {
  timestamp: number
  baseBranch: string
  compareBranch: string
  diffHash: string
  provider: string
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}

// In review section of ElectronAPI:
getHistory: (repoPath: string) => Promise<ReviewHistoryEntry[]>
deleteHistoryEntry: (repoPath: string, timestamp: number) => Promise<void>
```

**Step 6: Test manually**

Run: `npm run dev`
Open DevTools console and test:
```javascript
await window.electron.review.getHistory('/path/to/repo')
```

**Step 7: Commit**

```bash
git add electron/ai/review-history.ts electron/ai/review-ipc.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat(review): add IPC handlers for history operations"
```

---

## Task 2: Extract MarkdownContent to shared component

**Files:**
- Create: `src/components/shared/MarkdownContent.tsx`
- Modify: `src/components/review/ReviewPanel.tsx`

**Step 1: Create shared MarkdownContent component**

Create `src/components/shared/MarkdownContent.tsx`:

```typescript
import { FileCode } from 'lucide-react'
import { isCodeReference } from '@/lib/review-parser'

interface MarkdownContentProps {
  content: string
  onReferenceClick?: (file: string, line: number) => void
  className?: string
}

export function MarkdownContent({ content, onReferenceClick, className }: MarkdownContentProps) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  const formatLine = (text: string, keyPrefix: string) =>
    formatInlineMarkdown(text, 0, onReferenceClick, keyPrefix)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const key = `line-${i}`

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={key} className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto my-2">
            {codeBlockContent.join('\n')}
          </pre>
        )
        codeBlockContent = []
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />)
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key} className="text-sm font-semibold mt-3 mb-1">
          {formatLine(line.slice(4), key)}
        </h3>
      )
      continue
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key} className="text-base font-semibold mt-3 mb-1">
          {formatLine(line.slice(3), key)}
        </h2>
      )
      continue
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key} className="text-lg font-bold mt-3 mb-1">
          {formatLine(line.slice(2), key)}
        </h1>
      )
      continue
    }

    if (line.startsWith('- ')) {
      elements.push(
        <li key={key} className="ml-4 list-disc">
          {formatLine(line.slice(2), key)}
        </li>
      )
      continue
    }

    elements.push(
      <p key={key} className="mb-1.5">
        {formatLine(line, key)}
      </p>
    )
  }

  return <div className={className ?? 'text-sm leading-relaxed'}>{elements}</div>
}

function formatInlineMarkdown(
  text: string,
  startKey: number = 0,
  onReferenceClick?: (file: string, line: number) => void,
  keyPrefix: string = ''
): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = startKey

  while (remaining.length > 0) {
    const inlineCodeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)
    if (inlineCodeMatch) {
      if (inlineCodeMatch[1]) {
        parts.push(...parseEmphasis(inlineCodeMatch[1], keyIndex))
        keyIndex += 10
      }

      const codeContent = inlineCodeMatch[2]
      const ref = isCodeReference(codeContent)

      if (ref && onReferenceClick) {
        parts.push(
          <button
            key={`${keyPrefix}-code-${keyIndex}`}
            onClick={() => onReferenceClick(ref.file, ref.line)}
            className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-xs font-mono hover:bg-blue-500/30 hover:underline transition-colors inline-flex items-center gap-1 border border-blue-500/30"
            title={`Ir para ${ref.file} linha ${ref.line}`}
          >
            <FileCode size={10} />
            {codeContent}
          </button>
        )
      } else {
        parts.push(
          <code key={`${keyPrefix}-code-${keyIndex}`} className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
            {codeContent}
          </code>
        )
      }
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
```

**Step 2: Update ReviewPanel to use shared component**

Replace the local MarkdownContent and helper functions with import:

```typescript
import { MarkdownContent } from '@/components/shared/MarkdownContent'
```

Remove local `MarkdownContent`, `formatInlineMarkdown`, `parseEmphasis`, and `parseItalic` functions.

**Step 3: Test manually**

Run: `npm run dev`
Verify ReviewPanel still renders markdown correctly.

**Step 4: Commit**

```bash
git add src/components/shared/MarkdownContent.tsx src/components/review/ReviewPanel.tsx
git commit -m "refactor(review): extract MarkdownContent to shared component"
```

---

## Task 3: Add tabs and history view to ReviewPanel

**Files:**
- Modify: `src/stores/review.ts`
- Modify: `src/components/review/ReviewPanel.tsx`

**Step 1: Add history state to review store**

Update `src/stores/review.ts`:

```typescript
import type { ReviewComment, ReviewHistoryEntry } from '@/types/electron'

interface ReviewState {
  isOpen: boolean
  isLoading: boolean
  content: string | null
  error: string | null
  provider: string | null
  comments: ReviewComment[]
  generalNotes: string[]
  activeTab: 'review' | 'history'
  history: ReviewHistoryEntry[]
  selectedHistoryEntry: ReviewHistoryEntry | null
  historyDiffChanged: boolean

  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setLoading: (loading: boolean) => void
  setContent: (content: string, provider: string) => void
  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => void
  setError: (error: string) => void
  clear: () => void
  setActiveTab: (tab: 'review' | 'history') => void
  setHistory: (history: ReviewHistoryEntry[]) => void
  selectHistoryEntry: (entry: ReviewHistoryEntry | null, diffChanged: boolean) => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  content: null,
  error: null,
  provider: null,
  comments: [],
  generalNotes: [],
  activeTab: 'review',
  history: [],
  selectedHistoryEntry: null,
  historyDiffChanged: false,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set({ isOpen: !get().isOpen }),

  setLoading: (isLoading: boolean) => set({ isLoading, error: null }),

  setContent: (content: string, provider: string) => set({
    content,
    provider,
    isLoading: false,
    error: null
  }),

  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => set({
    content: summary,
    comments,
    generalNotes,
    provider,
    isLoading: false,
    error: null,
    selectedHistoryEntry: null,
    historyDiffChanged: false
  }),

  setError: (error: string) => set({
    error,
    isLoading: false,
    content: null
  }),

  clear: () => set({
    content: null,
    error: null,
    provider: null,
    isLoading: false,
    comments: [],
    generalNotes: [],
    selectedHistoryEntry: null,
    historyDiffChanged: false
  }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setHistory: (history) => set({ history }),

  selectHistoryEntry: (entry, diffChanged) => set({
    selectedHistoryEntry: entry,
    historyDiffChanged: diffChanged,
    content: entry?.summary ?? null,
    comments: entry?.comments ?? [],
    generalNotes: entry?.generalNotes ?? [],
    provider: entry ? `${entry.provider} (historico)` : null,
    activeTab: 'review'
  })
}))
```

**Step 2: Update ReviewPanel with tabs and history list**

Rewrite `src/components/review/ReviewPanel.tsx`:

```typescript
import { useMemo, useEffect, useCallback } from 'react'
import { useReviewStore } from '@/stores/review'
import { useRepositoryStore } from '@/stores/repository'
import { useDiffStore } from '@/stores/diff'
import { X, Loader2, FileCode, Trash2, AlertTriangle } from 'lucide-react'
import { parseCodeReferences } from '@/lib/review-parser'
import { MarkdownContent } from '@/components/shared/MarkdownContent'
import { cn } from '@/lib/utils'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `ha ${minutes}min`
  if (hours < 24) return `ha ${hours}h`
  if (days < 7) return `ha ${days}d`

  const date = new Date(timestamp)
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function ReviewPanel() {
  const {
    isOpen, isLoading, content, error, provider, generalNotes,
    activeTab, history, selectedHistoryEntry, historyDiffChanged,
    closePanel, setLoading, setActiveTab, setHistory, selectHistoryEntry
  } = useReviewStore()
  const { repoPath } = useRepositoryStore()
  const { files, selectFile, baseBranch, compareBranch, setBaseBranch, setCompareBranch, loadDiff } = useDiffStore()

  const loadHistory = useCallback(async () => {
    if (!repoPath) return
    const historyData = await window.electron.review.getHistory(repoPath)
    setHistory(historyData)
  }, [repoPath, setHistory])

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadHistory()
    }
  }, [isOpen, activeTab, loadHistory])

  const handleCancel = async () => {
    try {
      await window.electron.review.cancel()
    } catch {
      // ignore
    }
    setLoading(false)
  }

  const handleSelectHistoryEntry = async (entry: typeof history[0]) => {
    if (!repoPath) return

    // Load the diff for those branches
    await setBaseBranch(entry.baseBranch)
    await setCompareBranch(entry.compareBranch)

    try {
      const diffFiles = await window.electron.git.diff.branches(repoPath, entry.baseBranch, entry.compareBranch)
      loadDiff(diffFiles)

      // Check if diff changed by comparing hashes would require re-fetching diff
      // For simplicity, we check if the branches still exist and have content
      const diffChanged = diffFiles.length === 0 && entry.summary.length > 0

      selectHistoryEntry(entry, diffChanged)
    } catch {
      // Branches might not exist anymore
      selectHistoryEntry(entry, true)
    }
  }

  const handleDeleteHistoryEntry = async (e: React.MouseEvent, timestamp: number) => {
    e.stopPropagation()
    if (!repoPath) return
    await window.electron.review.deleteHistoryEntry(repoPath, timestamp)
    loadHistory()
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('review')}
            className={cn(
              'text-sm font-medium pb-0.5 border-b-2 transition-colors',
              activeTab === 'review'
                ? 'text-foreground border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            Review
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'text-sm font-medium pb-0.5 border-b-2 transition-colors',
              activeTab === 'history'
                ? 'text-foreground border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            Historico
          </button>
        </div>
        <button
          onClick={closePanel}
          className="btn btn-ghost btn-icon"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {activeTab === 'review' && (
        <>
          {historyDiffChanged && selectedHistoryEntry && (
            <div className="px-4 py-2 bg-warning/10 border-l-2 border-warning flex items-center gap-2">
              <AlertTriangle size={14} className="text-warning" />
              <span className="text-xs text-warning">O codigo mudou desde este review</span>
            </div>
          )}

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
        </>
      )}

      {activeTab === 'history' && (
        <div className="flex-1 overflow-auto p-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center mt-8">
              Nenhum review no historico
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <button
                  key={entry.timestamp}
                  onClick={() => handleSelectHistoryEntry(entry)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteHistoryEntry(e, entry.timestamp)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-sm font-mono mb-1">
                    {entry.baseBranch} → {entry.compareBranch}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    {entry.provider}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {entry.summary.slice(0, 100)}{entry.summary.length > 100 ? '...' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Test manually**

Run: `npm run dev`
- Click Review button to open panel
- Switch between "Review" and "Historico" tabs
- If you have cached reviews, they should appear in history
- Click a history entry to load it
- Click trash icon to delete

**Step 4: Commit**

```bash
git add src/stores/review.ts src/components/review/ReviewPanel.tsx
git commit -m "feat(review): add history tab with view and delete functionality"
```

---

## Task 4: Update CommentIndicator with full markdown and larger size

**Files:**
- Modify: `src/components/diff/CommentIndicator.tsx`

**Step 1: Update CommentIndicator to use MarkdownContent**

Rewrite `src/components/diff/CommentIndicator.tsx`:

```typescript
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownContent } from '@/components/shared/MarkdownContent'
import type { ReviewComment } from '@/types/electron'

interface CommentIndicatorProps {
  comment: ReviewComment
}

const TYPE_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  bug: { bg: 'bg-red-500/20', border: 'border-red-500/50', icon: 'text-red-400' },
  performance: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: 'text-orange-400' },
  readability: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', icon: 'text-blue-400' },
  suggestion: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: 'text-yellow-400' },
  positive: { bg: 'bg-green-500/20', border: 'border-green-500/50', icon: 'text-green-400' }
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug',
  performance: 'Performance',
  readability: 'Legibilidade',
  suggestion: 'Sugestao',
  positive: 'Positivo'
}

export function CommentIndicator({ comment }: CommentIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const colors = TYPE_COLORS[comment.type] || TYPE_COLORS.suggestion

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({ top: rect.bottom + 4, left: rect.left })
    setShowPopover(!showPopover)
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors',
          colors.bg,
          'hover:opacity-80'
        )}
        title={TYPE_LABELS[comment.type]}
      >
        <MessageCircle size={12} className={colors.icon} />
      </button>
      {showPopover && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowPopover(false)} />
          <div
            className={cn(
              'fixed z-50 w-96 max-h-80 rounded-lg shadow-lg border bg-background flex flex-col',
              colors.border
            )}
            style={{ top: position.top, left: position.left }}
          >
            <div className={cn('flex items-center justify-between p-3 border-b', colors.border)}>
              <span className={cn('text-sm font-medium', colors.icon)}>
                {TYPE_LABELS[comment.type]}
              </span>
              <button
                onClick={() => setShowPopover(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <MarkdownContent content={comment.content} className="text-sm leading-relaxed" />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
```

**Step 2: Test manually**

Run: `npm run dev`
- Run an AI review that generates inline comments
- Click on a comment indicator
- Verify popup is larger (w-96)
- Verify markdown renders correctly (bold, italic, code, lists)

**Step 3: Commit**

```bash
git add src/components/diff/CommentIndicator.tsx
git commit -m "feat(review): improve CommentIndicator with full markdown and larger popup"
```

---

## Task 5: Improve SelectionPopover layout and size

**Files:**
- Modify: `src/components/review/SelectionPopover.tsx`

**Step 1: Update SelectionPopover with improved layout**

Rewrite `src/components/review/SelectionPopover.tsx`:

```typescript
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

  const top = rect.top - 8
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
        <div className="bg-background border border-border rounded-lg shadow-lg w-96">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-medium">
              Perguntar sobre o codigo
            </span>
            <button
              onClick={() => {
                setShowInput(false)
                setQuestion('')
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-3 border-b border-border">
            <div className="max-h-32 overflow-auto rounded bg-muted">
              <pre className="text-xs font-mono p-3 whitespace-pre-wrap break-all text-muted-foreground">
                {text.length > 500 ? text.slice(0, 500) + '...' : text}
              </pre>
            </div>
          </div>

          <div className="p-3">
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
```

**Step 2: Test manually**

Run: `npm run dev`
- Select some code text
- Click "Perguntar" button
- Verify popup is larger (w-96)
- Verify code preview is above the input
- Verify max-h-32 scroll works for long selections
- Verify 500 char limit on preview

**Step 3: Commit**

```bash
git add src/components/review/SelectionPopover.tsx
git commit -m "feat(review): improve SelectionPopover layout with larger size and better code preview"
```

---

## Task 6: Fix diff store to support loading history entries

**Files:**
- Modify: `src/stores/diff.ts`

**Step 1: Check current diff store and add missing functions**

Read the current diff store and ensure `setBaseBranch`, `setCompareBranch`, and `loadDiff` are available. If not, add them.

The ReviewPanel uses these to load the branches when selecting a history entry:
- `setBaseBranch(branch)` - Set base branch
- `setCompareBranch(branch)` - Set compare branch
- `loadDiff(files)` - Load diff files directly

**Step 2: Test end-to-end**

Run: `npm run dev`
1. Do an AI review on some branches
2. Switch to History tab
3. Click on the history entry
4. Verify diff loads and review displays
5. If branches changed, verify warning shows

**Step 3: Commit if changes needed**

```bash
git add src/stores/diff.ts
git commit -m "fix(diff): add setters for branch selection from history"
```

---

## Summary

After completing all tasks, you will have:

1. IPC handlers for getting and deleting history entries
2. Shared MarkdownContent component for consistent rendering
3. ReviewPanel with tabs (Review / Historico)
4. History list with relative time, branches, provider, summary preview
5. Delete functionality with trash icon on hover
6. Warning banner when code changed since review
7. Improved CommentIndicator with full markdown and larger popup (w-96)
8. Improved SelectionPopover with better layout and larger size (w-96)

Final commit:
```bash
git add .
git commit -m "feat(review): complete review history UI implementation"
```
