import { spawn } from 'child_process'
import { PRComment } from '../types'

interface GraphQLResponse {
  data: {
    repository: {
      pullRequest: {
        reviewThreads: {
          nodes: Array<{
            id: string
            isResolved: boolean
            isOutdated: boolean
            line: number | null
            originalLine: number | null
            path: string
            comments: {
              nodes: Array<{
                id: string
                body: string
                author: { login: string } | null
                createdAt: string
              }>
            }
          }>
        }
      }
    }
  }
}

const GRAPHQL_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          line
          originalLine
          path
          comments(first: 50) {
            nodes {
              id
              body
              author {
                login
              }
              createdAt
            }
          }
        }
      }
    }
  }
}
`

async function getRepoInfo(repoPath: string): Promise<{ owner: string; repo: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['repo', 'view', '--json', 'owner,name'], {
      cwd: repoPath,
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
          const data = JSON.parse(stdout)
          resolve({ owner: data.owner.login, repo: data.name })
        } catch {
          reject(new Error('Failed to parse repo info'))
        }
      } else {
        reject(new Error(stderr || 'Failed to get repo info'))
      }
    })

    proc.on('error', reject)
  })
}

export async function getPRComments(options: {
  repoPath: string
  prNumber: number
}): Promise<PRComment[]> {
  const { repoPath, prNumber } = options

  const { owner, repo } = await getRepoInfo(repoPath)

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', [
      'api', 'graphql',
      '-f', `query=${GRAPHQL_QUERY}`,
      '-F', `owner=${owner}`,
      '-F', `repo=${repo}`,
      '-F', `number=${prNumber}`
    ], {
      cwd: repoPath,
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
          const response: GraphQLResponse = JSON.parse(stdout)
          const threads = response.data.repository.pullRequest.reviewThreads.nodes
          const comments: PRComment[] = []

          for (const thread of threads) {
            const threadComments = thread.comments.nodes
            threadComments.forEach((comment, index) => {
              comments.push({
                id: parseInt(comment.id.replace(/\D/g, '')) || Date.now() + index,
                path: thread.path,
                line: thread.line,
                originalLine: thread.originalLine,
                side: 'RIGHT',
                body: comment.body,
                author: comment.author?.login || 'unknown',
                createdAt: comment.createdAt,
                inReplyToId: index > 0 ? comments[comments.length - 1]?.id || null : null,
                isResolved: thread.isResolved,
                isOutdated: thread.isOutdated,
                threadId: thread.id
              })
            })
          }

          resolve(comments)
        } catch {
          resolve([])
        }
      } else {
        reject(new Error(stderr || 'Failed to fetch PR comments'))
      }
    })

    proc.on('error', reject)
  })
}
