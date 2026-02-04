# Inline Comments e Cancelamento de Review - Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar botao de cancelar processamento de IA e exibir comentarios de review inline nas linhas do diff.

**Architecture:** Reestruturar resposta da IA para JSON com comentarios por linha. Usar AbortController para cancelamento de requisicoes HTTP. Indicadores visuais no diff com popover para exibir comentarios.

**Tech Stack:** React, Zustand, Electron IPC, AbortController, createPortal

---

## 1. Estrutura de Dados

### Novas interfaces (types.ts)

```typescript
interface ReviewComment {
  file: string
  line: number
  type: 'bug' | 'performance' | 'readability' | 'suggestion' | 'positive'
  content: string
}

interface StructuredReview {
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}
```

### Review Store (review.ts)

Adicionar campo `comments: ReviewComment[]` ao estado.

---

## 2. Cancelamento de Requisicoes

### Backend (provider-manager.ts)

```typescript
let activeController: AbortController | null = null

export function cancelActiveReview(): void {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
}
```

### Providers (openrouter.ts, glm.ts)

Receber `signal: AbortSignal` nas requisicoes fetch.

### IPC (review-ipc.ts)

Novo handler `review:cancel` que chama `cancelActiveReview()`.

### UI (ReviewPanel.tsx)

Loader vira botao clicavel:

```tsx
<button onClick={handleCancel}>
  <Loader2 className="animate-spin" />
  <span>Analisando... (clique para cancelar)</span>
</button>
```

---

## 3. Prompt Estruturado

### Novo prompt (review-config.ts)

```typescript
export const STRUCTURED_REVIEW_PROMPT = `Voce e um code reviewer experiente. Analise o diff fornecido e retorne um JSON com a seguinte estrutura:

{
  "summary": "Resumo geral do review em 2-3 frases",
  "comments": [
    {
      "file": "caminho/do/arquivo.ts",
      "line": 42,
      "type": "bug|performance|readability|suggestion|positive",
      "content": "Explicacao do problema ou sugestao"
    }
  ],
  "generalNotes": [
    "Observacoes gerais que nao se aplicam a uma linha especifica"
  ]
}

Tipos de comentario:
- bug: problema que pode causar erro
- performance: oportunidade de otimizacao
- readability: melhoria de legibilidade/manutencao
- suggestion: sugestao de melhoria geral
- positive: algo bem feito que vale destacar

Seja direto e objetivo. Retorne APENAS o JSON, sem markdown ou texto adicional.`
```

### Parser (review-parser.ts)

Nova funcao `parseStructuredReview(content: string): StructuredReview` que:
1. Tenta `JSON.parse` na resposta
2. Valida estrutura
3. Fallback: retorna conteudo original no summary se parsing falhar

---

## 4. Visualizacao Inline

### Componente CommentIndicator (novo)

```tsx
interface CommentIndicatorProps {
  comment: ReviewComment
}

function CommentIndicator({ comment }: CommentIndicatorProps) {
  const [showPopover, setShowPopover] = useState(false)
  // Icone colorido por tipo
  // Click abre popover com conteudo
}
```

### Cores por tipo

- bug: vermelho
- performance: laranja
- readability: azul
- suggestion: amarelo
- positive: verde

### Integracao DiffView

1. Receber `comments` do reviewStore
2. Filtrar comentarios do arquivo atual
3. Renderizar `CommentIndicator` nas linhas correspondentes

### Popover

Usar `createPortal` para renderizar no body. Exibir:
- Icone + tipo do comentario
- Conteudo em markdown

---

## 5. Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `electron/ai/providers/types.ts` | Novas interfaces ReviewComment, StructuredReview |
| `electron/ai/review-config.ts` | STRUCTURED_REVIEW_PROMPT |
| `electron/ai/provider-manager.ts` | AbortController, cancelActiveReview |
| `electron/ai/providers/openrouter.ts` | Receber signal no fetch |
| `electron/ai/providers/glm.ts` | Receber signal no fetch |
| `electron/ai/review-ipc.ts` | Handler review:cancel |
| `electron/preload.ts` | Expor review.cancel |
| `src/stores/review.ts` | Campo comments, setComments |
| `src/components/review/ReviewPanel.tsx` | Botao cancelar, exibir generalNotes |
| `src/components/diff/CommentIndicator.tsx` | Novo componente |
| `src/components/diff/DiffView.tsx` | Integrar indicadores |
| `src/lib/review-parser.ts` | parseStructuredReview |

---

## 6. Fluxo de Dados

### Review

1. Usuario clica "Review"
2. Frontend chama `review.branch()`
3. Backend cria AbortController, faz requisicao
4. Provider retorna JSON
5. Backend parseia para StructuredReview
6. Frontend armazena: content=summary, comments=array
7. ReviewPanel exibe summary + generalNotes
8. DiffView renderiza indicadores

### Cancelamento

1. Usuario clica no loader
2. Frontend chama `review.cancel()`
3. Backend aborta requisicao
4. Provider propaga AbortError
5. Frontend limpa estado de loading
