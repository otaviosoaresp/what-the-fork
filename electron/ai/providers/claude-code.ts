import { spawn, ChildProcess } from 'child_process'
import { AIProvider, ReviewRequest, ReviewResponse } from './types'

export class ClaudeCodeProvider implements AIProvider {
  name = 'claude-code'

  isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const childProcess: ChildProcess = spawn('claude', ['--version'], { shell: true })

      const timeout = setTimeout(() => {
        childProcess.kill()
        resolve(false)
      }, 5000)

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeout)
        resolve(code === 0)
      })

      childProcess.on('error', () => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
  }

  review(request: ReviewRequest): Promise<ReviewResponse> {
    return new Promise((resolve, reject) => {
      const fullPrompt = `${request.prompt}\n\n${request.context}`
      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []

      const childProcess: ChildProcess = spawn(
        'claude',
        ['--print', '--output-format', 'text', '-p', fullPrompt],
        {
          cwd: request.repoPath,
          shell: true
        }
      )

      const timeout = setTimeout(() => {
        childProcess.kill()
        reject(new Error('Claude Code CLI timed out after 120 seconds'))
      }, 120000)

      childProcess.stdout?.on('data', (chunk: Buffer) => {
        stdoutChunks.push(chunk)
      })

      childProcess.stderr?.on('data', (chunk: Buffer) => {
        stderrChunks.push(chunk)
      })

      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeout)
        const content = Buffer.concat(stdoutChunks).toString('utf-8').trim()
        const stderrOutput = Buffer.concat(stderrChunks).toString('utf-8').trim()

        if (code === 0) {
          if (!content) {
            reject(new Error('No response from Claude Code CLI'))
            return
          }
          resolve({
            content,
            provider: this.name
          })
        } else {
          reject(new Error(`Claude Code CLI exited with code ${code}: ${stderrOutput || content}`))
        }
      })

      childProcess.on('error', (error: Error) => {
        clearTimeout(timeout)
        childProcess.kill()
        reject(new Error(`Claude Code CLI error: ${error.message}`))
      })
    })
  }
}
