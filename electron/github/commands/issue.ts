import { spawn } from 'child_process'
import { Issue } from '../types'

const ISSUE_FIELDS = [
  'number',
  'title',
  'body',
  'state',
  'author',
  'labels',
  'url'
].join(',')

export async function getIssue(options: {
  repo: string
  number: number
}): Promise<Issue | null> {
  const { repo, number } = options

  const args = ['issue', 'view', String(number), '--repo', repo, '--json', ISSUE_FIELDS]

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
          const data = JSON.parse(stdout) as Record<string, unknown>
          resolve(parseIssue(data))
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

function parseIssue(data: Record<string, unknown>): Issue {
  const author = data.author as { login: string }
  const labels = (data.labels as Array<{ name: string }>) || []

  return {
    number: data.number as number,
    title: data.title as string,
    body: (data.body as string) || '',
    state: (data.state as string).toLowerCase() as Issue['state'],
    author: author?.login || 'unknown',
    labels: labels.map(l => l.name),
    url: data.url as string
  }
}
