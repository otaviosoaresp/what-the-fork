import type { DiffLine, DiffChunk } from '../../electron/git/types'

export interface PairedLine {
  line: DiffLine
  pairedContent?: string
}

export function pairChunkLines(chunk: DiffChunk): PairedLine[] {
  const result: PairedLine[] = []
  const lines = chunk.lines
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.type === 'context') {
      result.push({ line })
      i++
      continue
    }

    if (line.type === 'remove') {
      const removes: DiffLine[] = []
      const adds: DiffLine[] = []

      while (i < lines.length && lines[i].type === 'remove') {
        removes.push(lines[i])
        i++
      }

      while (i < lines.length && lines[i].type === 'add') {
        adds.push(lines[i])
        i++
      }

      for (let j = 0; j < Math.max(removes.length, adds.length); j++) {
        if (j < removes.length) {
          result.push({
            line: removes[j],
            pairedContent: j < adds.length ? adds[j].content : undefined,
          })
        }
        if (j < adds.length) {
          result.push({
            line: adds[j],
            pairedContent: j < removes.length ? removes[j].content : undefined,
          })
        }
      }
      continue
    }

    if (line.type === 'add') {
      result.push({ line })
      i++
    }
  }

  return result
}
