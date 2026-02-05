import { executeGit } from '../executor'

export interface GetFileContentOptions {
  repoPath: string
  ref: string
  filePath: string
}

async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  const result = await executeGit(repoPath, ['rev-parse', '--verify', branch])
  return result.exitCode === 0
}

async function resolveRef(repoPath: string, ref: string): Promise<string> {
  if (await branchExists(repoPath, ref)) {
    return ref
  }
  if (await branchExists(repoPath, `origin/${ref}`)) {
    return `origin/${ref}`
  }
  return ref
}

export async function getFileContent(options: GetFileContentOptions): Promise<string[]> {
  const { repoPath, ref, filePath } = options

  const resolvedRef = await resolveRef(repoPath, ref)
  const result = await executeGit(repoPath, ['show', `${resolvedRef}:${filePath}`])
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to get file content')
  }
  return result.stdout.split('\n')
}
