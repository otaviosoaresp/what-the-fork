import { executeGit } from '../executor'
import { parseDiff } from '../parser'
import type { DiffFile } from '../types'

export async function getDiffBetweenBranches(
  repoPath: string,
  baseBranch: string,
  compareBranch: string
): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff', `${baseBranch}...${compareBranch}`])
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
  const args = staged ? ['diff', '--staged', filePath] : ['diff', filePath]
  const result = await executeGit(repoPath, args)
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}
