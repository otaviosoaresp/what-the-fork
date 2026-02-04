export interface CodeReference {
  file: string
  line: number
  text: string
  index: number
}

export function parseCodeReferences(content: string): CodeReference[] {
  const references: CodeReference[] = []

  // Pattern: `file:line` or `file.ext:line`
  const pattern = /`([^`]+?):(\d+)`/g
  let match

  while ((match = pattern.exec(content)) !== null) {
    const file = match[1]
    const line = parseInt(match[2], 10)

    // Get surrounding context (up to 50 chars before and after)
    const start = Math.max(0, match.index - 50)
    const end = Math.min(content.length, match.index + match[0].length + 50)
    let text = content.slice(start, end).trim()

    // Clean up the context
    if (start > 0) text = '...' + text
    if (end < content.length) text = text + '...'

    references.push({
      file,
      line,
      text,
      index: match.index
    })
  }

  // Also try pattern: file.ext line X or linha X
  const linePattern = /\b([a-zA-Z0-9_\-/.]+\.[a-zA-Z]+)\s+(?:line|linha)\s+(\d+)/gi
  while ((match = linePattern.exec(content)) !== null) {
    const file = match[1]
    const line = parseInt(match[2], 10)

    // Avoid duplicates
    if (references.some(r => r.file === file && r.line === line)) continue

    const start = Math.max(0, match.index - 30)
    const end = Math.min(content.length, match.index + match[0].length + 30)
    let text = content.slice(start, end).trim()
    if (start > 0) text = '...' + text
    if (end < content.length) text = text + '...'

    references.push({
      file,
      line,
      text,
      index: match.index
    })
  }

  // Sort by index in the content
  return references.sort((a, b) => a.index - b.index)
}

export function groupReferencesByFile(references: CodeReference[]): Map<string, CodeReference[]> {
  const grouped = new Map<string, CodeReference[]>()

  for (const ref of references) {
    const existing = grouped.get(ref.file) ?? []
    existing.push(ref)
    grouped.set(ref.file, existing)
  }

  return grouped
}
