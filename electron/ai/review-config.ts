import Store from 'electron-store'
import type { ReviewConfig, RepoReviewConfig } from './providers/types'

interface StoreSchema {
  reviewProvider: 'claude-code' | 'openrouter' | 'glm'
  glmApiKey: string
  repoConfigs: Record<string, RepoReviewConfig>
}

const store = new Store<StoreSchema>({
  name: 'review-config',
  defaults: {
    reviewProvider: 'openrouter',
    glmApiKey: '',
    repoConfigs: {}
  },
  encryptionKey: 'git-branch-viewer-secure-key'
})

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
  const repoConfigs = store.get('repoConfigs')
  const existingConfig = repoConfigs[repoPath]

  if (existingConfig) {
    return existingConfig
  }

  return {
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    baseBranch: 'main'
  }
}

export function setRepoReviewConfig(repoPath: string, config: Partial<RepoReviewConfig>): void {
  const repoConfigs = store.get('repoConfigs')
  const existingConfig = repoConfigs[repoPath] || {
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    baseBranch: 'main'
  }

  const updatedConfig: RepoReviewConfig = {
    ...existingConfig,
    ...config
  }

  store.set('repoConfigs', {
    ...repoConfigs,
    [repoPath]: updatedConfig
  })
}

export function getReviewConfigState(): {
  provider: string
  glmApiKeyConfigured: boolean
} {
  const glmApiKey = store.get('glmApiKey')
  return {
    provider: store.get('reviewProvider'),
    glmApiKeyConfigured: glmApiKey.length > 0
  }
}

export function resetRepoReviewPrompt(repoPath: string): void {
  const repoConfigs = store.get('repoConfigs')
  const existingConfig = repoConfigs[repoPath]

  if (existingConfig) {
    store.set('repoConfigs', {
      ...repoConfigs,
      [repoPath]: {
        ...existingConfig,
        reviewPrompt: DEFAULT_REVIEW_PROMPT
      }
    })
  }
}

export function clearAllRepoConfigs(): void {
  store.set('repoConfigs', {})
}
