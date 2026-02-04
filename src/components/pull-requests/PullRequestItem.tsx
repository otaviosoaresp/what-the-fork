import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'

interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  reviewStatus: {
    approved: number
    changesRequested: number
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  commentsCount: number
  mergeable: boolean | null
  url: string
  headBranch: string
  baseBranch: string
}

interface PullRequestItemProps {
  pr: PullRequest
}

export function PullRequestItem({ pr }: PullRequestItemProps) {
  const handleClick = () => {
    window.electron.github.openUrl(pr.url)
  }

  const getStateColor = (): string => {
    if (pr.isDraft) return 'text-zinc-500'
    switch (pr.state) {
      case 'open':
        return 'text-green-500'
      case 'merged':
        return 'text-purple-500'
      case 'closed':
        return 'text-red-500'
      default:
        return 'text-zinc-400'
    }
  }

  const getChecksIcon = (): React.ReactNode => {
    switch (pr.checksStatus) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'failure':
        return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-yellow-500" />
      default:
        return null
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      onClick={handleClick}
      className="px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
    >
      <div className="flex items-start gap-2">
        <GitPullRequest className={`w-4 h-4 mt-0.5 ${getStateColor()}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-200 font-medium truncate">{pr.title}</span>
            <ExternalLink className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <span>#{pr.number}</span>
            <span>{pr.author}</span>
            <span>{formatDate(pr.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            {getChecksIcon()}

            {pr.reviewStatus.approved > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-500">
                <CheckCircle className="w-3 h-3" />
                {pr.reviewStatus.approved}
              </span>
            )}

            {pr.reviewStatus.changesRequested > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <XCircle className="w-3 h-3" />
                {pr.reviewStatus.changesRequested}
              </span>
            )}

            {pr.mergeable === false && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                <AlertTriangle className="w-3 h-3" />
                conflicts
              </span>
            )}

            {pr.commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                <MessageSquare className="w-3 h-3" />
                {pr.commentsCount}
              </span>
            )}

            {pr.labels.slice(0, 2).map((label) => (
              <span
                key={label}
                className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
