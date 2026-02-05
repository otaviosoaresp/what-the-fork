# PR Comments & Expand Context Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GitHub PR comments display in side panel and expandable context lines in diff view.

**Architecture:** Two independent features that enhance the diff viewer. PR comments integrate with existing GitHub store; expand context adds new git commands and UI components.

**Tech Stack:** React, Zustand, Electron IPC, GitHub CLI (`gh api`), Git commands

---

## Task 1: Add PR Comments Types and IPC

**Files:**
- Create: `electron/github/types.ts` (add PRComment interface)
- Create: `electron/github/commands/pr-comments.ts`
- Modify: `electron/github/ipc-handlers.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Add PRComment type**

In `electron/github/types.ts`, add:

```typescript
export interface PRComment {
  id: number
  path: string
  line: number | null
  originalLine: number | null
  side: 'LEFT' | 'RIGHT'
  body: string
  author: string
  createdAt: string
  inReplyToId: number | null
}
```

**Step 2: Create pr-comments command**

Create `electron/github/commands/pr-comments.ts`:

```typescript
import { spawn } from 'child_process'
import { PRComment } from '../types'

export async function getPRComments(options: {
  repoPath: string
  prNumber: number
}): Promise<PRComment[]> {
  const { repoPath, prNumber } = options

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', [
      'api',
      `repos/{owner}/{repo}/pulls/${prNumber}/comments`,
      '--jq', '.[] | {id, path, line, original_line, side, body, user: .user.login, created_at}'
    ], {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        try {
          const lines = stdout.trim().split('\n').filter(Boolean)
          const comments = lines.map(line => {
            const data = JSON.parse(line)
            return {
              id: data.id,
              path: data.path,
              line: data.line,
              originalLine: data.original_line,
              side: data.side || 'RIGHT',
              body: data.body,
              author: data.user,
              createdAt: data.created_at,
              inReplyToId: data.in_reply_to_id || null
            } as PRComment
          })
          resolve(comments)
        } catch {
          resolve([])
        }
      } else {
        reject(new Error(stderr || 'Failed to fetch PR comments'))
      }
    })

    proc.on('error', reject)
  })
}
```

**Step 3: Add IPC handler**

In `electron/github/ipc-handlers.ts`, add handler for `github:pr:comments`.

**Step 4: Expose in preload**

Add `pr.comments` method to preload bridge.

**Step 5: Add TypeScript types**

Update `src/types/electron.d.ts` with the new method signature.

---

## Task 2: Add PR Comments Store

**Files:**
- Modify: `src/stores/github.ts`

**Step 1: Add state for PR comments**

Add to GitHubStore interface:

```typescript
prComments: PRComment[]
prCommentsLoading: boolean
loadPRComments: (repoPath: string, prNumber: number) => Promise<void>
clearPRComments: () => void
```

**Step 2: Implement loadPRComments action**

```typescript
loadPRComments: async (repoPath: string, prNumber: number) => {
  set({ prCommentsLoading: true })
  try {
    const comments = await window.electron.github.pr.comments({
      repoPath,
      prNumber
    })
    set({ prComments: comments })
  } finally {
    set({ prCommentsLoading: false })
  }
}
```

**Step 3: Implement clearPRComments**

```typescript
clearPRComments: () => {
  set({ prComments: [] })
}
```

---

## Task 3: Create PRCommentsPanel Component

**Files:**
- Create: `src/components/diff/PRCommentsPanel.tsx`

**Step 1: Create the panel component**

```typescript
import { MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useGitHubStore } from '@/stores/github'
import { useDiffStore } from '@/stores/diff'

interface PRCommentsPanelProps {
  onCommentClick: (path: string, line: number) => void
}

export function PRCommentsPanel({ onCommentClick }: PRCommentsPanelProps) {
  const { prComments, prCommentsLoading } = useGitHubStore()
  const { selectedFile } = useDiffStore()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const fileComments = prComments.filter(c => c.path === selectedFile?.path)
  const otherComments = prComments.filter(c => c.path !== selectedFile?.path)

  // Group by file
  const commentsByFile = prComments.reduce((acc, comment) => {
    const path = comment.path
    if (!acc[path]) acc[path] = []
    acc[path].push(comment)
    return acc
  }, {} as Record<string, typeof prComments>)

  if (prComments.length === 0) {
    return null
  }

  return (
    <div className="w-72 border-l border-border bg-background flex flex-col">
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border cursor-pointer hover:bg-muted"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">PR Comments ({prComments.length})</span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          {Object.entries(commentsByFile).map(([path, comments]) => (
            <div key={path} className="border-b border-border">
              <div className="px-3 py-1.5 bg-muted/50 text-xs text-muted-foreground truncate">
                {path}
              </div>
              {comments.map(comment => (
                <button
                  key={comment.id}
                  onClick={() => comment.line && onCommentClick(comment.path, comment.line)}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{comment.author}</span>
                    <span>line {comment.line || '?'}</span>
                  </div>
                  <div className="text-sm text-foreground line-clamp-2 mt-1">
                    {comment.body}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Task 4: Integrate PRCommentsPanel with MainPanel

**Files:**
- Modify: `src/components/MainPanel.tsx`
- Modify: `src/stores/diff.ts`

**Step 1: Auto-load PR comments when viewing branch diff**

In the component that renders the diff, detect if the current branch has a PR and load comments:

```typescript
useEffect(() => {
  if (mode === 'branches' && compareBranch) {
    const pr = branchPrMap[compareBranch]
    if (pr && repoPath) {
      loadPRComments(repoPath, pr.number)
    } else {
      clearPRComments()
    }
  }
}, [mode, compareBranch, branchPrMap, repoPath])
```

**Step 2: Add panel to layout**

Render PRCommentsPanel alongside the diff view when comments exist.

**Step 3: Implement comment click navigation**

When user clicks a comment, select that file and scroll to that line.

---

## Task 5: Add Expand Context Git Command

**Files:**
- Create: `electron/git/commands/file-content.ts`
- Modify: `electron/git/ipc-handlers.ts`
- Modify: `electron/preload.ts`
- Modify: `src/types/electron.d.ts`

**Step 1: Create file content command**

```typescript
import { spawn } from 'child_process'

export async function getFileContent(options: {
  repoPath: string
  ref: string
  filePath: string
}): Promise<string[]> {
  const { repoPath, ref, filePath } = options

  return new Promise((resolve, reject) => {
    const proc = spawn('git', ['show', `${ref}:${filePath}`], {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(stdout.split('\n'))
      } else {
        reject(new Error(stderr || 'Failed to get file content'))
      }
    })

    proc.on('error', reject)
  })
}
```

**Step 2: Add IPC handler**

Register `git:file:content` handler.

**Step 3: Expose in preload**

Add `file.content` method.

**Step 4: Add TypeScript types**

Update electron.d.ts.

---

## Task 6: Add Expand State to Diff Store

**Files:**
- Modify: `src/stores/diff.ts`

**Step 1: Add expanded ranges state**

```typescript
interface ExpandedRange {
  chunkIndex: number
  direction: 'up' | 'down'
  lines: DiffLine[]
}

// Add to store state
expandedRanges: Record<string, ExpandedRange[]>  // keyed by file path

// Add action
expandContext: (filePath: string, chunkIndex: number, direction: 'up' | 'down', count: number) => Promise<void>
```

**Step 2: Implement expandContext action**

Fetch file content for the appropriate ref, extract the needed lines, and merge them into the expanded ranges state.

---

## Task 7: Create ExpandButton Component

**Files:**
- Create: `src/components/diff/ExpandButton.tsx`

**Step 1: Create the button component**

```typescript
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react'

interface ExpandButtonProps {
  direction: 'up' | 'down'
  hiddenLines: number
  onExpand: (count: number) => void
  loading?: boolean
}

export function ExpandButton({ direction, hiddenLines, onExpand, loading }: ExpandButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown
  const count = Math.min(20, hiddenLines)

  return (
    <div className="flex items-center justify-center py-1 bg-muted/30 border-y border-border">
      <button
        onClick={() => onExpand(count)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors disabled:opacity-50"
      >
        <Icon className="w-3 h-3" />
        <span>
          {hiddenLines <= 20
            ? `Show ${hiddenLines} hidden lines`
            : `Load ${count} more lines`}
        </span>
        {hiddenLines > 20 && (
          <span className="text-muted">({hiddenLines} total)</span>
        )}
      </button>
    </div>
  )
}
```

---

## Task 8: Integrate ExpandButton with SplitView and UnifiedView

**Files:**
- Modify: `src/components/diff/SplitView.tsx`
- Modify: `src/components/diff/UnifiedView.tsx`

**Step 1: Calculate hidden lines between chunks**

For each pair of consecutive chunks, calculate how many lines are hidden:

```typescript
const getHiddenLinesBetween = (prevChunk: DiffChunk, nextChunk: DiffChunk): number => {
  const prevEnd = prevChunk.newStart + prevChunk.newLines
  const nextStart = nextChunk.newStart
  return nextStart - prevEnd
}
```

**Step 2: Render ExpandButton between chunks**

Insert ExpandButton components where there are gaps between chunks.

**Step 3: Handle expand callback**

Connect to diff store's expandContext action.

**Step 4: Render expanded lines**

Merge expanded ranges into the rendered output.

---

## Task 9: Add Comment Line Highlighting

**Files:**
- Modify: `src/components/diff/SplitView.tsx`
- Modify: `src/components/diff/UnifiedView.tsx`

**Step 1: Pass comment lines to views**

Get the set of lines that have comments for the current file.

**Step 2: Highlight commented lines**

Add visual indicator (colored border or background) on lines that have PR comments.

**Step 3: Add click handler to navigate to comment**

When clicking a highlighted line, scroll the comments panel to that comment.

---

## Summary

| Task | Description |
|------|-------------|
| 1 | PR Comments types and IPC |
| 2 | PR Comments store |
| 3 | PRCommentsPanel component |
| 4 | Integrate panel with MainPanel |
| 5 | Expand context git command |
| 6 | Expand state in diff store |
| 7 | ExpandButton component |
| 8 | Integrate expand with views |
| 9 | Comment line highlighting |

Tasks 1-4 complete Feature 1 (PR Comments).
Tasks 5-8 complete Feature 2 (Expand Context).
Task 9 adds visual polish connecting both features.
