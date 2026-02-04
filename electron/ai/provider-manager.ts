import type { AIProvider, ReviewResponse, StructuredReview, ReviewComment, CommentType } from './providers/types'
import { ClaudeCodeProvider } from './providers/claude-code'
import { OpenRouterProvider } from './providers/openrouter'
import { GLMProvider } from './providers/glm'
import { getReviewConfig, getRepoReviewConfig, DEFAULT_REVIEW_PROMPT } from './review-config'
import { getCachedReview, saveReviewToHistory } from './review-history'
import { executeGit } from '../git/executor'

const VALID_COMMENT_TYPES: CommentType[] = ['bug', 'performance', 'readability', 'suggestion', 'positive']

function parseStructuredReview(content: string): StructuredReview {
  try {
    let cleaned = content.trim()
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }
    const parsed = JSON.parse(cleaned)

    if (typeof parsed.summary !== 'string') {
      throw new Error('Invalid summary')
    }

    const comments: ReviewComment[] = []
    if (Array.isArray(parsed.comments)) {
      for (const c of parsed.comments) {
        if (
          typeof c.file === 'string' &&
          typeof c.line === 'number' &&
          VALID_COMMENT_TYPES.includes(c.type) &&
          typeof c.content === 'string'
        ) {
          comments.push({
            file: c.file,
            line: c.line,
            type: c.type,
            content: c.content
          })
        }
      }
    }

    const generalNotes: string[] = []
    if (Array.isArray(parsed.generalNotes)) {
      for (const note of parsed.generalNotes) {
        if (typeof note === 'string') {
          generalNotes.push(note)
        }
      }
    }

    return { summary: parsed.summary, comments, generalNotes }
  } catch {
    return {
      summary: content,
      comments: [],
      generalNotes: []
    }
  }
}

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
  compareBranch: string,
  skipCache = false
): Promise<ReviewResponse> {
  const config = getReviewConfig()
  const repoConfig = getRepoReviewConfig(repoPath)

  // Get diff first (needed for both cache check and API call)
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

  const providerName = config.provider
  const provider = providers[providerName]

  // Check cache unless explicitly skipped
  if (!skipCache) {
    const cached = getCachedReview(repoPath, baseBranch, compareBranch, diff, providerName)
    if (cached) {
      return {
        content: cached.review.summary,
        provider: cached.provider + ' (cached)',
        cached: true,
        structured: cached.review
      }
    }
  }
  if (!provider) {
    throw new Error(`Provider "${providerName}" not found`)
  }

  const isAvailable = await provider.isAvailable()
  if (!isAvailable) {
    throw new Error(`Provider "${providerName}" is not available`)
  }

  const context = `Review do diff entre ${baseBranch} e ${compareBranch}:\n\n${diff}`

  // Always use default prompt (with JSON structure) as base
  // If repo has custom additional instructions, append them
  let prompt = DEFAULT_REVIEW_PROMPT
  if (repoConfig.reviewPrompt && repoConfig.reviewPrompt !== DEFAULT_REVIEW_PROMPT) {
    prompt = `${DEFAULT_REVIEW_PROMPT}\n\nInstrucoes adicionais do usuario:\n${repoConfig.reviewPrompt}`
  }

  cancelActiveReview()
  const controller = new AbortController()
  activeController = controller

  try {
    const result = await provider.review({
      prompt,
      context,
      repoPath,
      signal: controller.signal
    })

    const structured = parseStructuredReview(result.content)
    saveReviewToHistory(repoPath, baseBranch, compareBranch, diff, providerName, structured)

    return {
      ...result,
      structured
    }
  } finally {
    if (activeController === controller) {
      activeController = null
    }
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

  cancelActiveReview()
  const controller = new AbortController()
  activeController = controller

  try {
    const result = await provider.review({
      prompt,
      context,
      repoPath,
      signal: controller.signal
    })
    return result
  } finally {
    if (activeController === controller) {
      activeController = null
    }
  }
}
