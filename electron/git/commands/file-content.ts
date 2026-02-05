import { executeGit } from '../executor'

export interface GetFileContentOptions {
  repoPath: string
  ref: string
  filePath: string
}

export async function getFileContent(options: GetFileContentOptions): Promise<string[]> {
  const { repoPath, ref, filePath } = options

  const result = await executeGit(repoPath, ['show', `${ref}:${filePath}`])
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to get file content')
  }
  return result.stdout.split('\n')
}
