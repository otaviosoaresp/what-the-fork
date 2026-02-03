# Syntax Highlighting e Word-Level Diff - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar syntax highlighting (Monaco) e word-level diff com paleta acessivel (azul/laranja) para protanopia.

**Architecture:** Usar Monaco tokenizer para syntax highlighting sem instanciar editor. Implementar algoritmo LCS para detectar mudancas a nivel de palavra. Combinar tokens de sintaxe com tokens de diff na renderizacao.

**Tech Stack:** Monaco Editor (tokenizer), React, TypeScript, Tailwind CSS

---

## Task 1: Adicionar cores acessiveis ao tema

**Files:**
- Modify: `src/index.css:3-18`

**Step 1: Adicionar variaveis de cor para diff acessivel**

Adicionar ao bloco `@theme` em `src/index.css`:

```css
--color-diff-removed-bg: #1e3a5f;
--color-diff-removed-border: #3b82f6;
--color-diff-removed-word: #2d5a87;
--color-diff-added-bg: #5f3a1e;
--color-diff-added-border: #f59e0b;
--color-diff-added-word: #87652d;
```

**Step 2: Verificar visualmente**

Run: `npm run dev`
Verificar que o app inicia sem erros de CSS.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): add accessible diff colors for protanopia"
```

---

## Task 2: Criar mapeamento de extensao para linguagem Monaco

**Files:**
- Create: `src/lib/language-map.ts`

**Step 1: Criar arquivo de mapeamento**

Criar `src/lib/language-map.ts`:

```typescript
const extensionToLanguage: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  mdx: 'markdown',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  vue: 'vue',
  svelte: 'svelte',
  graphql: 'graphql',
  gql: 'graphql',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  toml: 'toml',
  ini: 'ini',
  env: 'ini',
}

export function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  return extensionToLanguage[extension] ?? 'plaintext'
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/lib/language-map.ts
git commit -m "feat(diff): add file extension to Monaco language mapping"
```

---

## Task 3: Criar algoritmo de word-level diff (LCS)

**Files:**
- Create: `src/lib/diff-tokens.ts`

**Step 1: Criar arquivo com algoritmo LCS**

Criar `src/lib/diff-tokens.ts`:

```typescript
export interface DiffToken {
  text: string
  type: 'unchanged' | 'removed' | 'added'
}

function tokenizeWords(text: string): string[] {
  const tokens: string[] = []
  let current = ''

  for (const char of text) {
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else if (/[^\w]/.test(char)) {
      if (current) {
        tokens.push(current)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }

  if (current) {
    tokens.push(current)
  }

  return tokens
}

function lcsLength(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

function backtrackLCS(
  dp: number[][],
  a: string[],
  b: string[],
  i: number,
  j: number
): string[] {
  if (i === 0 || j === 0) return []

  if (a[i - 1] === b[j - 1]) {
    return [...backtrackLCS(dp, a, b, i - 1, j - 1), a[i - 1]]
  }

  if (dp[i - 1][j] > dp[i][j - 1]) {
    return backtrackLCS(dp, a, b, i - 1, j)
  }

  return backtrackLCS(dp, a, b, i, j - 1)
}

export function computeWordDiff(
  oldText: string,
  newText: string
): { removed: DiffToken[]; added: DiffToken[] } {
  const oldTokens = tokenizeWords(oldText)
  const newTokens = tokenizeWords(newText)

  const dp = lcsLength(oldTokens, newTokens)
  const lcs = new Set(backtrackLCS(dp, oldTokens, newTokens, oldTokens.length, newTokens.length))

  const removed: DiffToken[] = []
  const added: DiffToken[] = []

  let lcsIndex = 0
  const lcsArray = Array.from(lcs)

  for (const token of oldTokens) {
    if (lcsIndex < lcsArray.length && token === lcsArray[lcsIndex]) {
      removed.push({ text: token, type: 'unchanged' })
      lcsIndex++
    } else {
      removed.push({ text: token, type: 'removed' })
    }
  }

  lcsIndex = 0
  for (const token of newTokens) {
    if (lcsIndex < lcsArray.length && token === lcsArray[lcsIndex]) {
      added.push({ text: token, type: 'unchanged' })
      lcsIndex++
    } else {
      added.push({ text: token, type: 'added' })
    }
  }

  return { removed, added }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/lib/diff-tokens.ts
git commit -m "feat(diff): add LCS-based word-level diff algorithm"
```

---

## Task 4: Criar wrapper do Monaco tokenizer

**Files:**
- Create: `src/lib/monaco-tokenizer.ts`

**Step 1: Criar wrapper para tokenizacao**

Criar `src/lib/monaco-tokenizer.ts`:

```typescript
import * as monaco from 'monaco-editor'

export interface SyntaxToken {
  text: string
  className: string
}

const tokenTypeToClass: Record<string, string> = {
  keyword: 'text-purple-400',
  'keyword.control': 'text-purple-400',
  string: 'text-amber-300',
  'string.quoted': 'text-amber-300',
  number: 'text-teal-300',
  comment: 'text-slate-500 italic',
  'comment.line': 'text-slate-500 italic',
  'comment.block': 'text-slate-500 italic',
  type: 'text-cyan-400',
  'type.identifier': 'text-cyan-400',
  function: 'text-blue-400',
  variable: 'text-foreground',
  operator: 'text-slate-300',
  delimiter: 'text-slate-400',
  'delimiter.bracket': 'text-slate-400',
}

function getClassForTokenType(tokenType: string): string {
  if (tokenTypeToClass[tokenType]) {
    return tokenTypeToClass[tokenType]
  }

  const parts = tokenType.split('.')
  for (let i = parts.length; i > 0; i--) {
    const partial = parts.slice(0, i).join('.')
    if (tokenTypeToClass[partial]) {
      return tokenTypeToClass[partial]
    }
  }

  return 'text-foreground'
}

export function tokenizeLine(content: string, languageId: string): SyntaxToken[] {
  try {
    const tokens = monaco.editor.tokenize(content, languageId)

    if (!tokens.length || !tokens[0].length) {
      return [{ text: content, className: 'text-foreground' }]
    }

    const result: SyntaxToken[] = []
    const lineTokens = tokens[0]

    for (let i = 0; i < lineTokens.length; i++) {
      const token = lineTokens[i]
      const nextToken = lineTokens[i + 1]
      const start = token.offset
      const end = nextToken ? nextToken.offset : content.length
      const text = content.substring(start, end)

      if (text) {
        result.push({
          text,
          className: getClassForTokenType(token.type),
        })
      }
    }

    return result.length ? result : [{ text: content, className: 'text-foreground' }]
  } catch {
    return [{ text: content, className: 'text-foreground' }]
  }
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/lib/monaco-tokenizer.ts
git commit -m "feat(diff): add Monaco tokenizer wrapper for syntax highlighting"
```

---

## Task 5: Criar componente TokenizedLine

**Files:**
- Create: `src/components/diff/TokenizedLine.tsx`

**Step 1: Criar componente de linha tokenizada**

Criar `src/components/diff/TokenizedLine.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { tokenizeLine, type SyntaxToken } from '@/lib/monaco-tokenizer'
import { computeWordDiff, type DiffToken } from '@/lib/diff-tokens'
import { getLanguageFromPath } from '@/lib/language-map'
import { useMemo } from 'react'

interface TokenizedLineProps {
  content: string
  filePath: string
  lineType: 'add' | 'remove' | 'context'
  pairedContent?: string
}

interface CombinedToken {
  text: string
  syntaxClass: string
  diffType: 'unchanged' | 'removed' | 'added'
}

function combineTokens(
  syntaxTokens: SyntaxToken[],
  diffTokens: DiffToken[]
): CombinedToken[] {
  const result: CombinedToken[] = []
  let syntaxIndex = 0
  let syntaxOffset = 0
  let diffIndex = 0
  let diffOffset = 0

  while (syntaxIndex < syntaxTokens.length && diffIndex < diffTokens.length) {
    const syntax = syntaxTokens[syntaxIndex]
    const diff = diffTokens[diffIndex]

    const syntaxRemaining = syntax.text.length - syntaxOffset
    const diffRemaining = diff.text.length - diffOffset

    const takeLength = Math.min(syntaxRemaining, diffRemaining)
    const text = syntax.text.substring(syntaxOffset, syntaxOffset + takeLength)

    if (text) {
      result.push({
        text,
        syntaxClass: syntax.className,
        diffType: diff.type,
      })
    }

    syntaxOffset += takeLength
    diffOffset += takeLength

    if (syntaxOffset >= syntax.text.length) {
      syntaxIndex++
      syntaxOffset = 0
    }

    if (diffOffset >= diff.text.length) {
      diffIndex++
      diffOffset = 0
    }
  }

  while (syntaxIndex < syntaxTokens.length) {
    const syntax = syntaxTokens[syntaxIndex]
    const text = syntax.text.substring(syntaxOffset)
    if (text) {
      result.push({
        text,
        syntaxClass: syntax.className,
        diffType: 'unchanged',
      })
    }
    syntaxIndex++
    syntaxOffset = 0
  }

  return result
}

export function TokenizedLine({
  content,
  filePath,
  lineType,
  pairedContent,
}: TokenizedLineProps) {
  const tokens = useMemo(() => {
    const language = getLanguageFromPath(filePath)
    const syntaxTokens = tokenizeLine(content, language)

    if (lineType === 'context' || !pairedContent) {
      return syntaxTokens.map((t) => ({
        text: t.text,
        syntaxClass: t.className,
        diffType: 'unchanged' as const,
      }))
    }

    const { removed, added } = computeWordDiff(
      lineType === 'remove' ? content : pairedContent,
      lineType === 'add' ? content : pairedContent
    )

    const diffTokens = lineType === 'remove' ? removed : added
    return combineTokens(syntaxTokens, diffTokens)
  }, [content, filePath, lineType, pairedContent])

  return (
    <span className="whitespace-pre-wrap break-all">
      {tokens.map((token, index) => (
        <span
          key={index}
          className={cn(
            token.syntaxClass,
            token.diffType === 'removed' && 'bg-[var(--color-diff-removed-word)] line-through',
            token.diffType === 'added' && 'bg-[var(--color-diff-added-word)] font-bold'
          )}
        >
          {token.text}
        </span>
      ))}
    </span>
  )
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/components/diff/TokenizedLine.tsx
git commit -m "feat(diff): add TokenizedLine component combining syntax and word diff"
```

---

## Task 6: Criar funcao para parear linhas de diff

**Files:**
- Create: `src/lib/diff-line-pairing.ts`

**Step 1: Criar funcao de pareamento**

Criar `src/lib/diff-line-pairing.ts`:

```typescript
import type { DiffLine, DiffChunk } from '../../electron/git/types'

export interface PairedLine {
  line: DiffLine
  pairedContent?: string
}

export function pairChunkLines(chunk: DiffChunk): PairedLine[] {
  const result: PairedLine[] = []
  const lines = chunk.lines
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.type === 'context') {
      result.push({ line })
      i++
      continue
    }

    if (line.type === 'remove') {
      const removes: DiffLine[] = []
      const adds: DiffLine[] = []

      while (i < lines.length && lines[i].type === 'remove') {
        removes.push(lines[i])
        i++
      }

      while (i < lines.length && lines[i].type === 'add') {
        adds.push(lines[i])
        i++
      }

      for (let j = 0; j < Math.max(removes.length, adds.length); j++) {
        if (j < removes.length) {
          result.push({
            line: removes[j],
            pairedContent: j < adds.length ? adds[j].content : undefined,
          })
        }
        if (j < adds.length) {
          result.push({
            line: adds[j],
            pairedContent: j < removes.length ? removes[j].content : undefined,
          })
        }
      }
      continue
    }

    if (line.type === 'add') {
      result.push({ line })
      i++
    }
  }

  return result
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Commit**

```bash
git add src/lib/diff-line-pairing.ts
git commit -m "feat(diff): add line pairing utility for word-level diff"
```

---

## Task 7: Atualizar UnifiedView com novo estilo

**Files:**
- Modify: `src/components/diff/UnifiedView.tsx`

**Step 1: Substituir conteudo do UnifiedView**

Substituir conteudo de `src/components/diff/UnifiedView.tsx`:

```typescript
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'
import { pairChunkLines } from '@/lib/diff-line-pairing'
import { useMemo } from 'react'

interface UnifiedViewProps {
  file: DiffFile
}

export function UnifiedView({ file }: UnifiedViewProps) {
  const pairedLines = useMemo(() => {
    return file.chunks.flatMap((chunk) => ({
      chunk,
      lines: pairChunkLines(chunk),
    }))
  }, [file.chunks])

  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="p-0">
        {pairedLines.map(({ chunk, lines }, chunkIndex) => (
          <div key={chunkIndex}>
            <div className="px-4 py-1 bg-accent/10 text-accent text-xs">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </div>
            {lines.map(({ line, pairedContent }, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'flex',
                  line.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]',
                  line.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]'
                )}
              >
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.oldLineNumber ?? ''}
                </span>
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.newLineNumber ?? ''}
                </span>
                <span className="w-6 text-center select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <pre className="flex-1 px-2">
                  <TokenizedLine
                    content={line.content}
                    filePath={file.path}
                    lineType={line.type}
                    pairedContent={pairedContent}
                  />
                </pre>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Testar visualmente**

Run: `npm run dev`
Abrir um diff e verificar:
- Syntax highlighting aplicado
- Cores azul/laranja nas linhas
- Borda lateral visivel
- Palavras alteradas destacadas

**Step 4: Commit**

```bash
git add src/components/diff/UnifiedView.tsx
git commit -m "feat(diff): update UnifiedView with syntax highlighting and accessible colors"
```

---

## Task 8: Atualizar SplitView com novo estilo

**Files:**
- Modify: `src/components/diff/SplitView.tsx`

**Step 1: Substituir conteudo do SplitView**

Substituir conteudo de `src/components/diff/SplitView.tsx`:

```typescript
import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine } from '../../../electron/git/types'
import { TokenizedLine } from './TokenizedLine'

interface SplitViewProps {
  file: DiffFile
}

interface SideBySideLine {
  left: DiffLine | null
  right: DiffLine | null
}

function buildSideBySideLines(file: DiffFile): SideBySideLine[] {
  const result: SideBySideLine[] = []

  for (const chunk of file.chunks) {
    const removes: DiffLine[] = []
    const adds: DiffLine[] = []

    for (const line of chunk.lines) {
      if (line.type === 'context') {
        while (removes.length > 0 || adds.length > 0) {
          result.push({
            left: removes.shift() ?? null,
            right: adds.shift() ?? null
          })
        }
        result.push({ left: line, right: line })
      } else if (line.type === 'remove') {
        removes.push(line)
      } else if (line.type === 'add') {
        adds.push(line)
      }
    }

    while (removes.length > 0 || adds.length > 0) {
      result.push({
        left: removes.shift() ?? null,
        right: adds.shift() ?? null
      })
    }
  }

  return result
}

export function SplitView({ file }: SplitViewProps) {
  const lines = buildSideBySideLines(file)

  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="flex">
        <div className="flex-1 border-r border-border">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.left?.type === 'remove' && 'bg-[var(--color-diff-removed-bg)] border-l-[3px] border-l-[var(--color-diff-removed-border)]'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.left?.oldLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 min-h-[1.5rem]">
                {line.left && (
                  <TokenizedLine
                    content={line.left.content}
                    filePath={file.path}
                    lineType={line.left.type}
                    pairedContent={line.right?.type === 'add' ? line.right.content : undefined}
                  />
                )}
              </pre>
            </div>
          ))}
        </div>
        <div className="flex-1">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.right?.type === 'add' && 'bg-[var(--color-diff-added-bg)] border-l-[3px] border-l-[var(--color-diff-added-border)]'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.right?.newLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 min-h-[1.5rem]">
                {line.right && (
                  <TokenizedLine
                    content={line.right.content}
                    filePath={file.path}
                    lineType={line.right.type}
                    pairedContent={line.left?.type === 'remove' ? line.left.content : undefined}
                  />
                )}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 3: Testar visualmente**

Run: `npm run dev`
Abrir um diff em modo split e verificar:
- Syntax highlighting em ambos os paineis
- Cores azul/laranja corretas
- Borda lateral visivel
- Palavras alteradas destacadas

**Step 4: Commit**

```bash
git add src/components/diff/SplitView.tsx
git commit -m "feat(diff): update SplitView with syntax highlighting and accessible colors"
```

---

## Task 9: Teste final e commit de finalizacao

**Step 1: Verificar TypeScript do projeto inteiro**

Run: `npx tsc --noEmit`
Expected: Sem erros

**Step 2: Testar app completo**

Run: `npm run dev`
Testar:
- [ ] Unified view com arquivo TypeScript
- [ ] Split view com arquivo TypeScript
- [ ] Unified view com arquivo Python/JSON/outro
- [ ] Linhas de contexto sem destaque
- [ ] Linhas removidas com fundo azul e borda
- [ ] Linhas adicionadas com fundo laranja e borda
- [ ] Palavras alteradas com destaque e estilo
- [ ] Performance aceitavel em diffs grandes

**Step 3: Commit final se necessario**

Se houver ajustes:
```bash
git add -A
git commit -m "fix(diff): adjustments after integration testing"
```
