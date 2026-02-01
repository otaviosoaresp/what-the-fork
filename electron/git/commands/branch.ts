import { executeGit } from '../executor'
import { parseBranches } from '../parser'
import type { Branch } from '../types'

export async function listBranches(repoPath: string): Promise<Branch[]> {
  const format = '%(refname)|%(HEAD)|%(committerdate:iso-strict)|%(upstream:track)'
  const result = await executeGit(repoPath, [
    'for-each-ref',
    '--sort=-committerdate',
    `--format=${format}`,
    'refs/heads',
    'refs/remotes'
  ])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseBranchesWithDate(result.stdout)
}

function parseBranchesWithDate(output: string): Branch[] {
  if (!output.trim()) return []

  return output.split('\n').filter(Boolean).map(line => {
    const [refname, head, date, trackStatus] = line.split('|')
    const current = head === '*'
    const remote = refname.startsWith('refs/remotes/')
    const name = remote
      ? refname.replace('refs/remotes/', '')
      : refname.replace('refs/heads/', '')
    const gone = trackStatus?.includes('gone') ?? false

    return {
      name,
      current,
      remote,
      lastCommitDate: date || undefined,
      gone
    }
  }).filter(b => b.name && !b.name.includes('HEAD'))
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const result = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return result.stdout
}

export async function checkoutBranch(repoPath: string, branchName: string): Promise<void> {
  const result = await executeGit(repoPath, ['checkout', branchName])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
  const args = ['checkout', '-b', branchName]
  if (startPoint) args.push(startPoint)
  const result = await executeGit(repoPath, args)
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function deleteBranch(repoPath: string, branchName: string, force: boolean = false): Promise<void> {
  const flag = force ? '-D' : '-d'
  const result = await executeGit(repoPath, ['branch', flag, branchName])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}
