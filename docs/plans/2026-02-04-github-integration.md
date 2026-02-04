# GitHub CLI Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate GitHub CLI to fetch PR and issue information, with account selection per repository and contextual AI code reviews.

**Architecture:** New `electron/github/` module following existing git module patterns. Zustand store for GitHub state. Account selector in Header, PR tab in Sidebar, context field in ReviewPanel.

**Tech Stack:** GH CLI (spawned via child_process), Electron Store (account persistence), Zustand (state), React (UI components)

---

## Task 1: GitHub Types Definition

**Files:**
- Create: `electron/github/types.ts`

**Step 1: Create types file**

```typescript
export interface GitHubAccount {
  username: string
  isActive: boolean
}

export interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  updatedAt: string
  headBranch: string
  baseBranch: string
  reviewStatus: {
    approved: number
    changesRequested: number
    pending: string[]
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  milestone: string | null
  commentsCount: number
  mergeable: boolean | null
  url: string
}

export interface Issue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  labels: string[]
  url: string
}

export interface ReviewContext {
  type: 'issue' | 'manual'
  issueNumber?: number
  issueContent?: Issue
  manualContext?: string
}
```

**Step 2: Commit**

```bash
git add electron/github/types.ts
git commit -m "feat(github): add type definitions for GitHub integration"
```

---

## Task 2: GitHub CLI Executor

**Files:**
- Create: `electron/github/executor.ts`

**Step 1: Create executor with spawn wrapper**

```typescript
import { spawn } from 'child_process'

export interface GHExecutorOptions {
  account?: string
  repo?: string
  cwd?: string
  timeout?: number
}

export async function executeGH(
  args: string[],
  options: GHExecutorOptions = {}
): Promise<string> {
  const { account, repo, cwd, timeout = 30000 } = options

  const fullArgs = [...args]

  if (repo) {
    fullArgs.push('--repo', repo)
  }

  fullArgs.push('--json')

  return new Promise((resolve, reject) => {
    const proc = spawn('gh', fullArgs, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...(account ? { GH_USER: account } : {})
      }
    })

    let stdout = ''
    let stderr = ''

    const timeoutId = setTimeout(() => {
      proc.kill()
      reject(new Error(`GH CLI timeout after ${timeout}ms`))
    }, timeout)

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      clearTimeout(timeoutId)
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || `GH CLI exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
  })
}

export async function isGHInstalled(): Promise<boolean> {
  try {
    await executeGH(['--version'], { timeout: 5000 })
    return true
  } catch {
    return false
  }
}
```

**Step 2: Commit**

```bash
git add electron/github/executor.ts
git commit -m "feat(github): add GH CLI executor with timeout and account support"
```

---

## Task 3: Auth Commands

**Files:**
- Create: `electron/github/commands/auth.ts`

**Step 1: Create auth commands**

```typescript
import { spawn } from 'child_process'
import { GitHubAccount } from '../types'

export async function listAccounts(): Promise<GitHubAccount[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['auth', 'status'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', () => {
      const accounts = parseAuthStatus(output)
      resolve(accounts)
    })

    proc.on('error', () => {
      resolve([])
    })
  })
}

function parseAuthStatus(output: string): GitHubAccount[] {
  const accounts: GitHubAccount[] = []
  const lines = output.split('\n')

  let currentAccount: string | null = null

  for (const line of lines) {
    const accountMatch = line.match(/Logged in to .+ account (\S+)/)
    if (accountMatch) {
      currentAccount = accountMatch[1]
    }

    if (currentAccount && line.includes('Active account:')) {
      const isActive = line.includes('true')
      accounts.push({
        username: currentAccount,
        isActive
      })
      currentAccount = null
    }
  }

  return accounts
}

export async function switchAccount(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gh', ['auth', 'switch', '--user', username], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderr = ''

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr || `Failed to switch account to ${username}`))
      }
    })

    proc.on('error', reject)
  })
}
```

**Step 2: Commit**

```bash
git add electron/github/commands/auth.ts
git commit -m "feat(github): add auth commands for listing and switching accounts"
```

---

## Task 4: PR Commands

**Files:**
- Create: `electron/github/commands/pr.ts`

**Step 1: Create PR commands**

```typescript
import { executeGH } from '../executor'
import { PullRequest } from '../types'

const PR_FIELDS = [
  'number',
  'title',
  'author',
  'state',
  'isDraft',
  'createdAt',
  'updatedAt',
  'headRefName',
  'baseRefName',
  'reviewDecision',
  'reviews',
  'statusCheckRollup',
  'labels',
  'milestone',
  'comments',
  'mergeable',
  'url'
].join(',')

export async function listPullRequests(options: {
  repo: string
  type: 'created' | 'review-requested' | 'all'
  account?: string
}): Promise<PullRequest[]> {
  const { repo, type, account } = options

  const args = ['pr', 'list', '--limit', '100']

  if (type === 'created') {
    args.push('--author', '@me')
  } else if (type === 'review-requested') {
    args.push('--search', 'review-requested:@me')
  }

  args.push('--json', PR_FIELDS)

  const result = await executeGH(args, { repo, account, timeout: 30000 })
  const data = JSON.parse(result)

  return data.map(parsePullRequest)
}

export async function getPullRequestForBranch(options: {
  repo: string
  branch: string
  account?: string
}): Promise<PullRequest | null> {
  const { repo, branch, account } = options

  try {
    const args = ['pr', 'list', '--head', branch, '--json', PR_FIELDS]
    const result = await executeGH(args, { repo, account, timeout: 15000 })
    const data = JSON.parse(result)

    if (data.length > 0) {
      return parsePullRequest(data[0])
    }
    return null
  } catch {
    return null
  }
}

function parsePullRequest(data: Record<string, unknown>): PullRequest {
  const reviews = (data.reviews as Array<{ state: string }>) || []
  const approved = reviews.filter(r => r.state === 'APPROVED').length
  const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length

  const statusCheck = data.statusCheckRollup as Array<{ state: string }> | null
  let checksStatus: PullRequest['checksStatus'] = null
  if (statusCheck && statusCheck.length > 0) {
    const states = statusCheck.map(s => s.state)
    if (states.every(s => s === 'SUCCESS')) {
      checksStatus = 'success'
    } else if (states.some(s => s === 'FAILURE')) {
      checksStatus = 'failure'
    } else if (states.some(s => s === 'PENDING')) {
      checksStatus = 'pending'
    } else {
      checksStatus = 'neutral'
    }
  }

  const labels = (data.labels as Array<{ name: string }>) || []
  const milestone = data.milestone as { title: string } | null
  const comments = (data.comments as Array<unknown>) || []
  const author = data.author as { login: string }

  return {
    number: data.number as number,
    title: data.title as string,
    author: author?.login || 'unknown',
    state: (data.state as string).toLowerCase() as PullRequest['state'],
    isDraft: data.isDraft as boolean,
    createdAt: data.createdAt as string,
    updatedAt: data.updatedAt as string,
    headBranch: data.headRefName as string,
    baseBranch: data.baseRefName as string,
    reviewStatus: {
      approved,
      changesRequested,
      pending: []
    },
    checksStatus,
    labels: labels.map(l => l.name),
    milestone: milestone?.title || null,
    commentsCount: comments.length,
    mergeable: data.mergeable as boolean | null,
    url: data.url as string
  }
}
```

**Step 2: Commit**

```bash
git add electron/github/commands/pr.ts
git commit -m "feat(github): add PR commands for listing and fetching pull requests"
```

---

## Task 5: Issue Commands

**Files:**
- Create: `electron/github/commands/issue.ts`

**Step 1: Create issue commands**

```typescript
import { executeGH } from '../executor'
import { Issue } from '../types'

const ISSUE_FIELDS = [
  'number',
  'title',
  'body',
  'state',
  'author',
  'labels',
  'url'
].join(',')

export async function getIssue(options: {
  repo: string
  number: number
  account?: string
}): Promise<Issue | null> {
  const { repo, number, account } = options

  try {
    const args = ['issue', 'view', String(number), '--json', ISSUE_FIELDS]
    const result = await executeGH(args, { repo, account, timeout: 15000 })
    const data = JSON.parse(result)

    return parseIssue(data)
  } catch {
    return null
  }
}

function parseIssue(data: Record<string, unknown>): Issue {
  const author = data.author as { login: string }
  const labels = (data.labels as Array<{ name: string }>) || []

  return {
    number: data.number as number,
    title: data.title as string,
    body: (data.body as string) || '',
    state: (data.state as string).toLowerCase() as Issue['state'],
    author: author?.login || 'unknown',
    labels: labels.map(l => l.name),
    url: data.url as string
  }
}
```

**Step 2: Commit**

```bash
git add electron/github/commands/issue.ts
git commit -m "feat(github): add issue command for fetching issue details"
```

---

## Task 6: GitHub IPC Handlers

**Files:**
- Create: `electron/github/ipc-handlers.ts`
- Create: `electron/github/index.ts`

**Step 1: Create IPC handlers**

```typescript
import { ipcMain, shell } from 'electron'
import Store from 'electron-store'
import { listAccounts, switchAccount } from './commands/auth'
import { listPullRequests, getPullRequestForBranch } from './commands/pr'
import { getIssue } from './commands/issue'
import { isGHInstalled } from './executor'

interface RepoAccountStore {
  repoAccounts: Record<string, string>
}

const store = new Store<RepoAccountStore>({
  name: 'github-config',
  defaults: {
    repoAccounts: {}
  }
})

export function registerGitHubHandlers(): void {
  ipcMain.handle('github:is-available', async () => {
    return isGHInstalled()
  })

  ipcMain.handle('github:accounts:list', async () => {
    return listAccounts()
  })

  ipcMain.handle('github:accounts:switch', async (_event, username: string) => {
    await switchAccount(username)
  })

  ipcMain.handle('github:accounts:get-for-repo', async (_event, repoKey: string) => {
    return store.get(`repoAccounts.${repoKey}`) || null
  })

  ipcMain.handle('github:accounts:set-for-repo', async (_event, repoKey: string, username: string) => {
    store.set(`repoAccounts.${repoKey}`, username)
  })

  ipcMain.handle('github:pr:list', async (_event, options: {
    repo: string
    type: 'created' | 'review-requested' | 'all'
    account?: string
  }) => {
    return listPullRequests(options)
  })

  ipcMain.handle('github:pr:for-branch', async (_event, options: {
    repo: string
    branch: string
    account?: string
  }) => {
    return getPullRequestForBranch(options)
  })

  ipcMain.handle('github:issue:get', async (_event, options: {
    repo: string
    number: number
    account?: string
  }) => {
    return getIssue(options)
  })

  ipcMain.handle('github:open-url', async (_event, url: string) => {
    await shell.openExternal(url)
  })
}
```

**Step 2: Create index file**

```typescript
export * from './types'
export * from './executor'
export { registerGitHubHandlers } from './ipc-handlers'
```

**Step 3: Commit**

```bash
git add electron/github/ipc-handlers.ts electron/github/index.ts
git commit -m "feat(github): add IPC handlers for GitHub operations"
```

---

## Task 7: Register GitHub Handlers in Main

**Files:**
- Modify: `electron/main.ts`

**Step 1: Import and register handlers**

Add import at top:
```typescript
import { registerGitHubHandlers } from './github'
```

Find where `registerGitHandlers()` is called and add after it:
```typescript
registerGitHubHandlers()
```

**Step 2: Commit**

```bash
git add electron/main.ts
git commit -m "feat(github): register GitHub IPC handlers in main process"
```

---

## Task 8: Update Preload with GitHub API

**Files:**
- Modify: `electron/preload.ts`

**Step 1: Add GitHub API to contextBridge**

Add to the `contextBridge.exposeInMainWorld('electron', { ... })` object:

```typescript
github: {
  isAvailable: () => ipcRenderer.invoke('github:is-available'),
  accounts: {
    list: () => ipcRenderer.invoke('github:accounts:list'),
    switch: (username: string) => ipcRenderer.invoke('github:accounts:switch', username),
    getForRepo: (repoKey: string) => ipcRenderer.invoke('github:accounts:get-for-repo', repoKey),
    setForRepo: (repoKey: string, username: string) => ipcRenderer.invoke('github:accounts:set-for-repo', repoKey, username)
  },
  pr: {
    list: (options: { repo: string; type: 'created' | 'review-requested' | 'all'; account?: string }) =>
      ipcRenderer.invoke('github:pr:list', options),
    forBranch: (options: { repo: string; branch: string; account?: string }) =>
      ipcRenderer.invoke('github:pr:for-branch', options)
  },
  issue: {
    get: (options: { repo: string; number: number; account?: string }) =>
      ipcRenderer.invoke('github:issue:get', options)
  },
  openUrl: (url: string) => ipcRenderer.invoke('github:open-url', url)
}
```

**Step 2: Commit**

```bash
git add electron/preload.ts
git commit -m "feat(github): expose GitHub API via preload"
```

---

## Task 9: Update Electron Types for Frontend

**Files:**
- Modify: `src/types/electron.d.ts`

**Step 1: Add GitHub types and API**

Add type imports/definitions:
```typescript
interface GitHubAccount {
  username: string
  isActive: boolean
}

interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  updatedAt: string
  headBranch: string
  baseBranch: string
  reviewStatus: {
    approved: number
    changesRequested: number
    pending: string[]
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  milestone: string | null
  commentsCount: number
  mergeable: boolean | null
  url: string
}

interface Issue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  author: string
  labels: string[]
  url: string
}
```

Add to ElectronAPI interface:
```typescript
github: {
  isAvailable: () => Promise<boolean>
  accounts: {
    list: () => Promise<GitHubAccount[]>
    switch: (username: string) => Promise<void>
    getForRepo: (repoKey: string) => Promise<string | null>
    setForRepo: (repoKey: string, username: string) => Promise<void>
  }
  pr: {
    list: (options: { repo: string; type: 'created' | 'review-requested' | 'all'; account?: string }) => Promise<PullRequest[]>
    forBranch: (options: { repo: string; branch: string; account?: string }) => Promise<PullRequest | null>
  }
  issue: {
    get: (options: { repo: string; number: number; account?: string }) => Promise<Issue | null>
  }
  openUrl: (url: string) => Promise<void>
}
```

**Step 2: Commit**

```bash
git add src/types/electron.d.ts
git commit -m "feat(github): add GitHub types to frontend type definitions"
```

---

## Task 10: GitHub Store

**Files:**
- Create: `src/stores/github.ts`

**Step 1: Create Zustand store**

```typescript
import { create } from 'zustand'

interface GitHubAccount {
  username: string
  isActive: boolean
}

interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  updatedAt: string
  headBranch: string
  baseBranch: string
  reviewStatus: {
    approved: number
    changesRequested: number
    pending: string[]
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  milestone: string | null
  commentsCount: number
  mergeable: boolean | null
  url: string
}

interface GitHubStore {
  isAvailable: boolean
  accounts: GitHubAccount[]
  selectedAccount: string | null
  needsAccountSelection: boolean

  pullRequests: PullRequest[]
  prFilter: 'created' | 'review-requested' | 'all'
  prLoading: boolean

  branchPrMap: Record<string, PullRequest>

  checkAvailability: () => Promise<void>
  loadAccounts: () => Promise<void>
  selectAccount: (username: string) => Promise<void>
  setNeedsAccountSelection: (needs: boolean) => void
  setPrFilter: (filter: 'created' | 'review-requested' | 'all') => void
  loadPullRequests: (repo: string) => Promise<void>
  refreshPullRequests: (repo: string) => Promise<void>
  loadBranchPrMap: (repo: string, branches: string[]) => Promise<void>
  clearState: () => void
}

export const useGitHubStore = create<GitHubStore>((set, get) => ({
  isAvailable: false,
  accounts: [],
  selectedAccount: null,
  needsAccountSelection: false,

  pullRequests: [],
  prFilter: 'all',
  prLoading: false,

  branchPrMap: {},

  checkAvailability: async () => {
    const available = await window.electron.github.isAvailable()
    set({ isAvailable: available })
  },

  loadAccounts: async () => {
    const accounts = await window.electron.github.accounts.list()
    set({ accounts })
  },

  selectAccount: async (username: string) => {
    await window.electron.github.accounts.switch(username)
    set({ selectedAccount: username, needsAccountSelection: false })
  },

  setNeedsAccountSelection: (needs: boolean) => {
    set({ needsAccountSelection: needs })
  },

  setPrFilter: (filter: 'created' | 'review-requested' | 'all') => {
    set({ prFilter: filter })
  },

  loadPullRequests: async (repo: string) => {
    const { selectedAccount, prFilter } = get()
    if (!selectedAccount) return

    set({ prLoading: true })
    try {
      const prs = await window.electron.github.pr.list({
        repo,
        type: prFilter,
        account: selectedAccount
      })
      set({ pullRequests: prs })
    } finally {
      set({ prLoading: false })
    }
  },

  refreshPullRequests: async (repo: string) => {
    await get().loadPullRequests(repo)
  },

  loadBranchPrMap: async (repo: string, branches: string[]) => {
    const { selectedAccount } = get()
    if (!selectedAccount) return

    const map: Record<string, PullRequest> = {}

    await Promise.all(
      branches.slice(0, 50).map(async (branch) => {
        const pr = await window.electron.github.pr.forBranch({
          repo,
          branch,
          account: selectedAccount
        })
        if (pr) {
          map[branch] = pr
        }
      })
    )

    set({ branchPrMap: map })
  },

  clearState: () => {
    set({
      pullRequests: [],
      branchPrMap: {},
      selectedAccount: null,
      needsAccountSelection: false
    })
  }
}))
```

**Step 2: Commit**

```bash
git add src/stores/github.ts
git commit -m "feat(github): add Zustand store for GitHub state management"
```

---

## Task 11: Account Selector Component

**Files:**
- Create: `src/components/header/AccountSelector.tsx`

**Step 1: Create component**

```typescript
import { ChevronDown, Github, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useGitHubStore } from '../../stores/github'

export function AccountSelector() {
  const {
    isAvailable,
    accounts,
    selectedAccount,
    selectAccount,
    loadAccounts
  } = useGitHubStore()

  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAvailable) {
      loadAccounts()
    }
  }, [isAvailable, loadAccounts])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAvailable || accounts.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
      >
        <Github className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">
          {selectedAccount || 'Select account'}
        </span>
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg z-50">
          {accounts.map((account) => (
            <button
              key={account.username}
              onClick={() => {
                selectAccount(account.username)
                setIsOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-700 transition-colors ${
                selectedAccount === account.username ? 'bg-zinc-700' : ''
              }`}
            >
              <User className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{account.username}</span>
              {account.isActive && (
                <span className="ml-auto text-xs text-green-500">active</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/header/AccountSelector.tsx
git commit -m "feat(github): add AccountSelector component for header"
```

---

## Task 12: Account Selection Modal

**Files:**
- Create: `src/components/github/AccountSelectionModal.tsx`

**Step 1: Create modal component**

```typescript
import { Github, User, X } from 'lucide-react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'

export function AccountSelectionModal() {
  const { accounts, selectAccount, setNeedsAccountSelection, needsAccountSelection } = useGitHubStore()
  const { repoName } = useRepositoryStore()

  if (!needsAccountSelection) {
    return null
  }

  const handleSelect = async (username: string) => {
    await selectAccount(username)
    const repoKey = repoName || 'default'
    await window.electron.github.accounts.setForRepo(repoKey, username)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-96 max-w-[90vw]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Select GitHub Account</h2>
          </div>
          <button
            onClick={() => setNeedsAccountSelection(false)}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-zinc-400 mb-4">
            Select the GitHub account to use for <span className="text-zinc-200">{repoName}</span>
          </p>

          <div className="space-y-2">
            {accounts.map((account) => (
              <button
                key={account.username}
                onClick={() => handleSelect(account.username)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-700 rounded-md transition-colors"
              >
                <User className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-200">{account.username}</span>
                {account.isActive && (
                  <span className="ml-auto text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                    active in CLI
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/github/AccountSelectionModal.tsx
git commit -m "feat(github): add AccountSelectionModal for first-time repo setup"
```

---

## Task 13: Pull Request Item Component

**Files:**
- Create: `src/components/pull-requests/PullRequestItem.tsx`

**Step 1: Create component**

```typescript
import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  ExternalLink
} from 'lucide-react'

interface PullRequest {
  number: number
  title: string
  author: string
  state: 'open' | 'closed' | 'merged'
  isDraft: boolean
  createdAt: string
  reviewStatus: {
    approved: number
    changesRequested: number
  }
  checksStatus: 'success' | 'failure' | 'pending' | 'neutral' | null
  labels: string[]
  commentsCount: number
  mergeable: boolean | null
  url: string
  headBranch: string
  baseBranch: string
}

interface PullRequestItemProps {
  pr: PullRequest
}

export function PullRequestItem({ pr }: PullRequestItemProps) {
  const handleClick = () => {
    window.electron.github.openUrl(pr.url)
  }

  const getStateColor = () => {
    if (pr.isDraft) return 'text-zinc-500'
    switch (pr.state) {
      case 'open': return 'text-green-500'
      case 'merged': return 'text-purple-500'
      case 'closed': return 'text-red-500'
      default: return 'text-zinc-400'
    }
  }

  const getChecksIcon = () => {
    switch (pr.checksStatus) {
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      case 'failure': return <XCircle className="w-3.5 h-3.5 text-red-500" />
      case 'pending': return <Clock className="w-3.5 h-3.5 text-yellow-500" />
      default: return null
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      onClick={handleClick}
      className="px-3 py-2 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
    >
      <div className="flex items-start gap-2">
        <GitPullRequest className={`w-4 h-4 mt-0.5 ${getStateColor()}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-200 font-medium truncate">
              {pr.title}
            </span>
            <ExternalLink className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            <span>#{pr.number}</span>
            <span>{pr.author}</span>
            <span>{formatDate(pr.createdAt)}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            {getChecksIcon()}

            {pr.reviewStatus.approved > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-green-500">
                <CheckCircle className="w-3 h-3" />
                {pr.reviewStatus.approved}
              </span>
            )}

            {pr.reviewStatus.changesRequested > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <XCircle className="w-3 h-3" />
                {pr.reviewStatus.changesRequested}
              </span>
            )}

            {pr.mergeable === false && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                <AlertTriangle className="w-3 h-3" />
                conflicts
              </span>
            )}

            {pr.commentsCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-zinc-500">
                <MessageSquare className="w-3 h-3" />
                {pr.commentsCount}
              </span>
            )}

            {pr.labels.slice(0, 2).map((label) => (
              <span
                key={label}
                className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-300"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/pull-requests/PullRequestItem.tsx
git commit -m "feat(github): add PullRequestItem component with status badges"
```

---

## Task 14: Pull Requests Tab Component

**Files:**
- Create: `src/components/pull-requests/PullRequestsTab.tsx`

**Step 1: Create tab component**

```typescript
import { RefreshCw, GitPullRequest } from 'lucide-react'
import { useEffect } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'
import { PullRequestItem } from './PullRequestItem'

export function PullRequestsTab() {
  const { repoName } = useRepositoryStore()
  const {
    isAvailable,
    selectedAccount,
    pullRequests,
    prFilter,
    prLoading,
    setPrFilter,
    loadPullRequests,
    refreshPullRequests
  } = useGitHubStore()

  useEffect(() => {
    if (isAvailable && selectedAccount && repoName) {
      loadPullRequests(repoName)
    }
  }, [isAvailable, selectedAccount, repoName, prFilter, loadPullRequests])

  if (!isAvailable) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        GH CLI not available
      </div>
    )
  }

  if (!selectedAccount) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        Select a GitHub account
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex gap-1">
          {(['all', 'created', 'review-requested'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setPrFilter(filter)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                prFilter === filter
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {filter === 'all' ? 'All' : filter === 'created' ? 'Mine' : 'Review'}
            </button>
          ))}
        </div>

        <button
          onClick={() => repoName && refreshPullRequests(repoName)}
          disabled={prLoading}
          className="p-1 hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${prLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {prLoading && pullRequests.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            Loading...
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm flex flex-col items-center gap-2">
            <GitPullRequest className="w-8 h-8 text-zinc-600" />
            No pull requests
          </div>
        ) : (
          pullRequests.map((pr) => (
            <PullRequestItem key={pr.number} pr={pr} />
          ))
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/pull-requests/PullRequestsTab.tsx
git commit -m "feat(github): add PullRequestsTab component with filters"
```

---

## Task 15: Update BranchItem with PR Indicator

**Files:**
- Modify: `src/components/branches/BranchItem.tsx`

**Step 1: Add PR indicator**

Import at top:
```typescript
import { GitPullRequest } from 'lucide-react'
import { useGitHubStore } from '../../stores/github'
```

Inside component, add:
```typescript
const { branchPrMap } = useGitHubStore()
const pr = branchPrMap[branch.name]
```

Add indicator in the JSX near branch name:
```typescript
{pr && (
  <span
    className={`ml-1 ${
      pr.isDraft ? 'text-zinc-500' :
      pr.state === 'open' ? 'text-green-500' :
      pr.state === 'merged' ? 'text-purple-500' :
      'text-zinc-500'
    }`}
    title={`PR #${pr.number}: ${pr.title}`}
  >
    <GitPullRequest className="w-3 h-3 inline" />
  </span>
)}
```

**Step 2: Commit**

```bash
git add src/components/branches/BranchItem.tsx
git commit -m "feat(github): add PR indicator to BranchItem"
```

---

## Task 16: Update Sidebar with PR Tab

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Add PR tab**

Import:
```typescript
import { GitPullRequest } from 'lucide-react'
import { PullRequestsTab } from '../pull-requests/PullRequestsTab'
```

Add "Pull Requests" as a new collapsible section alongside Branches, Staging, Commits:
```typescript
<Section
  title="Pull Requests"
  icon={<GitPullRequest className="w-4 h-4" />}
  isExpanded={expandedSections.includes('pull-requests')}
  onToggle={() => toggleSection('pull-requests')}
>
  <PullRequestsTab />
</Section>
```

**Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(github): add Pull Requests tab to sidebar"
```

---

## Task 17: Update Header with Account Selector

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: Add AccountSelector**

Import:
```typescript
import { AccountSelector } from '../header/AccountSelector'
```

Add component in header (after repo name, before diff view buttons):
```typescript
<AccountSelector />
```

**Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat(github): add AccountSelector to header"
```

---

## Task 18: Review Context Field Component

**Files:**
- Create: `src/components/review/ReviewContextField.tsx`

**Step 1: Create component**

```typescript
import { FileText, Hash, Loader } from 'lucide-react'
import { useState } from 'react'
import { useGitHubStore } from '../../stores/github'
import { useRepositoryStore } from '../../stores/repository'

interface Issue {
  number: number
  title: string
  body: string
}

interface ReviewContextFieldProps {
  onContextChange: (context: { type: 'issue' | 'manual'; issue?: Issue; text?: string } | null) => void
}

export function ReviewContextField({ onContextChange }: ReviewContextFieldProps) {
  const [mode, setMode] = useState<'issue' | 'manual'>('manual')
  const [issueNumber, setIssueNumber] = useState('')
  const [manualText, setManualText] = useState('')
  const [loadedIssue, setLoadedIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { isAvailable, selectedAccount } = useGitHubStore()
  const { repoName } = useRepositoryStore()

  const handleIssueBlur = async () => {
    if (!issueNumber || !isAvailable || !selectedAccount || !repoName) return

    const num = parseInt(issueNumber, 10)
    if (isNaN(num)) return

    setLoading(true)
    setError(null)

    try {
      const issue = await window.electron.github.issue.get({
        repo: repoName,
        number: num,
        account: selectedAccount
      })

      if (issue) {
        setLoadedIssue(issue)
        onContextChange({ type: 'issue', issue })
      } else {
        setError('Issue not found')
        setLoadedIssue(null)
        onContextChange(null)
      }
    } catch {
      setError('Failed to load issue')
      setLoadedIssue(null)
      onContextChange(null)
    } finally {
      setLoading(false)
    }
  }

  const handleManualChange = (text: string) => {
    setManualText(text)
    if (text.trim()) {
      onContextChange({ type: 'manual', text })
    } else {
      onContextChange(null)
    }
  }

  const handleModeChange = (newMode: 'issue' | 'manual') => {
    setMode(newMode)
    setLoadedIssue(null)
    setError(null)
    onContextChange(null)
  }

  return (
    <div className="border-t border-zinc-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-zinc-500">Task Context</span>
        <div className="flex gap-1">
          {isAvailable && selectedAccount && (
            <button
              onClick={() => handleModeChange('issue')}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                mode === 'issue' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Hash className="w-3 h-3 inline mr-1" />
              Issue
            </button>
          )}
          <button
            onClick={() => handleModeChange('manual')}
            className={`px-2 py-0.5 text-xs rounded transition-colors ${
              mode === 'manual' ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileText className="w-3 h-3 inline mr-1" />
            Text
          </button>
        </div>
      </div>

      {mode === 'issue' ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">#</span>
            <input
              type="number"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
              onBlur={handleIssueBlur}
              placeholder="Issue number"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600"
            />
            {loading && <Loader className="w-4 h-4 text-zinc-500 animate-spin" />}
          </div>
          {loadedIssue && (
            <div className="mt-2 p-2 bg-zinc-900 rounded text-xs">
              <span className="text-zinc-200">{loadedIssue.title}</span>
            </div>
          )}
          {error && (
            <div className="mt-1 text-xs text-red-500">{error}</div>
          )}
        </div>
      ) : (
        <textarea
          value={manualText}
          onChange={(e) => handleManualChange(e.target.value)}
          placeholder="Paste requirements, ticket description, or context..."
          className="w-full h-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 resize-none focus:outline-none focus:border-zinc-600"
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/review/ReviewContextField.tsx
git commit -m "feat(github): add ReviewContextField for issue/manual context"
```

---

## Task 19: Update Review Store with Context

**Files:**
- Modify: `src/stores/review.ts`

**Step 1: Add context state**

Add to interface:
```typescript
reviewContext: {
  type: 'issue' | 'manual'
  issue?: { number: number; title: string; body: string }
  text?: string
} | null

setReviewContext: (context: { type: 'issue' | 'manual'; issue?: { number: number; title: string; body: string }; text?: string } | null) => void
clearReviewContext: () => void
```

Add to store:
```typescript
reviewContext: null,

setReviewContext: (context) => set({ reviewContext: context }),
clearReviewContext: () => set({ reviewContext: null }),
```

**Step 2: Commit**

```bash
git add src/stores/review.ts
git commit -m "feat(github): add reviewContext to review store"
```

---

## Task 20: Update ReviewPanel with Context Field

**Files:**
- Modify: `src/components/review/ReviewPanel.tsx`

**Step 1: Add ReviewContextField**

Import:
```typescript
import { ReviewContextField } from './ReviewContextField'
import { useReviewStore } from '../../stores/review'
```

Add in the panel (before the review button or at top of review tab):
```typescript
const { setReviewContext } = useReviewStore()

<ReviewContextField onContextChange={setReviewContext} />
```

**Step 2: Commit**

```bash
git add src/components/review/ReviewPanel.tsx
git commit -m "feat(github): add ReviewContextField to ReviewPanel"
```

---

## Task 21: Update AI Provider to Include Context

**Files:**
- Modify: `electron/ai/provider-manager.ts`

**Step 1: Update review request to include context**

Modify the prompt building to include context when provided:

```typescript
let contextSection = ''
if (request.context) {
  if (request.context.type === 'issue' && request.context.issue) {
    contextSection = `
## Task Context
Issue #${request.context.issue.number}: ${request.context.issue.title}

${request.context.issue.body}

---

Review the code changes and evaluate if they properly address the issue requirements.

`
  } else if (request.context.type === 'manual' && request.context.text) {
    contextSection = `
## Task Context
${request.context.text}

---

Review the code changes and evaluate if they properly address these requirements.

`
  }
}

const fullPrompt = contextSection + basePrompt
```

**Step 2: Commit**

```bash
git add electron/ai/provider-manager.ts
git commit -m "feat(github): include task context in AI review prompt"
```

---

## Task 22: Initialize GitHub on Repository Load

**Files:**
- Modify: `src/stores/repository.ts`

**Step 1: Add GitHub initialization**

Import:
```typescript
import { useGitHubStore } from './github'
```

In `loadRepository` function, after successful load:
```typescript
const githubStore = useGitHubStore.getState()
await githubStore.checkAvailability()

if (githubStore.isAvailable) {
  await githubStore.loadAccounts()

  const repoKey = repoName
  const savedAccount = await window.electron.github.accounts.getForRepo(repoKey)

  if (savedAccount) {
    await githubStore.selectAccount(savedAccount)
  } else if (githubStore.accounts.length > 0) {
    githubStore.setNeedsAccountSelection(true)
  }
}
```

**Step 2: Commit**

```bash
git add src/stores/repository.ts
git commit -m "feat(github): initialize GitHub on repository load"
```

---

## Task 23: Add AccountSelectionModal to App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add modal**

Import:
```typescript
import { AccountSelectionModal } from './components/github/AccountSelectionModal'
```

Add component in render (at root level, alongside other modals):
```typescript
<AccountSelectionModal />
```

**Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat(github): add AccountSelectionModal to App"
```

---

## Task 24: Load Branch PR Map on Branch Load

**Files:**
- Modify: `src/stores/branches.ts`

**Step 1: Load PR map after branches**

Import:
```typescript
import { useGitHubStore } from './github'
import { useRepositoryStore } from './repository'
```

In `loadBranches`, after setting branches:
```typescript
const githubStore = useGitHubStore.getState()
const { repoName } = useRepositoryStore.getState()

if (githubStore.isAvailable && githubStore.selectedAccount && repoName) {
  const branchNames = branches.map(b => b.name)
  githubStore.loadBranchPrMap(repoName, branchNames)
}
```

**Step 2: Commit**

```bash
git add src/stores/branches.ts
git commit -m "feat(github): load branch PR map after loading branches"
```

---

## Task 25: Final Integration Test and Cleanup

**Step 1: Build and verify no TypeScript errors**

```bash
cd /home/otaviosoares/Documents/Pessoal/git-branch-viewer/.worktrees/github-integration
npm run build:electron
npm run build
```

**Step 2: Create final commit with all remaining adjustments**

```bash
git add -A
git commit -m "feat(github): complete GitHub CLI integration"
```

**Step 3: Test manually**

Run dev server and verify:
- Account selector appears in header
- Account selection modal appears for new repos
- Pull Requests tab shows in sidebar
- PR indicators appear on branches
- Review context field works
- Issue fetching works
- Manual context works

---

## Summary

This plan implements:
1. **Backend**: GitHub module with executor, auth, PR, and issue commands
2. **IPC**: Handlers for all GitHub operations with account persistence
3. **State**: Zustand store for GitHub data and account management
4. **UI**: AccountSelector, AccountSelectionModal, PullRequestsTab, PullRequestItem, ReviewContextField
5. **Integration**: PR indicators on branches, context in AI reviews

Total: 25 tasks with incremental commits for easy review and rollback.
