import type { AIProvider, ReviewRequest, ReviewResponse } from './types'
import { getConfig } from '../config'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter'

  async isAvailable(): Promise<boolean> {
    const config = getConfig()
    return Boolean(config.apiKey)
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const config = getConfig()

    if (!config.apiKey) {
      throw new Error('OpenRouter API key not configured')
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
          { role: 'system', content: request.prompt },
          { role: 'user', content: request.context }
        ],
        max_tokens: 4000,
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('No response from OpenRouter')
    }

    return { content, provider: 'openrouter', model: config.model }
  }
}
