import { useState, useEffect } from 'react'
import { useRepositoryStore } from '@/stores/repository'
import { Sparkles } from 'lucide-react'

export function CommitForm() {
  const [message, setMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { commit, status, repoPath } = useRepositoryStore()

  const stagedCount = status.filter(f => f.staged).length

  useEffect(() => {
    window.electron.ai.getConfig().then(config => {
      setAiConfigured(config.apiKeyConfigured)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || stagedCount === 0) return

    setIsCommitting(true)
    setError(null)
    try {
      await commit(message.trim())
      setMessage('')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleGenerateMessage = async () => {
    if (!repoPath || stagedCount === 0) return

    setIsGenerating(true)
    setError(null)
    try {
      const result = await window.electron.ai.generateCommitMessage(repoPath)
      setMessage(result.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate message')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 pt-2">
      <div className="relative">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Commit message"
          className="input w-full h-20 resize-none text-sm pr-10"
          disabled={stagedCount === 0}
        />
        {aiConfigured && (
          <button
            type="button"
            onClick={handleGenerateMessage}
            disabled={stagedCount === 0 || isGenerating}
            className="absolute top-2 right-2 p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate commit message with AI"
          >
            <Sparkles
              size={16}
              className={isGenerating ? 'animate-pulse text-yellow-400' : 'text-slate-400 hover:text-yellow-400'}
            />
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
      <button
        type="submit"
        disabled={!message.trim() || stagedCount === 0 || isCommitting}
        className="btn btn-primary w-full mt-2 text-sm"
      >
        {isCommitting ? 'Committing...' : `Commit (${stagedCount})`}
      </button>
    </form>
  )
}
