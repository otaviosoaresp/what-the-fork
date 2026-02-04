import type { AIProvider, ReviewResponse } from './providers/types'
import { ClaudeCodeProvider } from './providers/claude-code'
import { OpenRouterProvider } from './providers/openrouter'
import { GLMProvider } from './providers/glm'
import { getReviewConfig, getRepoReviewConfig, DEFAULT_REVIEW_PROMPT } from './review-config'
import { executeGit } from '../git/executor'

const providers: Record<string, AIProvider> = {
  'claude-code': new ClaudeCodeProvider(),
  'openrouter': new OpenRouterProvider(),
  'glm': new GLMProvider()
}

let activeController: AbortController | null = null

export function cancelActiveReview(): void {
  if (activeController) {
    activeController.abort()
    activeController = null
  }
}

export async function getAvailableProviders(): Promise<string[]> {
  const availableProviders: string[] = []

  for (const [name, provider] of Object.entries(providers)) {
    const isAvailable = await provider.isAvailable()
    if (isAvailable) {
      availableProviders.push(name)
    }
  }

  return availableProviders
}

export async function reviewBranch(
  repoPath: string,
  baseBranch: string,
  compareBranch: string
): Promise<ReviewResponse> {
  const config = getReviewConfig()
  const repoConfig = getRepoReviewConfig(repoPath)

  const provider = providers[config.provider]
  if (!provider) {
    throw new Error(`Provider "${config.provider}" not found`)
  }

  const isAvailable = await provider.isAvailable()
  if (!isAvailable) {
    throw new Error(`Provider "${config.provider}" is not available`)
  }

  const diffResult = await executeGit(repoPath, ['diff', `${baseBranch}...${compareBranch}`])
  if (diffResult.exitCode !== 0) {
    throw new Error(`Failed to get diff between "${baseBranch}" and "${compareBranch}": ${diffResult.stderr}`)
  }

  let diff = diffResult.stdout.trim()
  if (!diff) {
    throw new Error('No diff found between branches')
  }

  if (diff.length > 50000) {
    diff = diff.substring(0, 50000)
  }

  const context = `Review do diff entre ${baseBranch} e ${compareBranch}:\n\n${diff}`

  // Always use default prompt (with JSON structure) as base
  // If repo has custom additional instructions, append them
  let prompt = DEFAULT_REVIEW_PROMPT
  if (repoConfig.reviewPrompt && repoConfig.reviewPrompt !== DEFAULT_REVIEW_PROMPT) {
    prompt = `${DEFAULT_REVIEW_PROMPT}\n\nInstrucoes adicionais do usuario:\n${repoConfig.reviewPrompt}`
  }

  activeController = new AbortController()

  try {
    const result = await provider.review({
      prompt,
      context,
      repoPath,
      signal: activeController.signal
    })
    return result
  } finally {
    activeController = null
  }
}

export async function askAboutCode(
  repoPath: string,
  code: string,
  question: string
): Promise<ReviewResponse> {
  const config = getReviewConfig()

  const provider = providers[config.provider]
  if (!provider) {
    throw new Error(`Provider "${config.provider}" not found`)
  }

  const isAvailable = await provider.isAvailable()
  if (!isAvailable) {
    throw new Error(`Provider "${config.provider}" is not available`)
  }

  const prompt = 'Voce e um assistente de programacao. Responda de forma clara e objetiva. Use markdown para formatacao.'
  const context = `Codigo:\n\`\`\`\n${code}\n\`\`\`\n\nPergunta: ${question}`

  activeController = new AbortController()

  try {
    const result = await provider.review({
      prompt,
      context,
      repoPath,
      signal: activeController.signal
    })
    return result
  } finally {
    activeController = null
  }
}
