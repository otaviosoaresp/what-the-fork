export interface OpenRouterConfig {
  apiKey: string
  model: string
}

export interface AIConfigState {
  apiKeyConfigured: boolean
  model: string
}

export interface GenerateCommitMessageResult {
  message: string
}
