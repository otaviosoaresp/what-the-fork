import type { AIProvider, ReviewRequest, ReviewResponse } from './types'
import { getReviewConfig } from '../review-config'

const GLM_API_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions'

export class GLMProvider implements AIProvider {
  name = 'glm'

  async isAvailable(): Promise<boolean> {
    const config = getReviewConfig()
    return Boolean(config.glmApiKey)
  }

  async review(request: ReviewRequest): Promise<ReviewResponse> {
    const config = getReviewConfig()

    if (!config.glmApiKey) {
      throw new Error('GLM API key not configured')
    }

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.glmApiKey}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'en-US,en'
      },
      body: JSON.stringify({
        model: 'glm-4.7',
        messages: [
          { role: 'system', content: request.prompt },
          { role: 'user', content: request.context }
        ]
      }),
      signal: request.signal
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`GLM API error: ${response.status} - ${errorBody}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new Error('No response from GLM')
    }

    return { content, provider: 'glm', model: 'glm-4.7' }
  }
}
