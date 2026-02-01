import { executeGit } from '../git/executor'
import { getConfig } from './config'
import type { GenerateCommitMessageResult } from './types'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const PROMPT_TEMPLATE = `Analyze the following git diff and generate a concise commit message.
Follow conventional commits format (feat:, fix:, chore:, docs:, refactor:, test:, style:, perf:).
Be specific about what changed.
Focus on the "why" rather than the "what" when possible.
Keep the message under 72 characters for the first line.
If needed, add a blank line followed by bullet points for details.

Diff:
{diff}

Generate only the commit message, nothing else.`

async function getRawStagedDiff(repoPath: string): Promise<string> {
  const result = await executeGit(repoPath, ['diff', '--staged'])
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || 'Failed to get staged diff')
  }
  return result.stdout
}

export async function generateCommitMessage(repoPath: string): Promise<GenerateCommitMessageResult> {
  const config = getConfig()

  if (!config.apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const diff = await getRawStagedDiff(repoPath)

  if (!diff.trim()) {
    throw new Error('No staged changes to analyze')
  }

  const truncatedDiff = diff.length > 15000 ? diff.substring(0, 15000) + '\n... (truncated)' : diff
  const prompt = PROMPT_TEMPLATE.replace('{diff}', truncatedDiff)

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/git-branch-viewer',
      'X-Title': 'What the Fork'
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`)
  }

  const data = await response.json() as {
    choices: Array<{
      message: {
        content: string
      }
    }>
  }

  const message = data.choices?.[0]?.message?.content?.trim()

  if (!message) {
    throw new Error('No response from AI model')
  }

  return { message }
}

export async function testConnection(): Promise<boolean> {
  const config = getConfig()

  if (!config.apiKey) {
    return false
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/git-branch-viewer',
      'X-Title': 'What the Fork'
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: 'Say "ok" and nothing else.'
        }
      ],
      max_tokens: 10
    })
  })

  return response.ok
}
