import { create } from 'zustand'

interface GitHubAccount {
  username: string
  isActive: boolean
}

interface PRComment {
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

interface PullRequest {
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

interface GitHubStore {
  isAvailable: boolean
  accounts: GitHubAccount[]
  selectedAccount: string | null
  needsAccountSelection: boolean

  pullRequests: PullRequest[]
  prFilter: 'created' | 'review-requested' | 'all'
  prLoading: boolean

  branchPrMap: Record<string, PullRequest>

  prComments: PRComment[]
  prCommentsLoading: boolean

  checkAvailability: () => Promise<void>
  loadAccounts: () => Promise<void>
  selectAccount: (username: string) => Promise<void>
  setNeedsAccountSelection: (needs: boolean) => void
  setPrFilter: (filter: 'created' | 'review-requested' | 'all') => void
  loadPullRequests: (repoPath: string) => Promise<void>
  refreshPullRequests: (repoPath: string) => Promise<void>
  loadBranchPrMap: (repoPath: string, branches: string[]) => Promise<void>
  loadPRComments: (repoPath: string, prNumber: number) => Promise<void>
  clearPRComments: () => void
  clearState: () => void
}

export const useGitHubStore = create<GitHubStore>((set, get) => ({
  isAvailable: false,
  accounts: [],
  selectedAccount: null,
  needsAccountSelection: false,

  pullRequests: [],
  prFilter: 'all',
  prLoading: false,

  branchPrMap: {},

  prComments: [],
  prCommentsLoading: false,

  checkAvailability: async () => {
    const available = await window.electron.github.isAvailable()
    set({ isAvailable: available })
  },

  loadAccounts: async () => {
    const accounts = await window.electron.github.accounts.list()
    set({ accounts })
  },

  selectAccount: async (username: string) => {
    await window.electron.github.accounts.switch(username)
    set({ selectedAccount: username, needsAccountSelection: false })
  },

  setNeedsAccountSelection: (needs: boolean) => {
    set({ needsAccountSelection: needs })
  },

  setPrFilter: (filter: 'created' | 'review-requested' | 'all') => {
    set({ prFilter: filter })
  },

  loadPullRequests: async (repoPath: string) => {
    const { selectedAccount, pullRequests } = get()
    if (!selectedAccount) return
    if (pullRequests.length > 0) return

    set({ prLoading: true })
    try {
      const prs = await window.electron.github.pr.list({
        repoPath,
        type: 'all'
      })
      set({ pullRequests: prs })
    } finally {
      set({ prLoading: false })
    }
  },

  refreshPullRequests: async (repoPath: string) => {
    const { selectedAccount } = get()
    if (!selectedAccount) return

    set({ prLoading: true })
    try {
      const prs = await window.electron.github.pr.list({
        repoPath,
        type: 'all'
      })
      set({ pullRequests: prs })
    } finally {
      set({ prLoading: false })
    }
  },

  loadBranchPrMap: async (repoPath: string, branches: string[]) => {
    const { selectedAccount } = get()
    if (!selectedAccount) return

    const map: Record<string, PullRequest> = {}

    await Promise.all(
      branches.slice(0, 50).map(async (branch) => {
        const pr = await window.electron.github.pr.forBranch({
          repoPath,
          branch
        })
        if (pr) {
          map[branch] = pr
        }
      })
    )

    set({ branchPrMap: map })
  },

  loadPRComments: async (repoPath: string, prNumber: number) => {
    set({ prCommentsLoading: true })
    try {
      const comments = await window.electron.github.pr.comments({
        repoPath,
        prNumber
      })
      set({ prComments: comments })
    } finally {
      set({ prCommentsLoading: false })
    }
  },

  clearPRComments: () => {
    set({ prComments: [] })
  },

  clearState: () => {
    set({
      pullRequests: [],
      branchPrMap: {},
      prComments: [],
      selectedAccount: null,
      needsAccountSelection: false
    })
  }
}))
