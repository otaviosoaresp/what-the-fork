import { create } from 'zustand'
import type { ReviewComment, ReviewHistoryEntry } from '@/types/electron'

interface ReviewContext {
  type: 'issue' | 'manual'
  issue?: { number: number; title: string; body: string }
  issueRepo?: string
  text?: string
}

interface ReviewState {
  isOpen: boolean
  isLoading: boolean
  content: string | null
  error: string | null
  provider: string | null
  comments: ReviewComment[]
  generalNotes: string[]
  activeTab: 'review' | 'history'
  history: ReviewHistoryEntry[]
  selectedHistoryEntry: ReviewHistoryEntry | null
  historyDiffChanged: boolean
  reviewContext: ReviewContext | null

  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setLoading: (loading: boolean) => void
  setContent: (content: string, provider: string) => void
  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => void
  setError: (error: string) => void
  clear: () => void
  setActiveTab: (tab: 'review' | 'history') => void
  setHistory: (history: ReviewHistoryEntry[]) => void
  selectHistoryEntry: (entry: ReviewHistoryEntry | null, diffChanged: boolean) => void
  setReviewContext: (context: ReviewContext | null) => void
  clearReviewContext: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  content: null,
  error: null,
  provider: null,
  comments: [],
  generalNotes: [],
  activeTab: 'review',
  history: [],
  selectedHistoryEntry: null,
  historyDiffChanged: false,
  reviewContext: null,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set({ isOpen: !get().isOpen }),

  setLoading: (isLoading: boolean) => set({ isLoading, error: null }),

  setContent: (content: string, provider: string) => set({
    content,
    provider,
    isLoading: false,
    error: null
  }),

  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => set({
    content: summary,
    comments,
    generalNotes,
    provider,
    isLoading: false,
    error: null,
    selectedHistoryEntry: null,
    historyDiffChanged: false
  }),

  setError: (error: string) => set({
    error,
    isLoading: false,
    content: null
  }),

  clear: () => set({
    content: null,
    error: null,
    provider: null,
    isLoading: false,
    comments: [],
    generalNotes: [],
    activeTab: 'review',
    history: [],
    selectedHistoryEntry: null,
    historyDiffChanged: false,
    reviewContext: null
  }),

  setActiveTab: (activeTab: 'review' | 'history') => set({ activeTab }),

  setHistory: (history: ReviewHistoryEntry[]) => set({ history }),

  selectHistoryEntry: (entry: ReviewHistoryEntry | null, diffChanged: boolean) => set({
    selectedHistoryEntry: entry,
    historyDiffChanged: diffChanged,
    content: entry?.summary ?? null,
    comments: entry?.comments ?? [],
    generalNotes: entry?.generalNotes ?? [],
    provider: entry?.provider ?? null,
    activeTab: 'review'
  }),

  setReviewContext: (context) => set({ reviewContext: context }),
  clearReviewContext: () => set({ reviewContext: null })
}))
