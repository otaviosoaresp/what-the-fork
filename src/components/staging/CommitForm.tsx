import { useState } from 'react'
import { useRepositoryStore } from '@/stores/repository'

export function CommitForm(): JSX.Element {
  const [message, setMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const { commit, status } = useRepositoryStore()

  const stagedCount = status.filter(f => f.staged).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || stagedCount === 0) return

    setIsCommitting(true)
    try {
      await commit(message.trim())
      setMessage('')
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 pt-2">
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Commit message"
        className="input w-full h-20 resize-none text-sm"
        disabled={stagedCount === 0}
      />
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
