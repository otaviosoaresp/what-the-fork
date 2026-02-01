import { spawn, ChildProcess } from 'child_process'
import type { GitResult } from './types'

export function executeGit(repoPath: string, args: string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    const gitProcess: ChildProcess = spawn('git', args, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    })

    let stdout = ''
    let stderr = ''

    gitProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    gitProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    gitProcess.on('close', (exitCode: number | null) => {
      resolve({
        stdout: stdout.replace(/\n$/, ''),
        stderr: stderr.trim(),
        exitCode: exitCode ?? 1
      })
    })

    gitProcess.on('error', (error: Error) => {
      resolve({
        stdout: '',
        stderr: error.message,
        exitCode: 1
      })
    })
  })
}

export async function isGitRepository(path: string): Promise<boolean> {
  const result = await executeGit(path, ['rev-parse', '--git-dir'])
  return result.exitCode === 0
}
