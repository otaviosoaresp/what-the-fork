import { useState } from 'react'
import { useRepositoryStore } from '@/stores/repository'
import { useBranchesStore } from '@/stores/branches'
import { useUIStore } from '@/stores/ui'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/utils'

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { repoName, remoteStatus, repoPath } = useRepositoryStore()
  const addToast = useToastStore((s) => s.addToast)
  const { diffViewMode, setDiffViewMode } = useUIStore()

  const handleFetch = async () => {
    if (!repoPath) return
    try {
      await window.electron.git.fetch(repoPath)
      await useRepositoryStore.getState().refreshRemoteStatus()
      addToast('Fetch completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Fetch failed', 'error')
    }
  }

  const handlePull = async () => {
    if (!repoPath) return
    try {
      await window.electron.git.pull(repoPath)
      await useRepositoryStore.getState().refreshStatus()
      await useRepositoryStore.getState().refreshRemoteStatus()
      addToast('Pull completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Pull failed', 'error')
    }
  }

  const handlePush = async () => {
    if (!repoPath) return
    try {
      await window.electron.git.push(repoPath)
      await useRepositoryStore.getState().refreshRemoteStatus()
      addToast('Push completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Push failed', 'error')
    }
  }

  const handleOpenRepo = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      await useRepositoryStore.getState().loadRepository(path)
    }
  }

  const handleRefresh = async () => {
    if (!repoPath || isRefreshing) return
    setIsRefreshing(true)
    try {
      await Promise.all([
        useRepositoryStore.getState().refreshStatus(),
        useRepositoryStore.getState().refreshRemoteStatus(),
        useBranchesStore.getState().loadBranches()
      ])
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <span className="font-semibold text-sm">{repoName}</span>
        </div>
        {(remoteStatus.ahead > 0 || remoteStatus.behind > 0) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {remoteStatus.ahead > 0 && <span className="text-success">{remoteStatus.ahead}</span>}
            {remoteStatus.behind > 0 && <span className="text-warning">{remoteStatus.behind}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setDiffViewMode('split')}
            className={cn(
              'px-3 py-1.5 text-xs transition-colors',
              diffViewMode === 'split' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Split
          </button>
          <button
            onClick={() => setDiffViewMode('unified')}
            className={cn(
              'px-3 py-1.5 text-xs transition-colors',
              diffViewMode === 'unified' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Unified
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn btn-ghost btn-icon"
          title="Refresh"
        >
          <svg
            className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 11-9-9" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleFetch} className="btn btn-ghost btn-icon" title="Fetch">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        </button>
        <button onClick={handlePull} className="btn btn-ghost btn-icon" title="Pull">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
        <button onClick={handlePush} className="btn btn-ghost btn-icon" title="Push">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleOpenRepo} className="btn btn-ghost btn-icon" title="Open Repository">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
