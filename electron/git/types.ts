export interface GitResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface Branch {
  name: string
  current: boolean
  remote: boolean
  tracking?: string
  lastCommitDate?: string
}

export interface Commit {
  hash: string
  shortHash: string
  message: string
  author: string
  date: string
}

export interface FileStatus {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'
  staged: boolean
}

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  chunks: DiffChunk[]
}

export interface DiffChunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface RemoteStatus {
  ahead: number
  behind: number
}
