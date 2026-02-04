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

export const DEFAULT_REVIEW_PROMPT = `Voce e um code reviewer experiente. Analise o diff fornecido e:
- Identifique bugs potenciais
- Sugira melhorias de performance
- Aponte problemas de legibilidade
- Valide boas praticas

Seja direto e objetivo. Use markdown para formatacao.
Ao referenciar codigo, use o formato: \`arquivo:linha\` (ex: \`src/utils.ts:42\`).`

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
