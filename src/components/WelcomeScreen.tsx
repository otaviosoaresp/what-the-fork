import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'

export function WelcomeScreen() {
  const { loadRepository, isLoading, error } = useRepositoryStore()
  const { recentRepositories, addRecentRepository } = useUIStore()

  const handleOpenRepo = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      await loadRepository(path)
      addRecentRepository(path)
    }
  }

  const handleOpenRecent = async (path: string) => {
    await loadRepository(path)
    addRecentRepository(path)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <h1 className="text-2xl font-semibold mb-2">Git Branch Viewer</h1>
          <p className="text-muted-foreground text-sm">View diffs and manage your git repositories</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleOpenRepo}
          disabled={isLoading}
          className="btn btn-primary w-full mb-6"
        >
          {isLoading ? 'Opening...' : 'Open Repository'}
        </button>

        {recentRepositories.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Recent Repositories
            </h2>
            <div className="space-y-1">
              {recentRepositories.map(path => (
                <button
                  key={path}
                  onClick={() => handleOpenRecent(path)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors truncate"
                >
                  {path}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Or drag and drop a folder here
        </p>
      </div>
    </div>
  )
}
