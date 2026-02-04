import { spawn } from 'child_process'
import { PullRequest } from '../types'

const PR_FIELDS = [
  'number',
  'title',
  'author',
  'state',
  'isDraft',
  'createdAt',
  'updatedAt',
  'headRefName',
  'baseRefName',
  'reviewDecision',
  'reviews',
  'statusCheckRollup',
  'labels',
  'milestone',
  'comments',
  'mergeable',
  'url'
].join(',')

export async function listPullRequests(options: {
  repo: string
  type: 'created' | 'review-requested' | 'all'
}): Promise<PullRequest[]> {
  const { repo, type } = options

  const args = ['pr', 'list', '--repo', repo, '--limit', '100']

  if (type === 'created') {
    args.push('--author', '@me')
  } else if (type === 'review-requested') {
    args.push('--search', 'review-requested:@me')
  }

  args.push('--json', PR_FIELDS)

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout) as Array<Record<string, unknown>>
          resolve(data.map(parsePullRequest))
        } catch {
          reject(new Error('Failed to parse PR list'))
        }
      } else {
        reject(new Error(stderr || 'Failed to list PRs'))
      }
    })

    proc.on('error', reject)
  })
}

export async function getPullRequestForBranch(options: {
  repo: string
  branch: string
}): Promise<PullRequest | null> {
  const { repo, branch } = options

  const args = ['pr', 'list', '--repo', repo, '--head', branch, '--json', PR_FIELDS]

  return new Promise((resolve) => {
    const proc = spawn('gh', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        try {
          const data = JSON.parse(stdout) as Array<Record<string, unknown>>
          if (data.length > 0) {
            resolve(parsePullRequest(data[0]))
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })

    proc.on('error', () => {
      resolve(null)
    })
  })
}

function parsePullRequest(data: Record<string, unknown>): PullRequest {
  const reviews = (data.reviews as Array<{ state: string }>) || []
  const approved = reviews.filter(r => r.state === 'APPROVED').length
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length

  const statusCheck = data.statusCheckRollup as Array<{ state: string }> | null
  let checksStatus: PullRequest['checksStatus'] = null
  if (statusCheck && statusCheck.length > 0) {
    const states = statusCheck.map(s => s.state)
    if (states.every(s => s === 'SUCCESS')) {
      checksStatus = 'success'
    } else if (states.some(s => s === 'FAILURE')) {
      checksStatus = 'failure'
    } else if (states.some(s => s === 'PENDING')) {
      checksStatus = 'pending'
    } else {
      checksStatus = 'neutral'
    }
  }

  const labels = (data.labels as Array<{ name: string }>) || []
  const milestone = data.milestone as { title: string } | null
  const comments = (data.comments as Array<unknown>) || []
  const author = data.author as { login: string }

  return {
    number: data.number as number,
    title: data.title as string,
    author: author?.login || 'unknown',
    state: (data.state as string).toLowerCase() as PullRequest['state'],
    isDraft: data.isDraft as boolean,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    headBranch: data.headRefName as string,
    baseBranch: data.baseRefName as string,
    reviewStatus: {
      approved,
      changesRequested,
      pending: []
    },
    checksStatus,
    labels: labels.map(l => l.name),
    milestone: milestone?.title || null,
    commentsCount: comments.length,
    mergeable: data.mergeable as boolean | null,
    url: data.url as string
  }
}
