import { create } from 'zustand'
import type { ReviewComment } from '../../electron/ai/providers/types'

interface ReviewState {
  isOpen: boolean
  isLoading: boolean
  content: string | null
  error: string | null
  provider: string | null
  comments: ReviewComment[]
  generalNotes: string[]

  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
  setLoading: (loading: boolean) => void
  setContent: (content: string, provider: string) => void
  setStructuredContent: (summary: string, comments: ReviewComment[], generalNotes: string[], provider: string) => void
  setError: (error: string) => void
  clear: () => void
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  isOpen: false,
  isLoading: false,
  content: null,
  error: null,
  provider: null,
  comments: [],
  generalNotes: [],

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
    error: null
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
    generalNotes: []
  })
}))
