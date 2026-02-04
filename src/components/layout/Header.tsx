import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRepositoryStore } from '@/stores/repository'
import { useBranchesStore } from '@/stores/branches'
import { useUIStore } from '@/stores/ui'
import { useToastStore } from '@/stores/toast'
import { useReviewStore } from '@/stores/review'
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { AccountSelector } from '@/components/header/AccountSelector'
import { Settings, MessageSquare, Loader2 } from 'lucide-react'
import { parseStructuredReview } from '@/lib/review-parser'

export function Header() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showRepoMenu, setShowRepoMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isReviewing, setIsReviewing] = useState(false)
  const repoButtonRef = useRef<HTMLButtonElement>(null)
  const { repoName, remoteStatus, repoPath, loadRepository } = useRepositoryStore()
  const addToast = useToastStore((s) => s.addToast)
  const { diffViewMode, setDiffViewMode, recentRepositories, addRecentRepository } = useUIStore()
  const { files, baseBranch, compareBranch, mode } = useDiffStore()
  const { isOpen, setLoading, setStructuredContent, setError, openPanel, reviewContext } = useReviewStore()

  const otherRepos = recentRepositories.filter(p => p !== repoPath)

  useEffect(() => {
    if (showRepoMenu && repoButtonRef.current) {
      const rect = repoButtonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 4, left: rect.left })
    }
  }, [showRepoMenu])

  const handleFetch = async () => {
    if (!repoPath || isFetching) return
    setIsFetching(true)
    try {
      await window.electron.git.fetch(repoPath)
      await useRepositoryStore.getState().refreshRemoteStatus()
      await useBranchesStore.getState().loadBranches()
      addToast('Fetch completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Fetch failed', 'error')
    } finally {
      setIsFetching(false)
    }
  }

  const handlePull = async () => {
    if (!repoPath || isPulling) return
    setIsPulling(true)
    try {
      await window.electron.git.pull(repoPath)
      await useRepositoryStore.getState().refreshStatus()
      await useRepositoryStore.getState().refreshRemoteStatus()
      await useBranchesStore.getState().loadBranches()
      addToast('Pull completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Pull failed', 'error')
    } finally {
      setIsPulling(false)
    }
  }

  const handlePush = async () => {
    if (!repoPath || isPushing) return
    setIsPushing(true)
    try {
      await window.electron.git.push(repoPath)
      await useRepositoryStore.getState().refreshRemoteStatus()
      addToast('Push completed', 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Push failed', 'error')
    } finally {
      setIsPushing(false)
    }
  }

  const handleOpenRepo = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      await loadRepository(path)
      addRecentRepository(path)
    }
    setShowRepoMenu(false)
  }

  const handleSwitchRepo = async (path: string) => {
    await loadRepository(path)
    addRecentRepository(path)
    setShowRepoMenu(false)
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

  const canReview = mode === 'branches' && baseBranch && compareBranch && files.length > 0

  const handleReview = async () => {
    if (!repoPath || !baseBranch || !compareBranch || isReviewing) return
    setIsReviewing(true)
    openPanel()
    setLoading(true)
    try {
      const result = await window.electron.review.reviewBranch(repoPath, baseBranch, compareBranch, false, reviewContext)
      if (result.structured) {
        setStructuredContent(
          result.structured.summary,
          result.structured.comments,
          result.structured.generalNotes,
          result.provider
        )
      } else {
        // Fallback to parsing if structured not available
        const structured = parseStructuredReview(result.content)
        setStructuredContent(structured.summary, structured.comments, structured.generalNotes, result.provider)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <button
          ref={repoButtonRef}
          onClick={() => setShowRepoMenu(!showRepoMenu)}
          className="flex items-center gap-2 px-2 py-1 -mx-2 rounded hover:bg-muted transition-colors"
        >
          <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <span className="font-semibold text-sm">{repoName}</span>
          <svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showRepoMenu && createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowRepoMenu(false)} />
            <div
              className="fixed w-72 border border-border rounded-lg shadow-lg z-50 py-1"
              style={{ top: menuPosition.top, left: menuPosition.left, backgroundColor: '#0f172a' }}
            >
              {otherRepos.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase">
                    Recent
                  </div>
                  {otherRepos.map(path => {
                    const name = path.split('/').pop() ?? path
                    return (
                      <button
                        key={path}
                        onClick={() => handleSwitchRepo(path)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground truncate">{path}</div>
                      </button>
                    )
                  })}
                  <div className="border-t border-border my-1" />
                </>
              )}
              <button
                onClick={handleOpenRepo}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Open Repository...
              </button>
            </div>
          </>,
          document.body
        )}

        <AccountSelector />
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

        <button onClick={handleFetch} disabled={isFetching} className="btn btn-ghost btn-icon" title="Fetch">
          {isFetching ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
          )}
        </button>
        <button
          onClick={handlePull}
          disabled={isPulling}
          className="btn btn-ghost btn-icon relative"
          title={remoteStatus.behind > 0 ? `Pull (${remoteStatus.behind} behind)` : 'Pull'}
        >
          {isPulling ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          )}
          {!isPulling && remoteStatus.behind > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-warning text-background text-[10px] font-medium rounded-full flex items-center justify-center font-mono">
              {remoteStatus.behind}
            </span>
          )}
        </button>
        <button
          onClick={handlePush}
          disabled={isPushing}
          className="btn btn-ghost btn-icon relative"
          title={remoteStatus.ahead > 0 ? `Push (${remoteStatus.ahead} ahead)` : 'Push'}
        >
          {isPushing ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          )}
          {!isPushing && remoteStatus.ahead > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-success text-background text-[10px] font-medium rounded-full flex items-center justify-center font-mono">
              {remoteStatus.ahead}
            </span>
          )}
        </button>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleOpenRepo} className="btn btn-ghost btn-icon" title="Open Repository">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
        <button
          onClick={handleReview}
          disabled={isReviewing || !canReview}
          className={cn('btn btn-ghost btn-icon', isOpen && 'bg-muted')}
          title={canReview ? `Review ${baseBranch} vs ${compareBranch}` : 'Select branches to review'}
        >
          {isReviewing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <MessageSquare size={16} />
          )}
        </button>
        <button onClick={() => setShowSettings(true)} className="btn btn-ghost btn-icon" title="Settings">
          <Settings size={16} />
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </header>
  )
}
