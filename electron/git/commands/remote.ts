import { executeGit } from '../executor'
import { parseRemoteStatus } from '../parser'
import type { RemoteStatus } from '../types'

export async function fetch(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['fetch', '--all'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function pull(repoPath: string): Promise<void> {
  const upstreamCheck = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', '@{upstream}'])

  if (upstreamCheck.exitCode !== 0) {
    const branchResult = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (branchResult.exitCode !== 0) throw new Error(branchResult.stderr)

    const currentBranch = branchResult.stdout.trim()
    const result = await executeGit(repoPath, ['pull', '--rebase', 'origin', currentBranch])
    if (result.exitCode !== 0) throw new Error(result.stderr)
  } else {
    const result = await executeGit(repoPath, ['pull', '--rebase'])
    if (result.exitCode !== 0) throw new Error(result.stderr)
  }
}

export async function push(repoPath: string): Promise<void> {
  const upstreamCheck = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', '@{upstream}'])

  if (upstreamCheck.exitCode !== 0) {
    const branchResult = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
    if (branchResult.exitCode !== 0) throw new Error(branchResult.stderr)

    const currentBranch = branchResult.stdout.trim()
    const result = await executeGit(repoPath, ['push', '--set-upstream', 'origin', currentBranch])
    if (result.exitCode !== 0) throw new Error(result.stderr)
  } else {
    const result = await executeGit(repoPath, ['push'])
    if (result.exitCode !== 0) throw new Error(result.stderr)
  }
}

export async function getRemoteStatus(repoPath: string): Promise<RemoteStatus> {
  const result = await executeGit(repoPath, [
    'rev-list',
    '--left-right',
    '--count',
    'HEAD...@{upstream}'
  ])

  if (result.exitCode !== 0) {
    const localCommits = await countLocalCommits(repoPath)
    return { ahead: localCommits, behind: 0, hasUpstream: false }
  }

  const status = parseRemoteStatus(result.stdout)
  return { ...status, hasUpstream: true }
}

async function countLocalCommits(repoPath: string): Promise<number> {
  const result = await executeGit(repoPath, [
    'rev-list',
    '--count',
    'HEAD',
    '--not',
    '--remotes'
  ])
  if (result.exitCode !== 0) return 0
  return parseInt(result.stdout.trim()) || 0
}
