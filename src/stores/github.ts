import { create } from 'zustand'

interface GitHubAccount {
  username: string
  isActive: boolean
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

  checkAvailability: () => Promise<void>
  loadAccounts: () => Promise<void>
  selectAccount: (username: string) => Promise<void>
  setNeedsAccountSelection: (needs: boolean) => void
  setPrFilter: (filter: 'created' | 'review-requested' | 'all') => void
  loadPullRequests: (repo: string) => Promise<void>
  refreshPullRequests: (repo: string) => Promise<void>
  loadBranchPrMap: (repo: string, branches: string[]) => Promise<void>
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

  loadPullRequests: async (repo: string) => {
    const { selectedAccount, prFilter } = get()
    if (!selectedAccount) return

    set({ prLoading: true })
    try {
      const prs = await window.electron.github.pr.list({
        repo,
        type: prFilter
      })
      set({ pullRequests: prs })
    } finally {
      set({ prLoading: false })
    }
  },

  refreshPullRequests: async (repo: string) => {
    await get().loadPullRequests(repo)
  },

  loadBranchPrMap: async (repo: string, branches: string[]) => {
    const { selectedAccount } = get()
    if (!selectedAccount) return

    const map: Record<string, PullRequest> = {}

    await Promise.all(
      branches.slice(0, 50).map(async (branch) => {
        const pr = await window.electron.github.pr.forBranch({
          repo,
          branch
        })
        if (pr) {
          map[branch] = pr
        }
      })
    )

    set({ branchPrMap: map })
  },

  clearState: () => {
    set({
      pullRequests: [],
      branchPrMap: {},
      selectedAccount: null,
      needsAccountSelection: false
    })
  }
}))
