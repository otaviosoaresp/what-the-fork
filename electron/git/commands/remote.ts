import { executeGit } from '../executor'
import { parseRemoteStatus } from '../parser'
import type { RemoteStatus } from '../types'

export async function fetch(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['fetch', '--all'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function pull(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['pull'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function push(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['push'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function getRemoteStatus(repoPath: string): Promise<RemoteStatus> {
  const result = await executeGit(repoPath, [
    'rev-list',
    '--left-right',
    '--count',
    'HEAD...@{upstream}'
  ])
  if (result.exitCode !== 0) return { ahead: 0, behind: 0 }
  return parseRemoteStatus(result.stdout)
}
