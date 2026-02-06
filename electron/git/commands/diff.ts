import { executeGit } from '../executor'
import { parseDiff } from '../parser'
import type { DiffFile } from '../types'

async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  const result = await executeGit(repoPath, ['rev-parse', '--verify', branch])
  return result.exitCode === 0
}

async function resolveBranch(repoPath: string, branch: string): Promise<string> {
  if (await branchExists(repoPath, branch)) {
    return branch
  }
  if (await branchExists(repoPath, `origin/${branch}`)) {
    return `origin/${branch}`
  }
  return branch
}

export async function getDiffBetweenBranches(
  repoPath: string,
  baseBranch: string,
  compareBranch: string
): Promise<DiffFile[]> {
  const resolvedBase = await resolveBranch(repoPath, baseBranch)
  const resolvedCompare = await resolveBranch(repoPath, compareBranch)

  const result = await executeGit(repoPath, ['diff', `${resolvedBase}...${resolvedCompare}`])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getStagedDiff(repoPath: string): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff', '--staged'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getUnstagedDiff(repoPath: string): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<DiffFile[]> {
  const args = staged ? ['diff', '--staged', '--', filePath] : ['diff', '--', filePath]
  const result = await executeGit(repoPath, args)
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}
