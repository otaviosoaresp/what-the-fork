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

    const hash = parts[0]
    const author = parts[parts.length - 2]
    const date = parts[parts.length - 1]
    const message = parts.slice(1, parts.length - 2).join('|')

    return {
      hash,
      shortHash: hash.substring(0, 7),
      message,
      author,
      date
    }
  }).filter((c): c is Commit => c !== null)
}

export function parseStatus(output: string): FileStatus[] {
  if (!output.trim()) return []

  return output.split('\n').map(line => {
    if (!line.trim()) return null

    const indexStatus = line[0]
    const workTreeStatus = line[1]
    let path = line.substring(3)

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
      const arrowIndex = path.indexOf(' -> ')
      if (arrowIndex !== -1) {
        path = path.substring(arrowIndex + 4)
      }
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

    let oldLineOffset = 0
    let newLineOffset = 0

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
        oldLineOffset = 0
        newLineOffset = 0
        continue
      }

      if (!currentChunk) continue

      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++
        currentChunk.lines.push({
          type: 'add',
          content: line.substring(1),
          newLineNumber: currentChunk.newStart + newLineOffset
        })
        newLineOffset++
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++
        currentChunk.lines.push({
          type: 'remove',
          content: line.substring(1),
          oldLineNumber: currentChunk.oldStart + oldLineOffset
        })
        oldLineOffset++
      } else if (line.startsWith(' ')) {
        currentChunk.lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: currentChunk.oldStart + oldLineOffset,
          newLineNumber: currentChunk.newStart + newLineOffset
        })
        oldLineOffset++
        newLineOffset++
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
