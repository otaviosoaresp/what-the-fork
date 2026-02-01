import { executeGit } from '../executor'
import { parseLog, parseDiff } from '../parser'
import type { Commit, DiffFile } from '../types'

export async function createCommit(repoPath: string, message: string): Promise<void> {
  const result = await executeGit(repoPath, ['commit', '-m', message])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function getLog(repoPath: string, count: number = 50): Promise<Commit[]> {
  const format = '%H|%s|%an|%ad|%D'
  const result = await executeGit(repoPath, [
    'log',
    `--format=${format}`,
    '--date=format:%Y-%m-%d %H:%M',
    `-n${count}`
  ])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseLog(result.stdout)
}

export async function getCommitDiff(repoPath: string, commitHash: string): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['show', commitHash, '--format='])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}
