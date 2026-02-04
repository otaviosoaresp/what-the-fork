import { RefreshCw, GitPullRequest } from 'lucide-react'
import { useEffect } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'
import { PullRequestItem } from './PullRequestItem'

export function PullRequestsTab() {
  const { repoName } = useRepositoryStore()
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

  useEffect(() => {
    if (isAvailable && selectedAccount && repoName) {
      loadPullRequests(repoName)
    }
  }, [isAvailable, selectedAccount, repoName, prFilter, loadPullRequests])

  if (!isAvailable) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        GH CLI not available
      </div>
    )
  }

  if (!selectedAccount) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        Select a GitHub account
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex gap-1">
          {(['all', 'created', 'review-requested'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPrFilter(filter)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                prFilter === filter
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'created' ? 'Mine' : 'Review'}
            </button>
          ))}
        </div>

        <button
          onClick={() => repoName && refreshPullRequests(repoName)}
          disabled={prLoading}
          className="p-1 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${prLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {prLoading && pullRequests.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            Loading...
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
            <GitPullRequest className="w-8 h-8 text-zinc-600" />
            No pull requests
          </div>
        ) : (
          pullRequests.map((pr) => (
            <PullRequestItem key={pr.number} pr={pr} />
          ))
        )}
      </div>
    </div>
  )
}
