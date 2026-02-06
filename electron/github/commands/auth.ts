import { spawn } from 'child_process'
import { GitHubAccount } from '../types'

export async function listAccounts(): Promise<GitHubAccount[]> {
  return new Promise((resolve) => {
    const proc = spawn('gh', ['auth', 'status'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let output = ''

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.on('close', () => {
      const accounts = parseAuthStatus(output)
      resolve(accounts)
    })

    proc.on('error', () => {
      resolve([])
    })
  })
}

function parseAuthStatus(output: string): GitHubAccount[] {
  const accounts: GitHubAccount[] = []
  const lines = output.split('\n')

  let currentAccount: string | null = null

  for (const line of lines) {
    const accountMatch = line.match(/Logged in to .+ account (\S+)/)
    if (accountMatch) {
      currentAccount = accountMatch[1]
    }

    if (currentAccount && line.includes('Active account:')) {
      const isActive = line.includes('true')
      accounts.push({
        username: currentAccount,
        isActive
      })
      currentAccount = null
    }
  }

  return accounts
}

export async function switchAccount(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['auth', 'switch', '--user', username], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderr = ''

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr || `Failed to switch account to ${username}`))
      }
    })

    proc.on('error', reject)
  })
}
