export interface ReviewRequest {
  prompt: string
  context: string
  repoPath: string
  signal?: AbortSignal
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

export type CommentType = 'bug' | 'performance' | 'readability' | 'suggestion' | 'positive'

export interface ReviewComment {
  file: string
  line: number
  type: CommentType
  content: string
}

export interface StructuredReview {
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}
