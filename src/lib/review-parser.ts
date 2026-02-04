import type { StructuredReview, ReviewComment, CommentType } from '@/types/electron'

export interface CodeReference {
  file: string
  line: number
  text: string
  index: number
}

export function parseCodeReferences(content: string): CodeReference[] {
  const references: CodeReference[] = []
  const seen = new Set<string>()

  const addReference = (file: string, line: number, matchIndex: number) => {
    const key = `${file}:${line}`
    if (seen.has(key)) return
    seen.add(key)

    const start = Math.max(0, matchIndex - 50)
    const end = Math.min(content.length, matchIndex + 50)
    let text = content.slice(start, end).trim()
    if (start > 0) text = '...' + text
    if (end < content.length) text = text + '...'

    references.push({ file, line, text, index: matchIndex })
  }

  // Pattern 1: `file:line` or `file.ext:line` (backtick format)
  const backtickPattern = /`([^`\s]+):(\d+)`/g
  let match
  while ((match = backtickPattern.exec(content)) !== null) {
    addReference(match[1], parseInt(match[2], 10), match.index)
  }

  // Pattern 2: **file:line** (bold format)
  const boldPattern = /\*\*([^*\s]+):(\d+)\*\*/g
  while ((match = boldPattern.exec(content)) !== null) {
    addReference(match[1], parseInt(match[2], 10), match.index)
  }

  // Pattern 3: file.ext:line (plain format with extension)
  const plainPattern = /\b([a-zA-Z0-9_\-/]+\.[a-zA-Z]{1,5}):(\d+)\b/g
  while ((match = plainPattern.exec(content)) !== null) {
    addReference(match[1], parseInt(match[2], 10), match.index)
  }

  // Pattern 4: "line X" or "linha X" after a file mention
  const linePattern = /\b([a-zA-Z0-9_\-/]+\.[a-zA-Z]{1,5})\s+(?:line|linha|L)\s*(\d+)/gi
  while ((match = linePattern.exec(content)) !== null) {
    addReference(match[1], parseInt(match[2], 10), match.index)
  }

  // Pattern 5: "na linha X" or "at line X" (line number only, file from context)
  const looseLinePattern = /(?:na\s+linha|at\s+line|linha|line)\s+(\d+)/gi
  while ((match = looseLinePattern.exec(content)) !== null) {
    const line = parseInt(match[1], 10)
    const contextBefore = content.slice(Math.max(0, match.index - 100), match.index)
    const fileMatch = contextBefore.match(/\b([a-zA-Z0-9_\-/]+\.[a-zA-Z]{1,5})\b/g)
    if (fileMatch) {
      const file = fileMatch[fileMatch.length - 1]
      addReference(file, line, match.index)
    }
  }

  return references.sort((a, b) => a.index - b.index)
}

export function isCodeReference(text: string): { file: string; line: number } | null {
  const match = text.match(/^([^:]+):(\d+)$/)
  if (match) {
    return { file: match[1], line: parseInt(match[2], 10) }
  }
  return null
}

const VALID_COMMENT_TYPES: CommentType[] = ['bug', 'performance', 'readability', 'suggestion', 'positive']

export function parseStructuredReview(content: string): StructuredReview {
  try {
    let cleaned = content.trim()
    // Remove markdown code fences if present
    cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '')
    // Try to extract JSON object if wrapped in text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      cleaned = jsonMatch[0]
    }
    console.log('[parseStructuredReview] Cleaned content:', cleaned.substring(0, 500))
    const parsed = JSON.parse(cleaned)
    console.log('[parseStructuredReview] Parsed JSON:', parsed)

    if (typeof parsed.summary !== 'string') {
      throw new Error('Invalid summary')
    }

    const comments: ReviewComment[] = []
    if (Array.isArray(parsed.comments)) {
      for (const c of parsed.comments) {
        console.log('[parseStructuredReview] Processing comment:', c)
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
        } else {
          console.log('[parseStructuredReview] Invalid comment:', {
            fileOk: typeof c.file === 'string',
            lineOk: typeof c.line === 'number',
            typeOk: VALID_COMMENT_TYPES.includes(c.type),
            contentOk: typeof c.content === 'string'
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

    console.log('[parseStructuredReview] Final result:', { summary: parsed.summary.substring(0, 100), commentsCount: comments.length, generalNotesCount: generalNotes.length })
    return { summary: parsed.summary, comments, generalNotes }
  } catch (err) {
    console.error('[parseStructuredReview] Parse error:', err)
    console.log('[parseStructuredReview] Raw content:', content.substring(0, 500))
    return {
      summary: content,
      comments: [],
      generalNotes: []
    }
  }
}
