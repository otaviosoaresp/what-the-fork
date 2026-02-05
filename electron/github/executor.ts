import { spawn } from 'child_process'

export interface GHExecutorOptions {
  repo?: string
  cwd?: string
  timeout?: number
}

export async function executeGH(
  args: string[],
  options: GHExecutorOptions = {}
): Promise<string> {
  const { repo, cwd, timeout = 30000 } = options

  const fullArgs = [...args]

  if (repo) {
    fullArgs.push('--repo', repo)
  }

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', fullArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    })

    let stdout = ''
    let stderr = ''

    const timeoutId = setTimeout(() => {
      proc.kill()
      reject(new Error(`GH CLI timeout after ${timeout}ms`))
    }, timeout)

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `GH CLI exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  })
}

export async function isGHInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('gh', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const timeoutId = setTimeout(() => {
      proc.kill()
      resolve(false)
    }, 5000)

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      resolve(code === 0)
    })

    proc.on('error', () => {
      clearTimeout(timeoutId)
      resolve(false)
    })
  })
}
