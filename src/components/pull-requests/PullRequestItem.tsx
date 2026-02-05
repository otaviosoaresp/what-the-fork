import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
  GitCompare,
  User,
  Tag
} from 'lucide-react'
import { useDiffStore } from '../../stores/diff'

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
    pending: string[]
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
  const { compareBranches } = useDiffStore()

  const handleClick = () => {
    window.electron.github.openUrl(pr.url)
  }

  const handleViewDiff = (e: React.MouseEvent) => {
    e.stopPropagation()
    compareBranches(pr.baseBranch, pr.headBranch)
  }

  const getStateColor = (): string => {
    if (pr.isDraft) return 'text-muted-foreground'
    switch (pr.state) {
      case 'open':
        return 'text-green-500'
      case 'merged':
        return 'text-purple-500'
      case 'closed':
        return 'text-red-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getChecksIcon = (): React.ReactNode => {
    switch (pr.checksStatus) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-500" />
      case 'failure':
        return <XCircle className="w-3 h-3 text-red-500" />
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-500" />
      default:
        return null
    }
  }

  const getReviewerInitials = (username: string): string => {
    return username.slice(0, 2).toUpperCase()
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
      className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
    >
      <div className="flex items-start gap-2">
        <GitPullRequest className={`w-4 h-4 mt-0.5 ${getStateColor()}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground font-medium truncate">{pr.title}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>#{pr.number}</span>
            <span>{pr.author}</span>
            <span>{formatDate(pr.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <button
              onClick={handleViewDiff}
              className="flex items-center gap-1 px-1.5 py-0.5 bg-muted hover:bg-muted/80 border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
              title={`View diff: ${pr.baseBranch} ← ${pr.headBranch}`}
            >
              <GitCompare className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{pr.headBranch}</span>
            </button>
            <span className="text-muted">→</span>
            <span className="text-muted-foreground truncate max-w-[60px]">{pr.baseBranch}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {getChecksIcon()}

            {pr.reviewStatus.approved > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-500" title={`${pr.reviewStatus.approved} approval(s)`}>
                <CheckCircle className="w-3 h-3" />
                {pr.reviewStatus.approved}
              </span>
            )}

            {pr.reviewStatus.changesRequested > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-500" title={`${pr.reviewStatus.changesRequested} change request(s)`}>
                <XCircle className="w-3 h-3" />
                {pr.reviewStatus.changesRequested}
              </span>
            )}

            {pr.mergeable === false && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-500" title="Has merge conflicts">
                <AlertTriangle className="w-3 h-3" />
                conflicts
              </span>
            )}

            {pr.commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground" title={`${pr.commentsCount} comment(s)`}>
                <MessageSquare className="w-3 h-3" />
                {pr.commentsCount}
              </span>
            )}
          </div>

          {pr.reviewStatus.pending.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <div className="flex items-center gap-1">
                {[...new Set(pr.reviewStatus.pending)].slice(0, 3).map((reviewer, idx) => (
                  <span
                    key={`${reviewer}-${idx}`}
                    className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium bg-muted border border-border rounded-full text-muted-foreground"
                    title={`Review requested: ${reviewer}`}
                  >
                    {getReviewerInitials(reviewer)}
                  </span>
                ))}
                {pr.reviewStatus.pending.length > 3 && (
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium bg-muted border border-border rounded-full text-muted-foreground"
                    title={`${pr.reviewStatus.pending.length - 3} more reviewer(s): ${pr.reviewStatus.pending.slice(3).join(', ')}`}
                  >
                    +{pr.reviewStatus.pending.length - 3}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">awaiting review</span>
            </div>
          )}

          {pr.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Tag className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              {pr.labels.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className="text-[10px] px-1.5 py-0.5 bg-muted border border-border rounded-full text-muted-foreground"
                  title={label}
                >
                  {label}
                </span>
              ))}
              {pr.labels.length > 3 && (
                <span
                  className="text-[10px] px-1.5 py-0.5 text-muted-foreground"
                  title={pr.labels.slice(3).join(', ')}
                >
                  +{pr.labels.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
