# Syntax Highlighting e Word-Level Diff

Data: 2026-02-03

## Objetivo

Implementar syntax highlighting e word-level diff no visualizador de diffs, com foco em acessibilidade para daltonismo (protanopia).

## Decisoes

- **Syntax highlighting**: Monaco Editor (ja no projeto)
- **Word-level diff**: Destacar palavras/caracteres alterados dentro de cada linha
- **Paleta de cores**: Azul/laranja (acessivel para protanopia)
- **Indicadores visuais**: Cor + borda + estilo de texto (redundancia)
- **Escopo**: Substituir estilo atual em ambas as views (unified e split)

## Arquitetura

### Fluxo de Dados

```
Git diff (texto)
  → Parser atual (DiffLine[])
  → Word-diff processor (adiciona tokens de mudanca)
  → Monaco tokenizer (adiciona tokens de sintaxe)
  → Renderizacao com estilos combinados
```

### Componentes Afetados

- `UnifiedView.tsx` - integrar Monaco para colorir linhas
- `SplitView.tsx` - mesma integracao
- Novo: `useTokenizedLine.ts` - hook para processar linha
- Novo: `diff-theme.ts` - tema customizado com paleta acessivel

## Sistema Visual

### Paleta de Cores

| Elemento | Cor | Indicador Visual Adicional |
|----------|-----|---------------------------|
| Linha removida | Azul claro (`#1e3a5f` fundo) | Borda esquerda solida azul |
| Linha adicionada | Laranja claro (`#5f3a1e` fundo) | Borda esquerda solida laranja |
| Palavra removida | Azul medio (`#2d5a87`) | Texto tachado |
| Palavra adicionada | Laranja medio (`#87652d`) | Texto em negrito |
| Contexto | Sem fundo | Sem borda |

### Exemplo Visual

```
  10 │   │ const value = calculateTotal(items);
- 11 │ ▌ │ const result = value * 0.1;        ← fundo azul, "0.1" tachado
+ 11 │ ▌ │ const result = value * 0.15;       ← fundo laranja, "0.15" negrito
  12 │   │ return result;
```

## Algoritmo Word-Level Diff

### Estrategia

1. Para cada chunk, agrupar linhas `-` seguidas de `+`
2. Parear linha removida[i] com adicionada[i]
3. Para cada par:
   - Tokenizar ambas as linhas em palavras
   - Aplicar algoritmo LCS (Longest Common Subsequence)
   - Marcar tokens que diferem como "changed"

### Estrutura de Dados

```typescript
interface DiffToken {
  text: string
  type: 'unchanged' | 'removed' | 'added'
}

interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  tokens?: DiffToken[]  // novo campo para word-level
  oldLineNumber?: number
  newLineNumber?: number
}
```

## Integracao Monaco

### Tokenizacao

Usar `monaco.editor.tokenize()` diretamente, sem instanciar editor:

```typescript
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
const tokens = monaco.editor.tokenize(lineContent, languageId)
```

### Combinacao de Tokens

Cada linha combina dois tipos de tokens:
1. Tokens de sintaxe (Monaco): keyword, string, number, comment
2. Tokens de diff (nosso): unchanged, removed, added

### Performance

- Tokenizar apenas linhas visiveis
- Cache de tokens por arquivo/linha
- Lazy load de linguagens Monaco

## Estrutura de Arquivos

### Novos Arquivos

```
src/
├── lib/
│   ├── diff-tokens.ts       # Algoritmo word-level diff (LCS)
│   ├── monaco-tokenizer.ts  # Wrapper para tokenizar com Monaco
│   └── language-map.ts      # Mapeamento extensao → linguagem
├── hooks/
│   └── useTokenizedLine.ts  # Hook que combina syntax + diff tokens
├── components/diff/
│   ├── TokenizedLine.tsx    # Componente para renderizar linha tokenizada
│   └── diff-theme.ts        # Cores e classes CSS do tema acessivel
```

### Arquivos a Modificar

```
src/components/diff/
├── UnifiedView.tsx          # Usar TokenizedLine
├── SplitView.tsx            # Usar TokenizedLine
```

## Ordem de Implementacao

1. `diff-theme.ts` - Definir paleta azul/laranja e classes
2. `language-map.ts` - Mapeamento de extensoes
3. `diff-tokens.ts` - Algoritmo LCS para word-diff
4. `monaco-tokenizer.ts` - Integracao com Monaco
5. `useTokenizedLine.ts` - Hook que une tudo
6. `TokenizedLine.tsx` - Componente de renderizacao
7. Atualizar `UnifiedView.tsx` e `SplitView.tsx`
