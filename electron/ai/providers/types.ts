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
