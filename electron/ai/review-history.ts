import Store from 'electron-store'
import crypto from 'crypto'
import type { StructuredReview, ReviewComment } from './providers/types'

export interface ReviewHistoryEntry {
  timestamp: number
  baseBranch: string
  compareBranch: string
  diffHash: string
  provider: string
  summary: string
  comments: ReviewComment[]
  generalNotes: string[]
}

interface ReviewHistorySchema {
  reviews: Record<string, ReviewHistoryEntry[]>
}

const store = new Store<ReviewHistorySchema>({
  name: 'review-history',
  defaults: {
    reviews: {}
  }
})

const MAX_HISTORY_PER_REPO = 10

function generateDiffHash(diff: string): string {
  return crypto.createHash('md5').update(diff).digest('hex').substring(0, 16)
}

export function getCachedReview(
  repoPath: string,
  baseBranch: string,
  compareBranch: string,
  diff: string
): { review: StructuredReview; provider: string } | null {
  const reviews = store.get('reviews')
  const repoHistory = reviews[repoPath]

  if (!repoHistory || repoHistory.length === 0) {
    return null
  }

  const diffHash = generateDiffHash(diff)

  const cached = repoHistory.find(
    entry =>
      entry.baseBranch === baseBranch &&
      entry.compareBranch === compareBranch &&
      entry.diffHash === diffHash
  )

  if (cached) {
    return {
      review: {
        summary: cached.summary,
        comments: cached.comments,
        generalNotes: cached.generalNotes
      },
      provider: cached.provider
    }
  }

  return null
}

export function saveReviewToHistory(
  repoPath: string,
  baseBranch: string,
  compareBranch: string,
  diff: string,
  provider: string,
  review: StructuredReview
): void {
  const reviews = store.get('reviews')
  const repoHistory = reviews[repoPath] || []

  const diffHash = generateDiffHash(diff)

  // Remove existing entry for same branches and diff if exists
  const filteredHistory = repoHistory.filter(
    entry =>
      !(entry.baseBranch === baseBranch &&
        entry.compareBranch === compareBranch &&
        entry.diffHash === diffHash)
  )

  // Add new entry at the beginning
  const newEntry: ReviewHistoryEntry = {
    timestamp: Date.now(),
    baseBranch,
    compareBranch,
    diffHash,
    provider,
    summary: review.summary,
    comments: review.comments,
    generalNotes: review.generalNotes
  }

  filteredHistory.unshift(newEntry)

  // Keep only last N entries
  const trimmedHistory = filteredHistory.slice(0, MAX_HISTORY_PER_REPO)

  store.set('reviews', {
    ...reviews,
    [repoPath]: trimmedHistory
  })
}

export function getReviewHistory(repoPath: string): ReviewHistoryEntry[] {
  const reviews = store.get('reviews')
  return reviews[repoPath] || []
}

export function clearReviewHistory(repoPath: string): void {
  const reviews = store.get('reviews')
  delete reviews[repoPath]
  store.set('reviews', reviews)
}

export function deleteReviewEntry(repoPath: string, timestamp: number): void {
  const reviews = store.get('reviews')
  const repoHistory = reviews[repoPath]

  if (!repoHistory) {
    return
  }

  const filteredHistory = repoHistory.filter(entry => entry.timestamp !== timestamp)

  if (filteredHistory.length === 0) {
    delete reviews[repoPath]
  } else {
    reviews[repoPath] = filteredHistory
  }

  store.set('reviews', reviews)
}
