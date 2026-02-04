# Inline Comments e Cancelamento - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar botao de cancelar processamento de IA e exibir comentarios de review inline nas linhas do diff.

**Architecture:** AbortController para cancelamento HTTP, resposta estruturada em JSON da IA, indicadores visuais nas linhas do diff com popover.

**Tech Stack:** React, Zustand, Electron IPC, AbortController, createPortal

---

## Task 1: Adicionar interfaces para review estruturado

**Files:**
- Modify: `electron/ai/providers/types.ts`

**Step 1: Adicionar novas interfaces**

Adicionar ao final do arquivo:

```typescript
export type CommentType = 'bug' | 'performance' | 'readability' | 'suggestion' | 'positive'

export interface ReviewComment {
  file: string
  line: number
  type: CommentType
  content: string
}

export interface StructuredReview {
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}
```

**Step 2: Atualizar ReviewRequest**

Adicionar campo opcional `signal` na interface `ReviewRequest`:

```typescript
export interface ReviewRequest {
  prompt: string
  context: string
  repoPath: string
  signal?: AbortSignal
}
```

**Step 3: Commit**

```bash
git add electron/ai/providers/types.ts
git commit -m "feat(review): add interfaces for structured review and abort signal"
```

---

## Task 2: Adicionar AbortController no provider-manager

**Files:**
- Modify: `electron/ai/provider-manager.ts`

**Step 1: Adicionar variavel e funcao de cancelamento**

No topo do arquivo, apos os imports:

```typescript
let activeController: AbortController | null = null

export function cancelActiveReview(): void {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
}
```

**Step 2: Usar AbortController em reviewBranch**

Na funcao `reviewBranch`, antes de chamar `provider.review`:

```typescript
activeController = new AbortController()

try {
  const result = await provider.review({
    prompt: repoConfig.reviewPrompt,
    context,
    repoPath,
    signal: activeController.signal
  })
  return result
} finally {
  activeController = null
}
```

**Step 3: Usar AbortController em askAboutCode**

Mesma logica na funcao `askAboutCode`.

**Step 4: Commit**

```bash
git add electron/ai/provider-manager.ts
git commit -m "feat(review): add AbortController for request cancellation"
```

---

## Task 3: Atualizar OpenRouter provider para aceitar signal

**Files:**
- Modify: `electron/ai/providers/openrouter.ts`

**Step 1: Adicionar signal ao fetch**

Na funcao `review`, passar o signal para o fetch:

```typescript
async review(request: ReviewRequest): Promise<ReviewResponse> {
  const config = getConfig()

  if (!config.apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/git-branch-viewer',
      'X-Title': 'What the Fork'
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: request.prompt },
        { role: 'user', content: request.context }
      ],
      max_tokens: 4000,
      temperature: 0.3
    }),
    signal: request.signal
  })
  // ... resto igual
}
```

**Step 2: Commit**

```bash
git add electron/ai/providers/openrouter.ts
git commit -m "feat(review): add abort signal support to OpenRouter provider"
```

---

## Task 4: Atualizar GLM provider para aceitar signal

**Files:**
- Modify: `electron/ai/providers/glm.ts`

**Step 1: Adicionar signal ao fetch**

Mesma logica do OpenRouter:

```typescript
const response = await fetch(GLM_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${config.glmApiKey}`,
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en'
  },
  body: JSON.stringify({
    model: 'glm-4.7',
    messages: [
      { role: 'system', content: request.prompt },
      { role: 'user', content: request.context }
    ]
  }),
  signal: request.signal
})
```

**Step 2: Commit**

```bash
git add electron/ai/providers/glm.ts
git commit -m "feat(review): add abort signal support to GLM provider"
```

---

## Task 5: Adicionar handler IPC para cancelamento

**Files:**
- Modify: `electron/ai/review-ipc.ts`

**Step 1: Importar cancelActiveReview**

```typescript
import { getAvailableProviders, reviewBranch, askAboutCode, cancelActiveReview } from './provider-manager'
```

**Step 2: Adicionar handler**

Dentro de `registerReviewHandlers`:

```typescript
ipcMain.handle('review:cancel', async () => {
  cancelActiveReview()
})
```

**Step 3: Commit**

```bash
git add electron/ai/review-ipc.ts
git commit -m "feat(review): add IPC handler for cancel review"
```

---

## Task 6: Expor cancel no preload

**Files:**
- Modify: `electron/preload.ts`

**Step 1: Adicionar cancel ao objeto review**

```typescript
review: {
  // ... existentes
  cancel: () => ipcRenderer.invoke('review:cancel')
}
```

**Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat(review): expose cancel function in preload"
```

---

## Task 7: Atualizar review store com comments

**Files:**
- Modify: `src/stores/review.ts`

**Step 1: Importar tipo**

```typescript
import type { ReviewComment } from '../../electron/ai/providers/types'
```

**Step 2: Adicionar campos ao state**

```typescript
interface ReviewState {
  // ... existentes
  comments: ReviewComment[]
  generalNotes: string[]

  // ... existentes
  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => void
}
```

**Step 3: Implementar no store**

```typescript
export const useReviewStore = create<ReviewState>((set, get) => ({
  // ... existentes
  comments: [],
  generalNotes: [],

  setStructuredContent: (summary, comments, generalNotes, provider) => set({
    content: summary,
    comments,
    generalNotes,
    provider,
    isLoading: false,
    error: null
  }),

  clear: () => set({
    content: null,
    error: null,
    provider: null,
    isLoading: false,
    comments: [],
    generalNotes: []
  })
}))
```

**Step 4: Commit**

```bash
git add src/stores/review.ts
git commit -m "feat(review): add comments and generalNotes to review store"
```

---

## Task 8: Adicionar prompt estruturado

**Files:**
- Modify: `electron/ai/review-config.ts`

**Step 1: Criar STRUCTURED_REVIEW_PROMPT**

Substituir `DEFAULT_REVIEW_PROMPT`:

```typescript
export const DEFAULT_REVIEW_PROMPT = `Voce e um code reviewer experiente. Analise o diff fornecido e retorne um JSON valido com a seguinte estrutura:

{
  "summary": "Resumo geral do review em 2-3 frases",
  "comments": [
    {
      "file": "caminho/do/arquivo.ts",
      "line": 42,
      "type": "bug",
      "content": "Explicacao do problema ou sugestao"
    }
  ],
  "generalNotes": [
    "Observacoes gerais que nao se aplicam a uma linha especifica"
  ]
}

Tipos de comentario disponiveis:
- bug: problema que pode causar erro em runtime
- performance: oportunidade de otimizacao
- readability: melhoria de legibilidade ou manutencao
- suggestion: sugestao de melhoria geral
- positive: algo bem feito que vale destacar

Regras:
- O campo "line" deve ser o numero da linha no arquivo NOVO (lado direito do diff, linhas com +)
- O campo "file" deve ser o caminho relativo do arquivo
- Seja direto e objetivo nos comentarios
- Retorne APENAS o JSON, sem markdown, sem crases, sem texto adicional`
```

**Step 2: Commit**

```bash
git add electron/ai/review-config.ts
git commit -m "feat(review): update prompt for structured JSON response"
```

---

## Task 9: Adicionar parseStructuredReview

**Files:**
- Modify: `src/lib/review-parser.ts`

**Step 1: Importar tipos**

```typescript
import type { StructuredReview, ReviewComment, CommentType } from '../../electron/ai/providers/types'
```

**Step 2: Adicionar funcao de parsing**

```typescript
const VALID_COMMENT_TYPES: CommentType[] = ['bug', 'performance', 'readability', 'suggestion', 'positive']

export function parseStructuredReview(content: string): StructuredReview {
  try {
    const cleaned = content.trim().replace(/^```json?\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(cleaned)

    if (typeof parsed.summary !== 'string') {
      throw new Error('Invalid summary')
    }

    const comments: ReviewComment[] = []
    if (Array.isArray(parsed.comments)) {
      for (const c of parsed.comments) {
        if (
          typeof c.file === 'string' &&
          typeof c.line === 'number' &&
          VALID_COMMENT_TYPES.includes(c.type) &&
          typeof c.content === 'string'
        ) {
          comments.push({
            file: c.file,
            line: c.line,
            type: c.type,
            content: c.content
          })
        }
      }
    }

    const generalNotes: string[] = []
    if (Array.isArray(parsed.generalNotes)) {
      for (const note of parsed.generalNotes) {
        if (typeof note === 'string') {
          generalNotes.push(note)
        }
      }
    }

    return { summary: parsed.summary, comments, generalNotes }
  } catch {
    return {
      summary: content,
      comments: [],
      generalNotes: []
    }
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/review-parser.ts
git commit -m "feat(review): add parseStructuredReview function"
```

---

## Task 10: Atualizar ReviewPanel com botao cancelar

**Files:**
- Modify: `src/components/review/ReviewPanel.tsx`

**Step 1: Adicionar funcao de cancelamento**

```typescript
const handleCancel = async () => {
  try {
    await window.electron.review.cancel()
  } catch {
    // ignore
  }
  setLoading(false)
}
```

**Step 2: Atualizar bloco de loading**

Substituir o bloco de loading atual:

```tsx
{isLoading && (
  <button
    onClick={handleCancel}
    className="flex flex-col items-center justify-center h-full gap-3 w-full hover:bg-muted/50 transition-colors cursor-pointer"
  >
    <Loader2 size={24} className="animate-spin text-muted-foreground" />
    <span className="text-sm text-muted-foreground">Analisando... (clique para cancelar)</span>
  </button>
)}
```

**Step 3: Exibir generalNotes**

Apos o `MarkdownContent`, adicionar:

```tsx
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
```

**Step 4: Buscar generalNotes do store**

```typescript
const { isOpen, isLoading, content, error, provider, generalNotes, closePanel, setLoading } = useReviewStore()
```

**Step 5: Commit**

```bash
git add src/components/review/ReviewPanel.tsx
git commit -m "feat(review): add cancel button and display generalNotes"
```

---

## Task 11: Criar CommentIndicator

**Files:**
- Create: `src/components/diff/CommentIndicator.tsx`

**Step 1: Criar componente**

```typescript
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReviewComment } from '../../../electron/ai/providers/types'

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
        <div
          className={cn(
            'fixed z-50 w-80 rounded-lg shadow-lg border',
            colors.bg,
            colors.border
          )}
          style={{ top: position.top, left: position.left }}
        >
          <div className="flex items-center justify-between p-2 border-b border-border/50">
            <span className={cn('text-xs font-medium', colors.icon)}>
              {TYPE_LABELS[comment.type]}
            </span>
            <button
              onClick={() => setShowPopover(false)}
              className="p-1 hover:bg-background/50 rounded"
            >
              <X size={12} />
            </button>
          </div>
          <div className="p-3 text-sm">
            {comment.content}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/diff/CommentIndicator.tsx
git commit -m "feat(review): create CommentIndicator component"
```

---

## Task 12: Integrar CommentIndicator no UnifiedView

**Files:**
- Modify: `src/components/diff/UnifiedView.tsx`

**Step 1: Importar dependencias**

```typescript
import { useReviewStore } from '@/stores/review'
import { CommentIndicator } from './CommentIndicator'
```

**Step 2: Buscar comments do store**

Dentro do componente:

```typescript
const { comments } = useReviewStore()

const fileComments = useMemo(() => {
  const normalizedPath = file.path.replace(/^\.?\//, '')
  return comments.filter(c => {
    const normalizedCommentPath = c.file.replace(/^\.?\//, '')
    return (
      normalizedCommentPath === normalizedPath ||
      normalizedCommentPath.endsWith('/' + normalizedPath) ||
      normalizedPath.endsWith('/' + normalizedCommentPath)
    )
  })
}, [comments, file.path])

const getCommentForLine = (lineNumber: number | undefined) => {
  if (!lineNumber) return null
  return fileComments.find(c => c.line === lineNumber) || null
}
```

**Step 3: Renderizar indicador na linha**

Adicionar coluna para o indicador apos os numeros de linha:

```tsx
<span className="w-6 flex items-center justify-center">
  {getCommentForLine(line.newLineNumber) && (
    <CommentIndicator comment={getCommentForLine(line.newLineNumber)!} />
  )}
</span>
```

**Step 4: Commit**

```bash
git add src/components/diff/UnifiedView.tsx
git commit -m "feat(review): integrate CommentIndicator in UnifiedView"
```

---

## Task 13: Integrar CommentIndicator no SplitView

**Files:**
- Modify: `src/components/diff/SplitView.tsx`

**Step 1: Mesma logica do UnifiedView**

Importar e usar `useReviewStore`, criar `fileComments` e `getCommentForLine`.

**Step 2: Adicionar indicador no lado direito**

No lado direito (onde ficam as linhas novas), adicionar coluna para indicador:

```tsx
<span className="w-6 flex items-center justify-center">
  {getCommentForLine(line.right?.newLineNumber) && (
    <CommentIndicator comment={getCommentForLine(line.right?.newLineNumber)!} />
  )}
</span>
```

**Step 3: Commit**

```bash
git add src/components/diff/SplitView.tsx
git commit -m "feat(review): integrate CommentIndicator in SplitView"
```

---

## Task 14: Atualizar Header para usar parseStructuredReview

**Files:**
- Modify: `src/components/header/Header.tsx`

**Step 1: Importar parser**

```typescript
import { parseStructuredReview } from '@/lib/review-parser'
```

**Step 2: Atualizar handleReview**

Onde chama `setContent`, trocar para:

```typescript
const result = await window.electron.review.reviewBranch(repoPath, baseBranch, compareBranch)
const structured = parseStructuredReview(result.content)
setStructuredContent(structured.summary, structured.comments, structured.generalNotes, result.provider)
```

**Step 3: Buscar setStructuredContent do store**

```typescript
const { openPanel, setLoading, setStructuredContent, setError } = useReviewStore()
```

**Step 4: Commit**

```bash
git add src/components/header/Header.tsx
git commit -m "feat(review): use parseStructuredReview in Header"
```

---

## Task 15: Teste manual e ajustes finais

**Step 1: Executar a aplicacao**

```bash
npm run dev
```

**Step 2: Testar cancelamento**

1. Clicar em Review
2. Enquanto carrega, clicar no loader
3. Verificar que para o loading

**Step 3: Testar comentarios inline**

1. Fazer um review completo
2. Verificar icones nas linhas do diff
3. Clicar nos icones para ver o popover

**Step 4: Commit final se necessario**

Se houver ajustes, commitar com mensagem descritiva.
