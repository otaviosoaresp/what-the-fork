# AI Code Review Integration

Data: 2026-02-04

## Objetivo

Integrar revisao de codigo automatizada com IA no What the Fork, permitindo review de branches e consultas pontuais em trechos de codigo.

## Decisoes

- **Trigger**: Manual via UI (botao "Review Branch")
- **Providers**: Claude Code CLI, OpenRouter (existente), GLM/z.ai
- **Escopo do review**: Diff completo da branch vs base (ex: main)
- **Consulta pontual**: Selecionar trecho e perguntar
- **Output**: Painel lateral togglavel com markdown
- **Configuracao**: Local por repo (electron-store), sem poluir repositorio

## Arquitetura de Providers

```
AIProvider (interface)
├── ClaudeCodeProvider  → executa CLI `claude`
├── OpenRouterProvider  → API HTTP (refatorar existente)
└── GLMProvider         → API HTTP z.ai
```

### Fluxo de chamada

```
UI → IPC → ProviderManager → Provider especifico → Resposta → UI
```

### Configuracao global (electron-store)

- `reviewProvider`: qual provider usar ('claude-code' | 'openrouter' | 'glm')
- `glmApiKey`: API key do GLM
- `openrouterApiKey`: ja existe

### Configuracao por repo (electron-store, indexado por path)

- `reviewPrompt`: instrucoes customizadas para review
- `baseBranch`: branch base para comparacao (default: 'main')

## Interface do Usuario

### Painel lateral de Review (togglavel)

- Abre ao lado direito do diff
- Cabecalho: titulo, provider atual, botao fechar
- Corpo: conteudo markdown renderizado
- Rodape: status (loading, erro, etc)

### Pontos de entrada

1. **Botao "Review Branch"** na Header
   - Visivel quando ha diff carregado
   - Envia diff completo (branch vs base)

2. **Menu de contexto no diff**
   - Selecionar trecho de codigo
   - Click direito → "Perguntar a IA"
   - Input para digitar a pergunta
   - Envia trecho + pergunta

### Configuracoes (tela Settings)

- Secao "AI Review" abaixo da secao atual de AI
- Dropdown para selecionar provider
- Campo para API key do GLM (se selecionado)
- Textarea para prompt de instrucoes do repo atual

## Fluxo de Dados

### Review completo (branch vs base)

```
1. Usuario clica "Review Branch"
2. App busca diff: git diff {baseBranch}...{currentBranch}
3. Monta prompt:
   - System: instrucoes padrao + instrucoes do repo
   - User: "Review este diff:\n{diff}"
4. Envia para provider selecionado
5. Recebe resposta markdown
6. Abre/atualiza painel lateral com resultado
```

### Consulta pontual (trecho selecionado)

```
1. Usuario seleciona trecho no diff
2. Click direito → "Perguntar a IA"
3. Modal pede a pergunta
4. Monta prompt:
   - System: instrucoes padrao
   - User: "Codigo:\n{trecho}\n\nPergunta: {pergunta}"
5. Envia para provider
6. Abre/atualiza painel lateral com resultado
```

### Prompt padrao de review

```
Voce e um code reviewer experiente. Analise o diff fornecido e:
- Identifique bugs potenciais
- Sugira melhorias de performance
- Aponte problemas de legibilidade
- Valide boas praticas

Seja direto e objetivo. Use markdown para formatacao.
```

## Integracao Claude Code CLI

### Execucao

```typescript
import { spawn } from 'child_process'

const process = spawn('claude', [
  '--print',
  '--output-format', 'text',
  '-p', prompt
], { cwd: repoPath })
```

### Deteccao de disponibilidade

- No startup, verificar se `claude --version` funciona
- Se nao disponivel, desabilitar opcao no dropdown
- Mostrar tooltip: "Claude Code nao instalado"

### Tratamento de erros

- Timeout (default 120s para reviews grandes)
- Erro de autenticacao → mensagem para usuario fazer login no CLI
- Processo nao encontrado → sugerir instalacao

## Integracao GLM (z.ai)

### API Details

- **Base URL**: `https://api.z.ai/api/coding/paas/v4` (para codigo)
- **Auth**: Bearer token no header Authorization
- **Modelo**: `glm-4.7`

### Request format

```json
{
  "model": "glm-4.7",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ]
}
```

## Estrutura de Arquivos

### Novos arquivos

```
electron/
├── ai/
│   ├── providers/
│   │   ├── types.ts           # Interface AIProvider
│   │   ├── claude-code.ts     # ClaudeCodeProvider
│   │   ├── openrouter.ts      # Refatorar existente
│   │   └── glm.ts             # GLMProvider
│   ├── provider-manager.ts    # Seleciona e executa provider
│   ├── review-config.ts       # Config por repo
│   └── review-ipc.ts          # IPC handlers de review

src/
├── components/
│   ├── review/
│   │   ├── ReviewPanel.tsx    # Painel lateral togglavel
│   │   ├── ReviewHeader.tsx   # Cabecalho com controles
│   │   └── ReviewContent.tsx  # Renderiza markdown
│   └── settings/
│       └── AISettings.tsx     # Expandir com config de review
├── stores/
│   └── review.ts              # Estado do painel de review
```

### Arquivos a modificar

- `electron/ai/ipc-handlers.ts` - adicionar handlers de review
- `electron/preload.ts` - expor novos IPCs
- `src/components/layout/Header.tsx` - botao Review
- `src/components/diff/UnifiedView.tsx` - menu contexto
- `src/components/diff/SplitView.tsx` - menu contexto
