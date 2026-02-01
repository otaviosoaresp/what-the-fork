import Store from 'electron-store'
import type { OpenRouterConfig, AIConfigState } from './types'

interface StoreSchema {
  aiApiKey: string
  aiModel: string
}

const store = new Store<StoreSchema>({
  defaults: {
    aiApiKey: '',
    aiModel: 'anthropic/claude-sonnet-4'
  },
  encryptionKey: 'git-branch-viewer-secure-key'
})

export function getConfig(): OpenRouterConfig {
  return {
    apiKey: store.get('aiApiKey'),
    model: store.get('aiModel')
  }
}

export function setConfig(config: Partial<OpenRouterConfig>): void {
  if (config.apiKey !== undefined) {
    store.set('aiApiKey', config.apiKey)
  }
  if (config.model !== undefined) {
    store.set('aiModel', config.model)
  }
}

export function getConfigState(): AIConfigState {
  const apiKey = store.get('aiApiKey')
  return {
    apiKeyConfigured: apiKey.length > 0,
    model: store.get('aiModel')
  }
}

export function clearConfig(): void {
  store.set('aiApiKey', '')
}
