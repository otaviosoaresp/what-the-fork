import { Github, User, X } from 'lucide-react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'

export function AccountSelectionModal() {
  const { accounts, selectAccount, setNeedsAccountSelection, needsAccountSelection } = useGitHubStore()
  const { repoName } = useRepositoryStore()

  if (!needsAccountSelection) {
    return null
  }

  const handleSelect = async (username: string) => {
    await selectAccount(username)
    const repoKey = repoName || 'default'
    await window.electron.github.accounts.setForRepo(repoKey, username)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-96 max-w-[90vw]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Select GitHub Account</h2>
          </div>
          <button
            onClick={() => setNeedsAccountSelection(false)}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-zinc-400 mb-4">
            Select the GitHub account to use for <span className="text-zinc-200">{repoName}</span>
          </p>

          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.username}
                onClick={() => handleSelect(account.username)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-700 rounded-md transition-colors"
              >
                <User className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-200">{account.username}</span>
                {account.isActive && (
                  <span className="ml-auto text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                    active in CLI
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
