# AI Code Review - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar sistema de code review com IA multi-provider (Claude Code CLI, OpenRouter, GLM) com painel lateral togglavel.

**Architecture:** Criar abstracao de providers com interface comum. Cada provider implementa `review(prompt, context)`. ProviderManager seleciona e executa o provider configurado. Frontend usa store Zustand para estado do painel de review.

**Tech Stack:** Electron, React, Zustand, TypeScript, child_process (para Claude Code CLI)

---

## Task 1: Criar tipos e interface do provider

**Files:**
- Create: `electron/ai/providers/types.ts`

**Step 1: Criar arquivo de tipos**

```typescript
export interface ReviewRequest {
  prompt: string
  context: string
  repoPath: string
}

export interface ReviewResponse {
  content: string
  provider: string
  model?: string
}

export interface AIProvider {
  name: string
  isAvailable(): Promise<boolean>
  review(request: ReviewRequest): Promise<ReviewResponse>
}

export interface ReviewConfig {
  provider: 'claude-code' | 'openrouter' | 'glm'
  glmApiKey?: string
}

export interface RepoReviewConfig {
  reviewPrompt: string
  baseBranch: string
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/providers/types.ts
git commit -m "feat(review): add provider types and interfaces"
```

---

## Task 2: Implementar GLM Provider

**Files:**
- Create: `electron/ai/providers/glm.ts`

**Step 1: Criar GLM provider**

```typescript
import type { AIProvider, ReviewRequest, ReviewResponse } from './types'
import { getReviewConfig } from '../review-config'

const GLM_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions'

export class GLMProvider implements AIProvider {
  name = 'glm'

  async isAvailable(): Promise<boolean> {
    const config = getReviewConfig()
    return Boolean(config.glmApiKey)
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const config = getReviewConfig()

    if (!config.glmApiKey) {
      throw new Error('GLM API key not configured')
    }

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
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`GLM API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('No response from GLM')
    }

    return { content, provider: 'glm', model: 'glm-4.7' }
  }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Erro esperado (review-config nao existe ainda)

**Step 3: Commit parcial**

```bash
git add electron/ai/providers/glm.ts
git commit -m "feat(review): add GLM provider implementation"
```

---

## Task 3: Implementar OpenRouter Provider

**Files:**
- Create: `electron/ai/providers/openrouter.ts`

**Step 1: Criar OpenRouter provider**

```typescript
import type { AIProvider, ReviewRequest, ReviewResponse } from './types'
import { getConfig } from '../config'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter'

  async isAvailable(): Promise<boolean> {
    const config = getConfig()
    return Boolean(config.apiKey)
  }

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
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('No response from OpenRouter')
    }

    return { content, provider: 'openrouter', model: config.model }
  }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/providers/openrouter.ts
git commit -m "feat(review): add OpenRouter provider implementation"
```

---

## Task 4: Implementar Claude Code Provider

**Files:**
- Create: `electron/ai/providers/claude-code.ts`

**Step 1: Criar Claude Code provider**

```typescript
import { spawn } from 'child_process'
import type { AIProvider, ReviewRequest, ReviewResponse } from './types'

export class ClaudeCodeProvider implements AIProvider {
  name = 'claude-code'

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('claude', ['--version'], { shell: true })

      process.on('close', (code) => {
        resolve(code === 0)
      })

      process.on('error', () => {
        resolve(false)
      })

      setTimeout(() => {
        process.kill()
        resolve(false)
      }, 5000)
    })
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const fullPrompt = `${request.prompt}\n\n${request.context}`

    return new Promise((resolve, reject) => {
      const chunks: string[] = []

      const process = spawn('claude', [
        '--print',
        '--output-format', 'text',
        '-p', fullPrompt
      ], {
        cwd: request.repoPath,
        shell: true
      })

      process.stdout.on('data', (data) => {
        chunks.push(data.toString())
      })

      process.stderr.on('data', (data) => {
        console.error('[Claude Code stderr]', data.toString())
      })

      process.on('close', (code) => {
        if (code === 0) {
          const content = chunks.join('').trim()
          resolve({ content, provider: 'claude-code' })
        } else {
          reject(new Error(`Claude Code exited with code ${code}`))
        }
      })

      process.on('error', (err) => {
        reject(new Error(`Claude Code error: ${err.message}`))
      })

      setTimeout(() => {
        process.kill()
        reject(new Error('Claude Code timeout (120s)'))
      }, 120000)
    })
  }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/providers/claude-code.ts
git commit -m "feat(review): add Claude Code CLI provider implementation"
```

---

## Task 5: Criar configuracao de review

**Files:**
- Create: `electron/ai/review-config.ts`

**Step 1: Criar modulo de configuracao**

```typescript
import Store from 'electron-store'
import type { ReviewConfig, RepoReviewConfig } from './providers/types'

interface ReviewStoreSchema {
  reviewProvider: 'claude-code' | 'openrouter' | 'glm'
  glmApiKey: string
  repoConfigs: Record<string, RepoReviewConfig>
}

const store = new Store<ReviewStoreSchema>({
  defaults: {
    reviewProvider: 'openrouter',
    glmApiKey: '',
    repoConfigs: {}
  },
  encryptionKey: 'git-branch-viewer-secure-key',
  name: 'review-config'
})

const DEFAULT_REVIEW_PROMPT = `Voce e um code reviewer experiente. Analise o diff fornecido e:
- Identifique bugs potenciais
- Sugira melhorias de performance
- Aponte problemas de legibilidade
- Valide boas praticas

Seja direto e objetivo. Use markdown para formatacao.`

export function getReviewConfig(): ReviewConfig {
  return {
    provider: store.get('reviewProvider'),
    glmApiKey: store.get('glmApiKey')
  }
}

export function setReviewConfig(config: Partial<ReviewConfig>): void {
  if (config.provider !== undefined) {
    store.set('reviewProvider', config.provider)
  }
  if (config.glmApiKey !== undefined) {
    store.set('glmApiKey', config.glmApiKey)
  }
}

export function getRepoReviewConfig(repoPath: string): RepoReviewConfig {
  const configs = store.get('repoConfigs')
  return configs[repoPath] ?? {
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    baseBranch: 'main'
  }
}

export function setRepoReviewConfig(repoPath: string, config: Partial<RepoReviewConfig>): void {
  const configs = store.get('repoConfigs')
  const existing = configs[repoPath] ?? {
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    baseBranch: 'main'
  }
  store.set('repoConfigs', {
    ...configs,
    [repoPath]: { ...existing, ...config }
  })
}

export function getReviewConfigState(): {
  provider: string
  glmApiKeyConfigured: boolean
} {
  return {
    provider: store.get('reviewProvider'),
    glmApiKeyConfigured: store.get('glmApiKey').length > 0
  }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/review-config.ts
git commit -m "feat(review): add review configuration module"
```

---

## Task 6: Criar Provider Manager

**Files:**
- Create: `electron/ai/provider-manager.ts`

**Step 1: Criar provider manager**

```typescript
import type { AIProvider, ReviewRequest, ReviewResponse } from './providers/types'
import { ClaudeCodeProvider } from './providers/claude-code'
import { OpenRouterProvider } from './providers/openrouter'
import { GLMProvider } from './providers/glm'
import { getReviewConfig, getRepoReviewConfig } from './review-config'
import { executeGit } from '../git/executor'

const providers: Record<string, AIProvider> = {
  'claude-code': new ClaudeCodeProvider(),
  'openrouter': new OpenRouterProvider(),
  'glm': new GLMProvider()
}

export async function getAvailableProviders(): Promise<string[]> {
  const available: string[] = []
  for (const [name, provider] of Object.entries(providers)) {
    if (await provider.isAvailable()) {
      available.push(name)
    }
  }
  return available
}

export async function reviewBranch(repoPath: string): Promise<ReviewResponse> {
  const config = getReviewConfig()
  const repoConfig = getRepoReviewConfig(repoPath)
  const provider = providers[config.provider]

  if (!provider) {
    throw new Error(`Provider ${config.provider} not found`)
  }

  if (!await provider.isAvailable()) {
    throw new Error(`Provider ${config.provider} is not available`)
  }

  const currentBranch = await getCurrentBranch(repoPath)
  const diff = await getBranchDiff(repoPath, repoConfig.baseBranch, currentBranch)

  if (!diff.trim()) {
    throw new Error(`No differences between ${repoConfig.baseBranch} and ${currentBranch}`)
  }

  const truncatedDiff = diff.length > 50000
    ? diff.substring(0, 50000) + '\n... (truncated)'
    : diff

  const context = `Review do diff entre ${repoConfig.baseBranch} e ${currentBranch}:\n\n${truncatedDiff}`

  return provider.review({
    prompt: repoConfig.reviewPrompt,
    context,
    repoPath
  })
}

export async function askAboutCode(
  repoPath: string,
  code: string,
  question: string
): Promise<ReviewResponse> {
  const config = getReviewConfig()
  const provider = providers[config.provider]

  if (!provider) {
    throw new Error(`Provider ${config.provider} not found`)
  }

  if (!await provider.isAvailable()) {
    throw new Error(`Provider ${config.provider} is not available`)
  }

  const prompt = 'Voce e um assistente de programacao. Responda de forma clara e objetiva. Use markdown para formatacao.'
  const context = `Codigo:\n\`\`\`\n${code}\n\`\`\`\n\nPergunta: ${question}`

  return provider.review({ prompt, context, repoPath })
}

async function getCurrentBranch(repoPath: string): Promise<string> {
  const result = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.exitCode !== 0) {
    throw new Error('Failed to get current branch')
  }
  return result.stdout.trim()
}

async function getBranchDiff(repoPath: string, baseBranch: string, currentBranch: string): Promise<string> {
  const result = await executeGit(repoPath, ['diff', `${baseBranch}...${currentBranch}`])
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to get diff')
  }
  return result.stdout
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/provider-manager.ts
git commit -m "feat(review): add provider manager with branch review and code questions"
```

---

## Task 7: Criar IPC handlers de review

**Files:**
- Create: `electron/ai/review-ipc.ts`

**Step 1: Criar handlers IPC**

```typescript
import { ipcMain } from 'electron'
import {
  getReviewConfig,
  setReviewConfig,
  getRepoReviewConfig,
  setRepoReviewConfig,
  getReviewConfigState
} from './review-config'
import {
  getAvailableProviders,
  reviewBranch,
  askAboutCode
} from './provider-manager'
import type { ReviewConfig, RepoReviewConfig } from './providers/types'

export function registerReviewHandlers(): void {
  ipcMain.handle('review:get-config', async () => {
    return getReviewConfigState()
  })

  ipcMain.handle('review:set-config', async (_event, config: Partial<ReviewConfig>) => {
    setReviewConfig(config)
  })

  ipcMain.handle('review:get-repo-config', async (_event, repoPath: string) => {
    return getRepoReviewConfig(repoPath)
  })

  ipcMain.handle('review:set-repo-config', async (_event, repoPath: string, config: Partial<RepoReviewConfig>) => {
    setRepoReviewConfig(repoPath, config)
  })

  ipcMain.handle('review:get-available-providers', async () => {
    return getAvailableProviders()
  })

  ipcMain.handle('review:branch', async (_event, repoPath: string) => {
    return reviewBranch(repoPath)
  })

  ipcMain.handle('review:ask', async (_event, repoPath: string, code: string, question: string) => {
    return askAboutCode(repoPath, code, question)
  })
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/ai/review-ipc.ts
git commit -m "feat(review): add IPC handlers for review functionality"
```

---

## Task 8: Registrar handlers no main.ts

**Files:**
- Modify: `electron/main.ts`

**Step 1: Importar e registrar handlers**

Adicionar import no topo do arquivo:

```typescript
import { registerReviewHandlers } from './ai/review-ipc'
```

Adicionar chamada junto com outros registros de handlers (procurar por `registerAIHandlers`):

```typescript
registerReviewHandlers()
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/main.ts
git commit -m "feat(review): register review IPC handlers in main process"
```

---

## Task 9: Atualizar preload.ts

**Files:**
- Modify: `electron/preload.ts`

**Step 1: Adicionar API de review**

Adicionar dentro do objeto exposto por `contextBridge.exposeInMainWorld`:

```typescript
review: {
  getConfig: () => ipcRenderer.invoke('review:get-config'),
  setConfig: (config: { provider?: string; glmApiKey?: string }) => ipcRenderer.invoke('review:set-config', config),
  getRepoConfig: (repoPath: string) => ipcRenderer.invoke('review:get-repo-config', repoPath),
  setRepoConfig: (repoPath: string, config: { reviewPrompt?: string; baseBranch?: string }) => ipcRenderer.invoke('review:set-repo-config', repoPath, config),
  getAvailableProviders: () => ipcRenderer.invoke('review:get-available-providers'),
  reviewBranch: (repoPath: string) => ipcRenderer.invoke('review:branch', repoPath),
  ask: (repoPath: string, code: string, question: string) => ipcRenderer.invoke('review:ask', repoPath, code, question)
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add electron/preload.ts
git commit -m "feat(review): expose review API in preload"
```

---

## Task 10: Atualizar tipos do Electron

**Files:**
- Modify: `src/types/electron.d.ts`

**Step 1: Adicionar tipos de review**

Adicionar interface de review:

```typescript
interface ReviewConfigState {
  provider: string
  glmApiKeyConfigured: boolean
}

interface RepoReviewConfig {
  reviewPrompt: string
  baseBranch: string
}

interface ReviewResponse {
  content: string
  provider: string
  model?: string
}
```

Adicionar no objeto `electron`:

```typescript
review: {
  getConfig: () => Promise<ReviewConfigState>
  setConfig: (config: { provider?: string; glmApiKey?: string }) => Promise<void>
  getRepoConfig: (repoPath: string) => Promise<RepoReviewConfig>
  setRepoConfig: (repoPath: string, config: { reviewPrompt?: string; baseBranch?: string }) => Promise<void>
  getAvailableProviders: () => Promise<string[]>
  reviewBranch: (repoPath: string) => Promise<ReviewResponse>
  ask: (repoPath: string, code: string, question: string) => Promise<ReviewResponse>
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/types/electron.d.ts
git commit -m "feat(review): add TypeScript types for review API"
```

---

## Task 11: Criar store de review

**Files:**
- Create: `src/stores/review.ts`

**Step 1: Criar store Zustand**

```typescript
import { create } from 'zustand'

interface ReviewState {
  isOpen: boolean
  isLoading: boolean
  content: string | null
  error: string | null
  provider: string | null

  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setLoading: (loading: boolean) => void
  setContent: (content: string, provider: string) => void
  setError: (error: string) => void
  clear: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  content: null,
  error: null,
  provider: null,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set({ isOpen: !get().isOpen }),

  setLoading: (isLoading) => set({ isLoading, error: null }),

  setContent: (content, provider) => set({
    content,
    provider,
    isLoading: false,
    error: null
  }),

  setError: (error) => set({
    error,
    isLoading: false,
    content: null
  }),

  clear: () => set({
    content: null,
    error: null,
    provider: null,
    isLoading: false
  })
}))
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/stores/review.ts
git commit -m "feat(review): add Zustand store for review panel state"
```

---

## Task 12: Criar componente ReviewPanel

**Files:**
- Create: `src/components/review/ReviewPanel.tsx`

**Step 1: Criar componente**

```typescript
import { useReviewStore } from '@/stores/review'
import { X, Loader2 } from 'lucide-react'

export function ReviewPanel() {
  const { isOpen, isLoading, content, error, provider, closePanel } = useReviewStore()

  if (!isOpen) return null

  return (
    <div className="w-96 border-l border-border flex flex-col bg-background">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">AI Review</span>
          {provider && (
            <span className="text-xs text-muted-foreground">({provider})</span>
          )}
        </div>
        <button
          onClick={closePanel}
          className="btn btn-ghost btn-icon"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analisando...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-destructive text-sm">
            <p className="font-medium mb-1">Erro</p>
            <p>{error}</p>
          </div>
        )}

        {content && (
          <div className="prose prose-sm prose-invert max-w-none">
            <MarkdownContent content={content} />
          </div>
        )}

        {!isLoading && !error && !content && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <p>Clique em "Review" para analisar a branch</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="text-sm space-y-2">
      {lines.map((line, index) => {
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-base font-semibold mt-4 mb-2">{line.slice(4)}</h3>
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(3)}</h2>
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>
        }
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4">{formatInline(line.slice(2))}</li>
        }
        if (line.startsWith('```')) {
          return null
        }
        if (line.trim() === '') {
          return <br key={index} />
        }
        return <p key={index}>{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-muted px-1 rounded text-xs">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/components/review/ReviewPanel.tsx
git commit -m "feat(review): add ReviewPanel component"
```

---

## Task 13: Integrar ReviewPanel no MainPanel

**Files:**
- Modify: `src/components/layout/MainPanel.tsx`

**Step 1: Importar e adicionar ReviewPanel**

Adicionar import:

```typescript
import { ReviewPanel } from '@/components/review/ReviewPanel'
```

Modificar o return do componente com files (ultimo return) para incluir ReviewPanel:

```typescript
return (
  <main className="flex-1 flex overflow-hidden">
    <div className="flex-1 flex flex-col overflow-hidden">
      <ComparisonHeader />
      <DiffHeader />
      <div className="flex-1 overflow-hidden">
        {selectedFile && <DiffView file={selectedFile} viewMode={diffViewMode} />}
      </div>
      <FileList files={files} selectedFile={selectedFile} />
    </div>
    <ReviewPanel />
  </main>
)
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/components/layout/MainPanel.tsx
git commit -m "feat(review): integrate ReviewPanel in MainPanel layout"
```

---

## Task 14: Adicionar botao Review no Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: Importar dependencias**

Adicionar imports:

```typescript
import { useReviewStore } from '@/stores/review'
import { useDiffStore } from '@/stores/diff'
import { Settings, Loader2, MessageSquare } from 'lucide-react'
```

**Step 2: Adicionar estado e handler**

Dentro do componente Header, adicionar:

```typescript
const { files } = useDiffStore()
const { isOpen, setLoading, setContent, setError, openPanel } = useReviewStore()
const [isReviewing, setIsReviewing] = useState(false)

const handleReview = async () => {
  if (!repoPath || isReviewing) return

  setIsReviewing(true)
  openPanel()
  setLoading(true)

  try {
    const result = await window.electron.review.reviewBranch(repoPath)
    setContent(result.content, result.provider)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Review failed')
  } finally {
    setIsReviewing(false)
  }
}
```

**Step 3: Adicionar botao na UI**

Adicionar antes do botao Settings (procurar por `onClick={() => setShowSettings(true)}`):

```typescript
<button
  onClick={handleReview}
  disabled={isReviewing || files.length === 0}
  className={cn('btn btn-ghost btn-icon', isOpen && 'bg-muted')}
  title="AI Review"
>
  {isReviewing ? (
    <Loader2 size={16} className="animate-spin" />
  ) : (
    <MessageSquare size={16} />
  )}
</button>
```

**Step 4: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 5: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(review): add Review button to Header"
```

---

## Task 15: Adicionar configuracoes de Review no Settings

**Files:**
- Modify: `src/components/settings/AISettings.tsx`

**Step 1: Expandir componente com configuracoes de review**

Adicionar estado para review:

```typescript
const [reviewProvider, setReviewProvider] = useState('openrouter')
const [glmApiKey, setGlmApiKey] = useState('')
const [glmConfigured, setGlmConfigured] = useState(false)
const [availableProviders, setAvailableProviders] = useState<string[]>([])
const [reviewPrompt, setReviewPrompt] = useState('')
const [baseBranch, setBaseBranch] = useState('main')
```

Adicionar import:

```typescript
import { useRepositoryStore } from '@/stores/repository'
```

Adicionar no componente:

```typescript
const { repoPath } = useRepositoryStore()
```

Adicionar funcoes de load e save:

```typescript
const loadReviewConfig = async () => {
  const config = await window.electron.review.getConfig()
  setReviewProvider(config.provider)
  setGlmConfigured(config.glmApiKeyConfigured)

  const providers = await window.electron.review.getAvailableProviders()
  setAvailableProviders(providers)

  if (repoPath) {
    const repoConfig = await window.electron.review.getRepoConfig(repoPath)
    setReviewPrompt(repoConfig.reviewPrompt)
    setBaseBranch(repoConfig.baseBranch)
  }
}

const handleSaveGlmKey = async () => {
  await window.electron.review.setConfig({ glmApiKey })
  setGlmApiKey('')
  await loadReviewConfig()
}

const handleProviderChange = async (provider: string) => {
  setReviewProvider(provider)
  await window.electron.review.setConfig({ provider })
}

const handleSaveRepoConfig = async () => {
  if (repoPath) {
    await window.electron.review.setRepoConfig(repoPath, { reviewPrompt, baseBranch })
  }
}
```

Modificar useEffect:

```typescript
useEffect(() => {
  loadConfig()
  loadReviewConfig()
}, [repoPath])
```

**Step 2: Adicionar UI de review**

Adicionar apos a secao de Test Connection (antes do fechamento da div principal):

```typescript
<div className="border-t border-border pt-6 mt-6">
  <h2 className="text-lg font-semibold mb-4">AI Code Review</h2>

  <div className="space-y-6">
    <div>
      <h3 className="text-sm font-medium mb-1">Provider</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Select the AI provider for code reviews
      </p>
      <select
        value={reviewProvider}
        onChange={e => handleProviderChange(e.target.value)}
        className="input w-full"
      >
        <option value="openrouter">OpenRouter</option>
        <option value="glm">GLM (z.ai)</option>
        <option value="claude-code" disabled={!availableProviders.includes('claude-code')}>
          Claude Code CLI {!availableProviders.includes('claude-code') && '(not installed)'}
        </option>
      </select>
    </div>

    {reviewProvider === 'glm' && (
      <div>
        <h3 className="text-sm font-medium mb-1">GLM API Key</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Get your API key from{' '}
          <a href="https://z.ai" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            z.ai
          </a>
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={glmApiKey}
            onChange={e => setGlmApiKey(e.target.value)}
            placeholder={glmConfigured ? '********' : 'Enter API key'}
            className="input flex-1"
          />
          <button
            onClick={handleSaveGlmKey}
            disabled={!glmApiKey.trim()}
            className="btn btn-primary"
          >
            Save
          </button>
        </div>
        {glmConfigured && (
          <span className="text-xs text-success flex items-center gap-1 mt-2">
            <Check size={12} /> GLM API key configured
          </span>
        )}
      </div>
    )}

    {repoPath && (
      <>
        <div>
          <h3 className="text-sm font-medium mb-1">Base Branch</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Branch to compare against for reviews
          </p>
          <input
            type="text"
            value={baseBranch}
            onChange={e => setBaseBranch(e.target.value)}
            onBlur={handleSaveRepoConfig}
            className="input w-full"
          />
        </div>

        <div>
          <h3 className="text-sm font-medium mb-1">Review Prompt</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Custom instructions for the AI reviewer
          </p>
          <textarea
            value={reviewPrompt}
            onChange={e => setReviewPrompt(e.target.value)}
            onBlur={handleSaveRepoConfig}
            rows={6}
            className="input w-full resize-none"
          />
        </div>
      </>
    )}
  </div>
</div>
```

**Step 3: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 4: Commit**

```bash
git add src/components/settings/AISettings.tsx
git commit -m "feat(review): add Review configuration in Settings"
```

---

## Task 16: Teste de integracao final

**Step 1: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 2: Testar app**

Run: `npm run dev`

Testar:
- [ ] Botao Review aparece no header
- [ ] Painel lateral abre ao clicar
- [ ] Configuracoes de review aparecem em Settings
- [ ] Provider pode ser alterado
- [ ] Review funciona com OpenRouter (se configurado)
- [ ] Review funciona com Claude Code (se instalado)
- [ ] Review funciona com GLM (se configurado)

**Step 3: Commit final se necessario**

```bash
git add -A
git commit -m "fix(review): adjustments after integration testing"
```
