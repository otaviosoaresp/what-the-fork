import { executeGit } from '../executor'
import { parseStatus } from '../parser'
import type { FileStatus } from '../types'

export async function getStatus(repoPath: string): Promise<FileStatus[]> {
  const result = await executeGit(repoPath, ['status', '--porcelain'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseStatus(result.stdout)
}

export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['add', '--', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function stageAll(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['add', '-A'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['reset', 'HEAD', '--', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function unstageAll(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['reset', 'HEAD'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function discardChanges(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['checkout', '--', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}
