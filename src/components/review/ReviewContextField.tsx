import { FileText, Hash, Loader } from 'lucide-react'
import { useState } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'

interface Issue {
  number: number
  title: string
  body: string
}

interface ReviewContextFieldProps {
  onContextChange: (context: { type: 'issue' | 'manual'; issue?: Issue; text?: string } | null) => void
}

export function ReviewContextField({ onContextChange }: ReviewContextFieldProps) {
  const [mode, setMode] = useState<'issue' | 'manual'>('manual')
  const [issueNumber, setIssueNumber] = useState('')
  const [manualText, setManualText] = useState('')
  const [loadedIssue, setLoadedIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isAvailable, selectedAccount } = useGitHubStore()
  const { repoName } = useRepositoryStore()

  const handleIssueBlur = async () => {
    if (!issueNumber || !isAvailable || !selectedAccount || !repoName) return

    const num = parseInt(issueNumber, 10)
    if (isNaN(num)) return

    setLoading(true)
    setError(null)

    try {
      const issue = await window.electron.github.issue.get({
        repo: repoName,
        number: num
      })

      if (issue) {
        setLoadedIssue(issue)
        onContextChange({ type: 'issue', issue })
      } else {
        setError('Issue not found')
        setLoadedIssue(null)
        onContextChange(null)
      }
    } catch {
      setError('Failed to load issue')
      setLoadedIssue(null)
      onContextChange(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManualChange = (text: string) => {
    setManualText(text)
    if (text.trim()) {
      onContextChange({ type: 'manual', text })
    } else {
      onContextChange(null)
    }
  }

  const handleModeChange = (newMode: 'issue' | 'manual') => {
    setMode(newMode)
    setLoadedIssue(null)
    setError(null)
    onContextChange(null)
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
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">#</span>
            <input
              type="number"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              onBlur={handleIssueBlur}
              placeholder="Issue number"
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-muted-foreground"
            />
            {loading && <Loader className="w-4 h-4 text-muted-foreground animate-spin" />}
          </div>
          {loadedIssue && (
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <span className="text-foreground">{loadedIssue.title}</span>
            </div>
          )}
          {error && (
            <div className="mt-1 text-xs text-destructive">{error}</div>
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
    </div>
  )
}
