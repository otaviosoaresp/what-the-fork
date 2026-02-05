import { FileText, Hash, Loader, FolderGit2, Eye, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'
import { useReviewStore } from '../../stores/review'
import { MarkdownContent } from '../shared/MarkdownContent'

interface Issue {
  number: number
  title: string
  body: string
}

interface ReviewContextFieldProps {
  onContextChange: (context: { type: 'issue' | 'manual'; issue?: Issue; text?: string } | null) => void
}

export function ReviewContextField({ onContextChange }: ReviewContextFieldProps) {
  const { isAvailable, selectedAccount } = useGitHubStore()
  const { repoPath } = useRepositoryStore()
  const { reviewContext, setReviewContext } = useReviewStore()

  const [mode, setMode] = useState<'issue' | 'manual'>(reviewContext?.type ?? 'manual')
  const [issueNumber, setIssueNumber] = useState(reviewContext?.issue?.number?.toString() ?? '')
  const [issueRepo, setIssueRepo] = useState(reviewContext?.issueRepo ?? '')
  const [manualText, setManualText] = useState(reviewContext?.text ?? '')
  const [loadedIssue, setLoadedIssue] = useState<Issue | null>(reviewContext?.issue ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showIssueModal, setShowIssueModal] = useState(false)

  useEffect(() => {
    if (reviewContext) {
      setMode(reviewContext.type)
      if (reviewContext.type === 'issue' && reviewContext.issue) {
        setIssueNumber(reviewContext.issue.number.toString())
        setLoadedIssue(reviewContext.issue)
        setIssueRepo(reviewContext.issueRepo ?? '')
      } else if (reviewContext.type === 'manual' && reviewContext.text) {
        setManualText(reviewContext.text)
      }
    }
  }, [])

  const handleIssueLoad = async () => {
    if (!issueNumber || !isAvailable || !selectedAccount || !repoPath) return

    const num = parseInt(issueNumber, 10)
    if (isNaN(num)) return

    setLoading(true)
    setError(null)

    try {
      const issue = await window.electron.github.issue.get({
        repoPath,
        number: num,
        repo: issueRepo.trim() || undefined
      })

      if (issue) {
        setLoadedIssue(issue)
        const context = { type: 'issue' as const, issue, issueRepo: issueRepo.trim() || undefined }
        setReviewContext(context)
        onContextChange({ type: 'issue', issue })
      } else {
        setError('Issue not found')
        setLoadedIssue(null)
        setReviewContext(null)
        onContextChange(null)
      }
    } catch {
      setError('Failed to load issue')
      setLoadedIssue(null)
      setReviewContext(null)
      onContextChange(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManualChange = (text: string) => {
    setManualText(text)
    if (text.trim()) {
      const context = { type: 'manual' as const, text }
      setReviewContext(context)
      onContextChange({ type: 'manual', text })
    } else {
      setReviewContext(null)
      onContextChange(null)
    }
  }

  const handleModeChange = (newMode: 'issue' | 'manual') => {
    setMode(newMode)
    setError(null)
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Task Context</span>
        <div className="flex gap-1">
          {isAvailable && selectedAccount && (
            <button
              onClick={() => handleModeChange('issue')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                mode === 'issue' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Hash className="w-3 h-3 inline mr-1" />
              Issue
            </button>
          )}
          <button
            onClick={() => handleModeChange('manual')}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              mode === 'manual' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3 h-3 inline mr-1" />
            Text
          </button>
        </div>
      </div>

      {mode === 'issue' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={issueRepo}
              onChange={(e) => setIssueRepo(e.target.value)}
              placeholder="owner/repo (optional, for cross-repo)"
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">#</span>
            <input
              type="number"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              placeholder="Issue number"
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-muted-foreground"
            />
            <button
              onClick={handleIssueLoad}
              disabled={loading || !issueNumber}
              className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader className="w-3 h-3 animate-spin" /> : 'Load'}
            </button>
          </div>
          {loadedIssue && (
            <div className="p-2 bg-muted rounded text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  {issueRepo && <span>{issueRepo}</span>}
                  <span>#{loadedIssue.number}</span>
                </div>
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded transition-colors"
                  title="Ver detalhes da issue"
                >
                  <Eye className="w-3 h-3" />
                  <span>Ver</span>
                </button>
              </div>
              <span className="text-foreground">{loadedIssue.title}</span>
            </div>
          )}
          {error && (
            <div className="text-xs text-destructive">{error}</div>
          )}
        </div>
      ) : (
        <textarea
          value={manualText}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="Paste requirements, ticket description, or context..."
          className="w-full h-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground resize-none focus:outline-none focus:border-muted-foreground"
        />
      )}

      {showIssueModal && loadedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-[600px] max-w-[90vw] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Hash className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-400">
                  {issueRepo && `${issueRepo} `}#{loadedIssue.number}
                </span>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1 hover:bg-zinc-700 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
              <h2 className="text-lg font-semibold text-zinc-100">{loadedIssue.title}</h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {loadedIssue.body ? (
                <MarkdownContent content={loadedIssue.body} />
              ) : (
                <p className="text-sm text-zinc-500 italic">Sem descricao</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
