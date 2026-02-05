export interface GitHubAccount {
  username: string
  isActive: boolean
}

export interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  updatedAt: string
  headBranch: string
  baseBranch: string
  reviewStatus: {
    approved: number
    changesRequested: number
    pending: string[]
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  milestone: string | null
  commentsCount: number
  mergeable: boolean | null
  url: string
}

export interface Issue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  labels: string[]
  url: string
}

export interface ReviewContext {
  type: 'issue' | 'manual'
  issueNumber?: number
  issueContent?: Issue
  manualContext?: string
}

export interface PRComment {
  id: number
  path: string
  line: number | null
  originalLine: number | null
  side: 'LEFT' | 'RIGHT'
  body: string
  author: string
  createdAt: string
  inReplyToId: number | null
}
