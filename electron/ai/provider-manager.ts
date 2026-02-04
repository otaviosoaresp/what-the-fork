import type { AIProvider, ReviewResponse } from './providers/types'
import { ClaudeCodeProvider } from './providers/claude-code'
import { OpenRouterProvider } from './providers/openrouter'
import { GLMProvider } from './providers/glm'
import { getReviewConfig, getRepoReviewConfig } from './review-config'
import { executeGit } from '../git/executor'

const providers: Record<string, AIProvider> = {
  'claude-code': new ClaudeCodeProvider(),
  'openrouter': new OpenRouterProvider(),
  'glm': new GLMProvider()
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

export async function reviewBranch(repoPath: string): Promise<ReviewResponse> {
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

  const branchResult = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branchResult.exitCode !== 0) {
    throw new Error(`Failed to get current branch: ${branchResult.stderr}`)
  }
  const currentBranch = branchResult.stdout.trim()

  const baseBranch = repoConfig.baseBranch

  const diffResult = await executeGit(repoPath, ['diff', `${baseBranch}...${currentBranch}`])
  if (diffResult.exitCode !== 0) {
    throw new Error(`Failed to get diff: ${diffResult.stderr}`)
  }

  let diff = diffResult.stdout.trim()
  if (!diff) {
    throw new Error('No diff found between branches')
  }

  if (diff.length > 50000) {
    diff = diff.substring(0, 50000)
  }

  const context = `Review do diff entre ${baseBranch} e ${currentBranch}:\n\n${diff}`

  return provider.review({
    prompt: repoConfig.reviewPrompt,
    context,
    repoPath
  })
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

  return provider.review({
    prompt,
    context,
    repoPath
  })
}
