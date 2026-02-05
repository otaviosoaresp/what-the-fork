import { RefreshCw, GitPullRequest } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'
import { PullRequestItem } from './PullRequestItem'

export function PullRequestsTab() {
  const { repoPath } = useRepositoryStore()
  const {
    isAvailable,
    selectedAccount,
    pullRequests,
    prFilter,
    prLoading,
    setPrFilter,
    loadPullRequests,
    refreshPullRequests
  } = useGitHubStore()

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isAvailable && selectedAccount && repoPath) {
      loadPullRequests(repoPath)
    }
  }, [isAvailable, selectedAccount, repoPath, loadPullRequests])

  const filteredPRs = useMemo(() => {
    let filtered = pullRequests

    if (prFilter === 'created') {
      filtered = filtered.filter(pr => pr.author === selectedAccount)
    } else if (prFilter === 'review-requested') {
      filtered = filtered.filter(pr =>
        pr.author !== selectedAccount &&
        pr.reviewStatus.pending.includes(selectedAccount || '')
      )
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(pr =>
        pr.title.toLowerCase().includes(query) ||
        pr.headBranch.toLowerCase().includes(query) ||
        pr.baseBranch.toLowerCase().includes(query) ||
        pr.author.toLowerCase().includes(query) ||
        `#${pr.number}`.includes(query)
      )
    }

    return filtered
  }, [pullRequests, prFilter, selectedAccount, searchQuery])

  if (!isAvailable) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        GH CLI not available
      </div>
    )
  }

  if (!selectedAccount) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Select a GitHub account
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          {(['all', 'created', 'review-requested'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPrFilter(filter)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                prFilter === filter
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'created' ? 'Mine' : 'Review'}
            </button>
          ))}
        </div>

        <button
          onClick={() => repoPath && refreshPullRequests(repoPath)}
          disabled={prLoading}
          className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${prLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <svg className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, branch, author..."
            className="w-full pl-7 pr-7 py-1 text-xs bg-muted/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {prLoading && pullRequests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Loading...
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <GitPullRequest className="w-8 h-8 text-muted" />
            No pull requests
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery
              ? `No PRs match "${searchQuery}"`
              : prFilter === 'created'
                ? 'No PRs created by you'
                : prFilter === 'review-requested'
                  ? 'No PRs awaiting your review'
                  : 'No pull requests'}
          </div>
        ) : (
          filteredPRs.map((pr) => (
            <PullRequestItem key={pr.number} pr={pr} />
          ))
        )}
      </div>
    </div>
  )
}
