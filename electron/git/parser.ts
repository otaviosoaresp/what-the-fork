import type { Branch, Commit, FileStatus, DiffFile, DiffChunk, DiffLine, RemoteStatus } from './types'

export function parseBranches(output: string): Branch[] {
  if (!output.trim()) return []

  return output.split('\n').map(line => {
    const current = line.startsWith('* ')
    const cleanLine = line.replace(/^\*?\s+/, '')
    const remote = cleanLine.startsWith('remotes/')
    const name = remote ? cleanLine.replace('remotes/', '') : cleanLine

    const trackingMatch = cleanLine.match(/\[([^\]]+)\]/)
    const tracking = trackingMatch ? trackingMatch[1].split(':')[0] : undefined

    return {
      name: name.split(' ')[0],
      current,
      remote,
      tracking
    }
  }).filter(b => b.name && !b.name.includes('HEAD'))
}

export function parseLog(output: string): Commit[] {
  if (!output.trim()) return []

  return output.split('\n').map(line => {
    const parts = line.split('|')
    if (parts.length < 4) return null

    return {
      hash: parts[0],
      shortHash: parts[0].substring(0, 7),
      message: parts[1],
      author: parts[2],
      date: parts[3]
    }
  }).filter((c): c is Commit => c !== null)
}

export function parseStatus(output: string): FileStatus[] {
  if (!output.trim()) return []

  return output.split('\n').map(line => {
    if (!line.trim()) return null

    const indexStatus = line[0]
    const workTreeStatus = line[1]
    const path = line.substring(3)

    let status: FileStatus['status'] = 'modified'
    let staged = false

    if (indexStatus === '?') {
      status = 'untracked'
    } else if (indexStatus === 'A') {
      status = 'added'
      staged = true
    } else if (indexStatus === 'D') {
      status = 'deleted'
      staged = true
    } else if (indexStatus === 'R') {
      status = 'renamed'
      staged = true
    } else if (indexStatus === 'M') {
      status = 'modified'
      staged = true
    } else if (workTreeStatus === 'M') {
      status = 'modified'
    } else if (workTreeStatus === 'D') {
      status = 'deleted'
    }

    return { path, status, staged }
  }).filter((s): s is FileStatus => s !== null)
}

export function parseDiff(output: string): DiffFile[] {
  if (!output.trim()) return []

  const files: DiffFile[] = []
  const fileBlocks = output.split(/^diff --git/m).filter(Boolean)

  for (const block of fileBlocks) {
    const lines = block.split('\n')
    const headerMatch = lines[0]?.match(/a\/(.+) b\/(.+)/)
    if (!headerMatch) continue

    const path = headerMatch[2]
    const chunks: DiffChunk[] = []
    let currentChunk: DiffChunk | null = null
    let additions = 0
    let deletions = 0

    for (const line of lines) {
      const chunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
      if (chunkMatch) {
        if (currentChunk) chunks.push(currentChunk)
        currentChunk = {
          oldStart: parseInt(chunkMatch[1]),
          oldLines: parseInt(chunkMatch[2] || '1'),
          newStart: parseInt(chunkMatch[3]),
          newLines: parseInt(chunkMatch[4] || '1'),
          lines: []
        }
        continue
      }

      if (!currentChunk) continue

      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
        currentChunk.lines.push({
          type: 'add',
          content: line.substring(1),
          newLineNumber: currentChunk.newStart + currentChunk.lines.filter(l => l.type !== 'remove').length
        })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
        currentChunk.lines.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNumber: currentChunk.oldStart + currentChunk.lines.filter(l => l.type !== 'add').length
        })
      } else if (line.startsWith(' ')) {
        const contextLines = currentChunk.lines.filter(l => l.type === 'context').length
        const addLines = currentChunk.lines.filter(l => l.type === 'add').length
        const removeLines = currentChunk.lines.filter(l => l.type === 'remove').length
        currentChunk.lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: currentChunk.oldStart + contextLines + removeLines,
          newLineNumber: currentChunk.newStart + contextLines + addLines
        })
      }
    }

    if (currentChunk) chunks.push(currentChunk)

    files.push({ path, additions, deletions, chunks })
  }

  return files
}

export function parseRemoteStatus(output: string): RemoteStatus {
  const parts = output.trim().split('\t')
  if (parts.length !== 2) return { ahead: 0, behind: 0 }

  return {
    ahead: parseInt(parts[0]) || 0,
    behind: parseInt(parts[1]) || 0
  }
}
