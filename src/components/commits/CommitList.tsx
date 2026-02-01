import { useEffect, useState } from 'react'
import { useRepositoryStore } from '@/stores/repository'
import { CommitItem } from './CommitItem'
import type { Commit } from '../../../electron/git/types'

export function CommitList(): JSX.Element {
  const { repoPath } = useRepositoryStore()
  const [commits, setCommits] = useState<Commit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!repoPath) return

    const loadCommits = async () => {
      setIsLoading(true)
      try {
        const data = await window.electron.git.log(repoPath, 50)
        setCommits(data)
      } finally {
        setIsLoading(false)
      }
    }

    loadCommits()
  }, [repoPath])

  if (isLoading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
  }

  if (commits.length === 0) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">No commits</div>
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {commits.map(commit => (
        <CommitItem key={commit.hash} commit={commit} />
      ))}
    </div>
  )
}
