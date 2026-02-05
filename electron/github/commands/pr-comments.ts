import { spawn } from 'child_process'
import { PRComment } from '../types'

export async function getPRComments(options: {
  repoPath: string
  prNumber: number
}): Promise<PRComment[]> {
  const { repoPath, prNumber } = options

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', [
      'api',
      `repos/{owner}/{repo}/pulls/${prNumber}/comments`,
      '--jq', '.[] | {id, path, line, original_line, side, body, user: .user.login, created_at, in_reply_to_id}'
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
          const lines = stdout.trim().split('\n').filter(Boolean)
          const comments = lines.map(line => {
            const data = JSON.parse(line)
            return {
              id: data.id,
              path: data.path,
              line: data.line,
              originalLine: data.original_line,
              side: data.side || 'RIGHT',
              body: data.body,
              author: data.user,
              createdAt: data.created_at,
              inReplyToId: data.in_reply_to_id || null
            } as PRComment
          })
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
