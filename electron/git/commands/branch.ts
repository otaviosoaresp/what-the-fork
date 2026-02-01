import { executeGit } from '../executor'
import { parseBranches } from '../parser'
import type { Branch } from '../types'

export async function listBranches(repoPath: string): Promise<Branch[]> {
  const format = '%(refname:short)|%(HEAD)|%(committerdate:iso-strict)'
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
    const [name, head, date] = line.split('|')
    const current = head === '*'
    const remote = name.startsWith('origin/') || name.includes('/')
    const cleanName = remote ? name : name

    return {
      name: cleanName,
      current,
      remote,
      lastCommitDate: date || undefined
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
