import { executeGit } from '../executor'
import { parseBranches } from '../parser'
import type { Branch } from '../types'

export async function listBranches(repoPath: string): Promise<Branch[]> {
  const result = await executeGit(repoPath, ['branch', '-a', '--sort=-committerdate'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseBranches(result.stdout)
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
