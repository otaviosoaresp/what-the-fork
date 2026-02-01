# Git Branch Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a desktop Git client focused on diff visualization and basic operations, similar to Fork but simpler.

**Architecture:** Electron app with React frontend, using Vite for builds. Git operations happen in main process via CLI spawning, communicated to renderer via IPC. State managed with Zustand, diffs rendered with Monaco Editor.

**Tech Stack:** Electron, React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, Monaco Editor, Zustand

---

## Task 1: Initialize Project with Electron + Vite + React

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`

**Step 1: Initialize npm project**

Run: `npm init -y`
Expected: Creates package.json

**Step 2: Install core dependencies**

Run:
```bash
npm install react react-dom zustand @monaco-editor/react
npm install -D typescript @types/react @types/react-dom @types/node vite @vitejs/plugin-react electron electron-builder concurrently wait-on
```
Expected: Dependencies installed

**Step 3: Create package.json with scripts**

Replace `package.json` with:

```json
{
  "name": "git-branch-viewer",
  "version": "0.1.0",
  "description": "Git desktop client for diff visualization",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
    "build": "tsc && vite build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.5.0",
    "@monaco-editor/react": "^4.6.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0",
    "concurrently": "^8.2.0",
    "wait-on": "^7.2.0"
  }
}
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 5: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist-electron"
  },
  "include": ["electron/**/*.ts", "vite.config.ts"]
}
```

**Step 6: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
```

**Step 7: Create electron-builder.json**

```json
{
  "appId": "com.gitbranchviewer.app",
  "productName": "Git Branch Viewer",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*"
  ],
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Development"
  },
  "mac": {
    "target": ["dmg"],
    "category": "public.app-category.developer-tools"
  },
  "win": {
    "target": ["nsis"]
  }
}
```

**Step 8: Commit**

```bash
git init
git add package.json tsconfig.json tsconfig.node.json vite.config.ts electron-builder.json
git commit -m "feat: initialize project with electron, vite, react config"
```

---

## Task 2: Create Electron Main Process

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

**Step 1: Create electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a'
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? null : result.filePaths[0]
})
```

**Step 2: Create electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  git: {
    execute: (repoPath: string, command: string, args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  }
}

contextBridge.exposeInMainWorld('electron', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  git: {
    execute: (repoPath: string, command: string, args: string[]) =>
      ipcRenderer.invoke('git:execute', repoPath, command, args)
  }
} as ElectronAPI)
```

**Step 3: Create src/types/electron.d.ts**

```typescript
import type { ElectronAPI } from '../../electron/preload'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
mkdir -p electron src/types
git add electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: add electron main and preload scripts"
```

---

## Task 3: Create Git Executor

**Files:**
- Create: `electron/git/executor.ts`
- Create: `electron/git/types.ts`

**Step 1: Create electron/git/types.ts**

```typescript
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
```

**Step 2: Create electron/git/executor.ts**

```typescript
import { spawn } from 'child_process'
import type { GitResult } from './types'

export function executeGit(repoPath: string, args: string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    const process = spawn('git', args, {
      cwd: repoPath,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    process.on('close', (exitCode) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? 1
      })
    })

    process.on('error', (error) => {
      resolve({
        stdout: '',
        stderr: error.message,
        exitCode: 1
      })
    })
  })
}

export async function isGitRepository(path: string): Promise<boolean> {
  const result = await executeGit(path, ['rev-parse', '--git-dir'])
  return result.exitCode === 0
}
```

**Step 3: Commit**

```bash
mkdir -p electron/git
git add electron/git/types.ts electron/git/executor.ts
git commit -m "feat: add git executor and type definitions"
```

---

## Task 4: Create Git Parsers

**Files:**
- Create: `electron/git/parser.ts`

**Step 1: Create electron/git/parser.ts**

```typescript
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
```

**Step 2: Commit**

```bash
git add electron/git/parser.ts
git commit -m "feat: add git output parsers"
```

---

## Task 5: Create Git Command Handlers

**Files:**
- Create: `electron/git/commands/branch.ts`
- Create: `electron/git/commands/commit.ts`
- Create: `electron/git/commands/diff.ts`
- Create: `electron/git/commands/remote.ts`
- Create: `electron/git/commands/status.ts`
- Create: `electron/git/commands/index.ts`

**Step 1: Create electron/git/commands/branch.ts**

```typescript
import { executeGit } from '../executor'
import { parseBranches } from '../parser'
import type { Branch } from '../types'

export async function listBranches(repoPath: string): Promise<Branch[]> {
  const result = await executeGit(repoPath, ['branch', '-a'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseBranches(result.stdout)
}

export async function getCurrentBranch(repoPath: string): Promise<string> {
  const result = await executeGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return result.stdout
}

export async function checkoutBranch(repoPath: string, branchName: string): Promise<void> {
  const result = await executeGit(repoPath, ['checkout', branchName])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function createBranch(repoPath: string, branchName: string, startPoint?: string): Promise<void> {
  const args = ['checkout', '-b', branchName]
  if (startPoint) args.push(startPoint)
  const result = await executeGit(repoPath, args)
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function deleteBranch(repoPath: string, branchName: string, force: boolean = false): Promise<void> {
  const flag = force ? '-D' : '-d'
  const result = await executeGit(repoPath, ['branch', flag, branchName])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}
```

**Step 2: Create electron/git/commands/status.ts**

```typescript
import { executeGit } from '../executor'
import { parseStatus } from '../parser'
import type { FileStatus } from '../types'

export async function getStatus(repoPath: string): Promise<FileStatus[]> {
  const result = await executeGit(repoPath, ['status', '--porcelain'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseStatus(result.stdout)
}

export async function stageFile(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['add', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function stageAll(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['add', '-A'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function unstageFile(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['reset', 'HEAD', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function unstageAll(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['reset', 'HEAD'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function discardChanges(repoPath: string, filePath: string): Promise<void> {
  const result = await executeGit(repoPath, ['checkout', '--', filePath])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}
```

**Step 3: Create electron/git/commands/commit.ts**

```typescript
import { executeGit } from '../executor'
import { parseLog } from '../parser'
import type { Commit } from '../types'

export async function createCommit(repoPath: string, message: string): Promise<void> {
  const result = await executeGit(repoPath, ['commit', '-m', message])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function getLog(repoPath: string, count: number = 50): Promise<Commit[]> {
  const format = '%H|%s|%an|%ad'
  const result = await executeGit(repoPath, [
    'log',
    `--format=${format}`,
    '--date=short',
    `-n${count}`
  ])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseLog(result.stdout)
}

export async function getCommitDiff(repoPath: string, commitHash: string): Promise<string> {
  const result = await executeGit(repoPath, ['show', commitHash, '--format='])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return result.stdout
}
```

**Step 4: Create electron/git/commands/diff.ts**

```typescript
import { executeGit } from '../executor'
import { parseDiff } from '../parser'
import type { DiffFile } from '../types'

export async function getDiffBetweenBranches(
  repoPath: string,
  baseBranch: string,
  compareBranch: string
): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff', `${baseBranch}...${compareBranch}`])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getStagedDiff(repoPath: string): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff', '--staged'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getUnstagedDiff(repoPath: string): Promise<DiffFile[]> {
  const result = await executeGit(repoPath, ['diff'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}

export async function getFileDiff(repoPath: string, filePath: string, staged: boolean): Promise<DiffFile[]> {
  const args = staged ? ['diff', '--staged', filePath] : ['diff', filePath]
  const result = await executeGit(repoPath, args)
  if (result.exitCode !== 0) throw new Error(result.stderr)
  return parseDiff(result.stdout)
}
```

**Step 5: Create electron/git/commands/remote.ts**

```typescript
import { executeGit } from '../executor'
import { parseRemoteStatus } from '../parser'
import type { RemoteStatus } from '../types'

export async function fetch(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['fetch', '--all'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function pull(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['pull'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function push(repoPath: string): Promise<void> {
  const result = await executeGit(repoPath, ['push'])
  if (result.exitCode !== 0) throw new Error(result.stderr)
}

export async function getRemoteStatus(repoPath: string): Promise<RemoteStatus> {
  const result = await executeGit(repoPath, [
    'rev-list',
    '--left-right',
    '--count',
    'HEAD...@{upstream}'
  ])
  if (result.exitCode !== 0) return { ahead: 0, behind: 0 }
  return parseRemoteStatus(result.stdout)
}
```

**Step 6: Create electron/git/commands/index.ts**

```typescript
export * from './branch'
export * from './commit'
export * from './diff'
export * from './remote'
export * from './status'
```

**Step 7: Commit**

```bash
mkdir -p electron/git/commands
git add electron/git/commands/
git commit -m "feat: add git command handlers for branches, commits, diffs, remote, status"
```

---

## Task 6: Wire IPC Handlers

**Files:**
- Modify: `electron/main.ts`
- Create: `electron/git/ipc-handlers.ts`

**Step 1: Create electron/git/ipc-handlers.ts**

```typescript
import { ipcMain } from 'electron'
import { isGitRepository } from './executor'
import * as commands from './commands'

export function registerGitHandlers(): void {
  ipcMain.handle('git:isRepository', async (_event, path: string) => {
    return isGitRepository(path)
  })

  ipcMain.handle('git:branches:list', async (_event, repoPath: string) => {
    return commands.listBranches(repoPath)
  })

  ipcMain.handle('git:branches:current', async (_event, repoPath: string) => {
    return commands.getCurrentBranch(repoPath)
  })

  ipcMain.handle('git:branches:checkout', async (_event, repoPath: string, branchName: string) => {
    return commands.checkoutBranch(repoPath, branchName)
  })

  ipcMain.handle('git:branches:create', async (_event, repoPath: string, branchName: string, startPoint?: string) => {
    return commands.createBranch(repoPath, branchName, startPoint)
  })

  ipcMain.handle('git:branches:delete', async (_event, repoPath: string, branchName: string, force: boolean) => {
    return commands.deleteBranch(repoPath, branchName, force)
  })

  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    return commands.getStatus(repoPath)
  })

  ipcMain.handle('git:stage', async (_event, repoPath: string, filePath: string) => {
    return commands.stageFile(repoPath, filePath)
  })

  ipcMain.handle('git:stageAll', async (_event, repoPath: string) => {
    return commands.stageAll(repoPath)
  })

  ipcMain.handle('git:unstage', async (_event, repoPath: string, filePath: string) => {
    return commands.unstageFile(repoPath, filePath)
  })

  ipcMain.handle('git:unstageAll', async (_event, repoPath: string) => {
    return commands.unstageAll(repoPath)
  })

  ipcMain.handle('git:discard', async (_event, repoPath: string, filePath: string) => {
    return commands.discardChanges(repoPath, filePath)
  })

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
    return commands.createCommit(repoPath, message)
  })

  ipcMain.handle('git:log', async (_event, repoPath: string, count?: number) => {
    return commands.getLog(repoPath, count)
  })

  ipcMain.handle('git:commitDiff', async (_event, repoPath: string, commitHash: string) => {
    return commands.getCommitDiff(repoPath, commitHash)
  })

  ipcMain.handle('git:diff:branches', async (_event, repoPath: string, baseBranch: string, compareBranch: string) => {
    return commands.getDiffBetweenBranches(repoPath, baseBranch, compareBranch)
  })

  ipcMain.handle('git:diff:staged', async (_event, repoPath: string) => {
    return commands.getStagedDiff(repoPath)
  })

  ipcMain.handle('git:diff:unstaged', async (_event, repoPath: string) => {
    return commands.getUnstagedDiff(repoPath)
  })

  ipcMain.handle('git:diff:file', async (_event, repoPath: string, filePath: string, staged: boolean) => {
    return commands.getFileDiff(repoPath, filePath, staged)
  })

  ipcMain.handle('git:fetch', async (_event, repoPath: string) => {
    return commands.fetch(repoPath)
  })

  ipcMain.handle('git:pull', async (_event, repoPath: string) => {
    return commands.pull(repoPath)
  })

  ipcMain.handle('git:push', async (_event, repoPath: string) => {
    return commands.push(repoPath)
  })

  ipcMain.handle('git:remoteStatus', async (_event, repoPath: string) => {
    return commands.getRemoteStatus(repoPath)
  })
}
```

**Step 2: Update electron/main.ts to register handlers**

Replace `electron/main.ts`:

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { registerGitHandlers } from './git/ipc-handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a'
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerGitHandlers()

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
```

**Step 3: Update electron/preload.ts with complete API**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  git: {
    isRepository: (path: string) => ipcRenderer.invoke('git:isRepository', path),
    branches: {
      list: (repoPath: string) => ipcRenderer.invoke('git:branches:list', repoPath),
      current: (repoPath: string) => ipcRenderer.invoke('git:branches:current', repoPath),
      checkout: (repoPath: string, branchName: string) => ipcRenderer.invoke('git:branches:checkout', repoPath, branchName),
      create: (repoPath: string, branchName: string, startPoint?: string) => ipcRenderer.invoke('git:branches:create', repoPath, branchName, startPoint),
      delete: (repoPath: string, branchName: string, force?: boolean) => ipcRenderer.invoke('git:branches:delete', repoPath, branchName, force ?? false)
    },
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    stage: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:stage', repoPath, filePath),
    stageAll: (repoPath: string) => ipcRenderer.invoke('git:stageAll', repoPath),
    unstage: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:unstage', repoPath, filePath),
    unstageAll: (repoPath: string) => ipcRenderer.invoke('git:unstageAll', repoPath),
    discard: (repoPath: string, filePath: string) => ipcRenderer.invoke('git:discard', repoPath, filePath),
    commit: (repoPath: string, message: string) => ipcRenderer.invoke('git:commit', repoPath, message),
    log: (repoPath: string, count?: number) => ipcRenderer.invoke('git:log', repoPath, count),
    commitDiff: (repoPath: string, commitHash: string) => ipcRenderer.invoke('git:commitDiff', repoPath, commitHash),
    diff: {
      branches: (repoPath: string, baseBranch: string, compareBranch: string) => ipcRenderer.invoke('git:diff:branches', repoPath, baseBranch, compareBranch),
      staged: (repoPath: string) => ipcRenderer.invoke('git:diff:staged', repoPath),
      unstaged: (repoPath: string) => ipcRenderer.invoke('git:diff:unstaged', repoPath),
      file: (repoPath: string, filePath: string, staged: boolean) => ipcRenderer.invoke('git:diff:file', repoPath, filePath, staged)
    },
    fetch: (repoPath: string) => ipcRenderer.invoke('git:fetch', repoPath),
    pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
    push: (repoPath: string) => ipcRenderer.invoke('git:push', repoPath),
    remoteStatus: (repoPath: string) => ipcRenderer.invoke('git:remoteStatus', repoPath)
  }
})
```

**Step 4: Update src/types/electron.d.ts**

```typescript
import type { Branch, Commit, FileStatus, DiffFile, RemoteStatus } from '../../electron/git/types'

export interface ElectronAPI {
  openDirectory: () => Promise<string | null>
  git: {
    isRepository: (path: string) => Promise<boolean>
    branches: {
      list: (repoPath: string) => Promise<Branch[]>
      current: (repoPath: string) => Promise<string>
      checkout: (repoPath: string, branchName: string) => Promise<void>
      create: (repoPath: string, branchName: string, startPoint?: string) => Promise<void>
      delete: (repoPath: string, branchName: string, force?: boolean) => Promise<void>
    }
    status: (repoPath: string) => Promise<FileStatus[]>
    stage: (repoPath: string, filePath: string) => Promise<void>
    stageAll: (repoPath: string) => Promise<void>
    unstage: (repoPath: string, filePath: string) => Promise<void>
    unstageAll: (repoPath: string) => Promise<void>
    discard: (repoPath: string, filePath: string) => Promise<void>
    commit: (repoPath: string, message: string) => Promise<void>
    log: (repoPath: string, count?: number) => Promise<Commit[]>
    commitDiff: (repoPath: string, commitHash: string) => Promise<string>
    diff: {
      branches: (repoPath: string, baseBranch: string, compareBranch: string) => Promise<DiffFile[]>
      staged: (repoPath: string) => Promise<DiffFile[]>
      unstaged: (repoPath: string) => Promise<DiffFile[]>
      file: (repoPath: string, filePath: string, staged: boolean) => Promise<DiffFile[]>
    }
    fetch: (repoPath: string) => Promise<void>
    pull: (repoPath: string) => Promise<void>
    push: (repoPath: string) => Promise<void>
    remoteStatus: (repoPath: string) => Promise<RemoteStatus>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

export {}
```

**Step 5: Commit**

```bash
git add electron/git/ipc-handlers.ts electron/main.ts electron/preload.ts src/types/electron.d.ts
git commit -m "feat: wire IPC handlers for all git operations"
```

---

## Task 7: Setup Tailwind CSS

**Files:**
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/index.css`

**Step 1: Install Tailwind**

Run:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        muted: '#334155',
        'muted-foreground': '#94a3b8',
        border: 'rgba(255, 255, 255, 0.08)',
        'border-subtle': 'rgba(255, 255, 255, 0.05)',
        accent: '#3b82f6',
        'accent-foreground': '#ffffff',
        destructive: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
      }
    },
  },
  plugins: [],
}
```

**Step 3: Ensure postcss.config.js exists**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 4: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-muted rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground;
  }
}

@layer components {
  .btn {
    @apply inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent;
    @apply disabled:pointer-events-none disabled:opacity-50;
    @apply px-4 py-2;
  }

  .btn-primary {
    @apply bg-accent text-accent-foreground hover:bg-accent/90;
  }

  .btn-secondary {
    @apply bg-muted text-foreground hover:bg-muted/80;
  }

  .btn-ghost {
    @apply hover:bg-muted;
  }

  .btn-icon {
    @apply h-8 w-8 p-0;
  }

  .input {
    @apply flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm;
    @apply placeholder:text-muted-foreground;
    @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent;
    @apply disabled:cursor-not-allowed disabled:opacity-50;
  }
}
```

**Step 5: Commit**

```bash
git add tailwind.config.js postcss.config.js src/index.css
git commit -m "feat: setup tailwind css with dark theme tokens"
```

---

## Task 8: Create React Entry Point and Base Layout

**Files:**
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/lib/utils.ts`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:;">
    <title>Git Branch Viewer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Create src/main.tsx**

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

**Step 3: Create src/lib/utils.ts**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

**Step 4: Install clsx and tailwind-merge**

Run: `npm install clsx tailwind-merge`

**Step 5: Create src/App.tsx**

```typescript
import { useEffect } from 'react'
import { useRepositoryStore } from './stores/repository'
import { Sidebar } from './components/layout/Sidebar'
import { MainPanel } from './components/layout/MainPanel'
import { Header } from './components/layout/Header'
import { WelcomeScreen } from './components/WelcomeScreen'

export default function App(): JSX.Element {
  const { repoPath, loadRepository } = useRepositoryStore()

  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      const items = e.dataTransfer?.items
      if (!items) return

      for (const item of items) {
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry()
          if (entry?.isDirectory) {
            const path = (item.getAsFile() as File & { path?: string })?.path
            if (path) {
              await loadRepository(path)
            }
          }
        }
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    document.addEventListener('drop', handleDrop)
    document.addEventListener('dragover', handleDragOver)

    return () => {
      document.removeEventListener('drop', handleDrop)
      document.removeEventListener('dragover', handleDragOver)
    }
  }, [loadRepository])

  if (!repoPath) {
    return <WelcomeScreen />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainPanel />
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
mkdir -p src/lib
git add index.html src/main.tsx src/App.tsx src/lib/utils.ts
git commit -m "feat: create react entry point and base app structure"
```

---

## Task 9: Create Zustand Stores

**Files:**
- Create: `src/stores/repository.ts`
- Create: `src/stores/branches.ts`
- Create: `src/stores/diff.ts`
- Create: `src/stores/ui.ts`

**Step 1: Create src/stores/repository.ts**

```typescript
import { create } from 'zustand'
import type { FileStatus, RemoteStatus } from '../../electron/git/types'

interface RepositoryState {
  repoPath: string | null
  repoName: string | null
  currentBranch: string | null
  status: FileStatus[]
  remoteStatus: RemoteStatus
  isLoading: boolean
  error: string | null

  loadRepository: (path: string) => Promise<void>
  closeRepository: () => void
  refreshStatus: () => Promise<void>
  refreshRemoteStatus: () => Promise<void>
  stageFile: (filePath: string) => Promise<void>
  stageAll: () => Promise<void>
  unstageFile: (filePath: string) => Promise<void>
  unstageAll: () => Promise<void>
  discardChanges: (filePath: string) => Promise<void>
  commit: (message: string) => Promise<void>
}

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
  repoPath: null,
  repoName: null,
  currentBranch: null,
  status: [],
  remoteStatus: { ahead: 0, behind: 0 },
  isLoading: false,
  error: null,

  loadRepository: async (path: string) => {
    set({ isLoading: true, error: null })
    try {
      const isRepo = await window.electron.git.isRepository(path)
      if (!isRepo) {
        throw new Error('Not a git repository')
      }

      const currentBranch = await window.electron.git.branches.current(path)
      const status = await window.electron.git.status(path)
      const remoteStatus = await window.electron.git.remoteStatus(path)
      const repoName = path.split('/').pop() ?? path

      set({
        repoPath: path,
        repoName,
        currentBranch,
        status,
        remoteStatus,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load repository',
        isLoading: false
      })
    }
  },

  closeRepository: () => {
    set({
      repoPath: null,
      repoName: null,
      currentBranch: null,
      status: [],
      remoteStatus: { ahead: 0, behind: 0 },
      error: null
    })
  },

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return

    try {
      const status = await window.electron.git.status(repoPath)
      const currentBranch = await window.electron.git.branches.current(repoPath)
      set({ status, currentBranch })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to refresh status' })
    }
  },

  refreshRemoteStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return

    try {
      const remoteStatus = await window.electron.git.remoteStatus(repoPath)
      set({ remoteStatus })
    } catch {
      // Ignore errors for remote status
    }
  },

  stageFile: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.stage(repoPath, filePath)
    await refreshStatus()
  },

  stageAll: async () => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.stageAll(repoPath)
    await refreshStatus()
  },

  unstageFile: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.unstage(repoPath, filePath)
    await refreshStatus()
  },

  unstageAll: async () => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.unstageAll(repoPath)
    await refreshStatus()
  },

  discardChanges: async (filePath: string) => {
    const { repoPath, refreshStatus } = get()
    if (!repoPath) return

    await window.electron.git.discard(repoPath, filePath)
    await refreshStatus()
  },

  commit: async (message: string) => {
    const { repoPath, refreshStatus, refreshRemoteStatus } = get()
    if (!repoPath) return

    await window.electron.git.commit(repoPath, message)
    await refreshStatus()
    await refreshRemoteStatus()
  }
}))
```

**Step 2: Create src/stores/branches.ts**

```typescript
import { create } from 'zustand'
import type { Branch } from '../../electron/git/types'
import { useRepositoryStore } from './repository'

interface BranchesState {
  branches: Branch[]
  isLoading: boolean
  error: string | null

  loadBranches: () => Promise<void>
  checkout: (branchName: string) => Promise<void>
  createBranch: (branchName: string, startPoint?: string) => Promise<void>
  deleteBranch: (branchName: string, force?: boolean) => Promise<void>
}

export const useBranchesStore = create<BranchesState>((set, get) => ({
  branches: [],
  isLoading: false,
  error: null,

  loadBranches: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null })
    try {
      const branches = await window.electron.git.branches.list(repoPath)
      set({ branches, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load branches',
        isLoading: false
      })
    }
  },

  checkout: async (branchName: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    try {
      await window.electron.git.branches.checkout(repoPath, branchName)
      await get().loadBranches()
      await useRepositoryStore.getState().refreshStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to checkout branch' })
    }
  },

  createBranch: async (branchName: string, startPoint?: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    try {
      await window.electron.git.branches.create(repoPath, branchName, startPoint)
      await get().loadBranches()
      await useRepositoryStore.getState().refreshStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create branch' })
    }
  },

  deleteBranch: async (branchName: string, force?: boolean) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    try {
      await window.electron.git.branches.delete(repoPath, branchName, force)
      await get().loadBranches()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete branch' })
    }
  }
}))
```

**Step 3: Create src/stores/diff.ts**

```typescript
import { create } from 'zustand'
import type { DiffFile, Commit } from '../../electron/git/types'
import { useRepositoryStore } from './repository'
import { parseDiff } from '../../electron/git/parser'

type DiffMode = 'branches' | 'staged' | 'unstaged' | 'commit'

interface DiffState {
  mode: DiffMode
  baseBranch: string | null
  compareBranch: string | null
  selectedCommit: Commit | null
  files: DiffFile[]
  selectedFile: DiffFile | null
  isLoading: boolean
  error: string | null

  setMode: (mode: DiffMode) => void
  compareBranches: (baseBranch: string, compareBranch: string) => Promise<void>
  loadStagedDiff: () => Promise<void>
  loadUnstagedDiff: () => Promise<void>
  loadCommitDiff: (commit: Commit) => Promise<void>
  selectFile: (file: DiffFile | null) => void
  clearDiff: () => void
}

export const useDiffStore = create<DiffState>((set) => ({
  mode: 'branches',
  baseBranch: null,
  compareBranch: null,
  selectedCommit: null,
  files: [],
  selectedFile: null,
  isLoading: false,
  error: null,

  setMode: (mode: DiffMode) => {
    set({ mode, files: [], selectedFile: null, selectedCommit: null })
  },

  compareBranches: async (baseBranch: string, compareBranch: string) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'branches', baseBranch, compareBranch })
    try {
      const files = await window.electron.git.diff.branches(repoPath, baseBranch, compareBranch)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to compare branches',
        isLoading: false
      })
    }
  },

  loadStagedDiff: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'staged' })
    try {
      const files = await window.electron.git.diff.staged(repoPath)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load staged diff',
        isLoading: false
      })
    }
  },

  loadUnstagedDiff: async () => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'unstaged' })
    try {
      const files = await window.electron.git.diff.unstaged(repoPath)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load unstaged diff',
        isLoading: false
      })
    }
  },

  loadCommitDiff: async (commit: Commit) => {
    const repoPath = useRepositoryStore.getState().repoPath
    if (!repoPath) return

    set({ isLoading: true, error: null, mode: 'commit', selectedCommit: commit })
    try {
      const rawDiff = await window.electron.git.commitDiff(repoPath, commit.hash)
      const files = parseDiff(rawDiff)
      set({ files, selectedFile: files[0] ?? null, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load commit diff',
        isLoading: false
      })
    }
  },

  selectFile: (file: DiffFile | null) => {
    set({ selectedFile: file })
  },

  clearDiff: () => {
    set({
      files: [],
      selectedFile: null,
      baseBranch: null,
      compareBranch: null,
      selectedCommit: null
    })
  }
}))
```

**Step 4: Create src/stores/ui.ts**

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type DiffViewMode = 'split' | 'unified'
type SidebarSection = 'branches' | 'staging' | 'commits'

interface UIState {
  diffViewMode: DiffViewMode
  sidebarWidth: number
  expandedSections: SidebarSection[]
  recentRepositories: string[]

  setDiffViewMode: (mode: DiffViewMode) => void
  setSidebarWidth: (width: number) => void
  toggleSection: (section: SidebarSection) => void
  addRecentRepository: (path: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      diffViewMode: 'split',
      sidebarWidth: 280,
      expandedSections: ['branches', 'staging', 'commits'],
      recentRepositories: [],

      setDiffViewMode: (mode: DiffViewMode) => {
        set({ diffViewMode: mode })
      },

      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: Math.max(200, Math.min(400, width)) })
      },

      toggleSection: (section: SidebarSection) => {
        const { expandedSections } = get()
        const isExpanded = expandedSections.includes(section)
        set({
          expandedSections: isExpanded
            ? expandedSections.filter(s => s !== section)
            : [...expandedSections, section]
        })
      },

      addRecentRepository: (path: string) => {
        const { recentRepositories } = get()
        const filtered = recentRepositories.filter(p => p !== path)
        set({
          recentRepositories: [path, ...filtered].slice(0, 10)
        })
      }
    }),
    {
      name: 'git-branch-viewer-ui'
    }
  )
)
```

**Step 5: Commit**

```bash
mkdir -p src/stores
git add src/stores/
git commit -m "feat: create zustand stores for repository, branches, diff, and ui state"
```

---

## Task 10: Create Layout Components

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/MainPanel.tsx`
- Create: `src/components/WelcomeScreen.tsx`

**Step 1: Create src/components/layout/Header.tsx**

```typescript
import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'
import { cn } from '@/lib/utils'

export function Header(): JSX.Element {
  const { repoName, remoteStatus, repoPath } = useRepositoryStore()
  const { diffViewMode, setDiffViewMode } = useUIStore()

  const handleFetch = async () => {
    if (!repoPath) return
    await window.electron.git.fetch(repoPath)
    await useRepositoryStore.getState().refreshRemoteStatus()
  }

  const handlePull = async () => {
    if (!repoPath) return
    await window.electron.git.pull(repoPath)
    await useRepositoryStore.getState().refreshStatus()
    await useRepositoryStore.getState().refreshRemoteStatus()
  }

  const handlePush = async () => {
    if (!repoPath) return
    await window.electron.git.push(repoPath)
    await useRepositoryStore.getState().refreshRemoteStatus()
  }

  const handleOpenRepo = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      await useRepositoryStore.getState().loadRepository(path)
    }
  }

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <span className="font-semibold text-sm">{repoName}</span>
        </div>
        {(remoteStatus.ahead > 0 || remoteStatus.behind > 0) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {remoteStatus.ahead > 0 && <span className="text-success">{remoteStatus.ahead}</span>}
            {remoteStatus.behind > 0 && <span className="text-warning">{remoteStatus.behind}</span>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setDiffViewMode('split')}
            className={cn(
              'px-3 py-1.5 text-xs transition-colors',
              diffViewMode === 'split' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Split
          </button>
          <button
            onClick={() => setDiffViewMode('unified')}
            className={cn(
              'px-3 py-1.5 text-xs transition-colors',
              diffViewMode === 'unified' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Unified
          </button>
        </div>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleFetch} className="btn btn-ghost btn-icon" title="Fetch">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
          </svg>
        </button>
        <button onClick={handlePull} className="btn btn-ghost btn-icon" title="Pull">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
        <button onClick={handlePush} className="btn btn-ghost btn-icon" title="Push">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>

        <div className="w-px h-6 bg-border" />

        <button onClick={handleOpenRepo} className="btn btn-ghost btn-icon" title="Open Repository">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Create src/components/layout/Sidebar.tsx**

```typescript
import { useEffect } from 'react'
import { useUIStore } from '@/stores/ui'
import { BranchList } from '@/components/branches/BranchList'
import { StagingArea } from '@/components/staging/StagingArea'
import { CommitList } from '@/components/commits/CommitList'
import { cn } from '@/lib/utils'

interface SectionProps {
  title: string
  section: 'branches' | 'staging' | 'commits'
  children: React.ReactNode
}

function Section({ title, section, children }: SectionProps): JSX.Element {
  const { expandedSections, toggleSection } = useUIStore()
  const isExpanded = expandedSections.includes(section)

  return (
    <div className="border-b border-border">
      <button
        onClick={() => toggleSection(section)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground uppercase tracking-wider"
      >
        {title}
        <svg
          className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {isExpanded && <div className="pb-2">{children}</div>}
    </div>
  )
}

export function Sidebar(): JSX.Element {
  const { sidebarWidth } = useUIStore()

  return (
    <aside
      className="h-full border-r border-border overflow-hidden flex flex-col"
      style={{ width: sidebarWidth }}
    >
      <div className="flex-1 overflow-y-auto">
        <Section title="Branches" section="branches">
          <BranchList />
        </Section>
        <Section title="Staging" section="staging">
          <StagingArea />
        </Section>
        <Section title="Commits" section="commits">
          <CommitList />
        </Section>
      </div>
    </aside>
  )
}
```

**Step 3: Create src/components/layout/MainPanel.tsx**

```typescript
import { useDiffStore } from '@/stores/diff'
import { useUIStore } from '@/stores/ui'
import { DiffView } from '@/components/diff/DiffView'
import { FileList } from '@/components/diff/FileList'

export function MainPanel(): JSX.Element {
  const { files, selectedFile, mode } = useDiffStore()
  const { diffViewMode } = useUIStore()

  if (files.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6M12 9v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">Select branches to compare or view staged/unstaged changes</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        {selectedFile && <DiffView file={selectedFile} viewMode={diffViewMode} />}
      </div>
      <FileList files={files} selectedFile={selectedFile} />
    </main>
  )
}
```

**Step 4: Create src/components/WelcomeScreen.tsx**

```typescript
import { useRepositoryStore } from '@/stores/repository'
import { useUIStore } from '@/stores/ui'

export function WelcomeScreen(): JSX.Element {
  const { loadRepository, isLoading, error } = useRepositoryStore()
  const { recentRepositories, addRecentRepository } = useUIStore()

  const handleOpenRepo = async () => {
    const path = await window.electron.openDirectory()
    if (path) {
      await loadRepository(path)
      addRecentRepository(path)
    }
  }

  const handleOpenRecent = async (path: string) => {
    await loadRepository(path)
    addRecentRepository(path)
  }

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-8">
          <svg className="w-16 h-16 mx-auto mb-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
          </svg>
          <h1 className="text-2xl font-semibold mb-2">Git Branch Viewer</h1>
          <p className="text-muted-foreground text-sm">View diffs and manage your git repositories</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleOpenRepo}
          disabled={isLoading}
          className="btn btn-primary w-full mb-6"
        >
          {isLoading ? 'Opening...' : 'Open Repository'}
        </button>

        {recentRepositories.length > 0 && (
          <div>
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Recent Repositories
            </h2>
            <div className="space-y-1">
              {recentRepositories.map(path => (
                <button
                  key={path}
                  onClick={() => handleOpenRecent(path)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors truncate"
                >
                  {path}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-8">
          Or drag and drop a folder here
        </p>
      </div>
    </div>
  )
}
```

**Step 5: Commit**

```bash
mkdir -p src/components/layout
git add src/components/layout/ src/components/WelcomeScreen.tsx
git commit -m "feat: create layout components - header, sidebar, main panel, welcome screen"
```

---

## Task 11: Create Branch Components

**Files:**
- Create: `src/components/branches/BranchList.tsx`
- Create: `src/components/branches/BranchItem.tsx`
- Create: `src/components/branches/CreateBranchDialog.tsx`

**Step 1: Create src/components/branches/BranchItem.tsx**

```typescript
import { useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { useRepositoryStore } from '@/stores/repository'
import { cn } from '@/lib/utils'
import type { Branch } from '../../../electron/git/types'

interface BranchItemProps {
  branch: Branch
  isBase?: boolean
  onSetBase?: () => void
}

export function BranchItem({ branch, isBase, onSetBase }: BranchItemProps): JSX.Element {
  const { checkout, deleteBranch } = useBranchesStore()
  const { compareBranches, baseBranch } = useDiffStore()
  const { currentBranch } = useRepositoryStore()
  const [showActions, setShowActions] = useState(false)

  const isCurrent = branch.name === currentBranch

  const handleClick = () => {
    if (baseBranch && baseBranch !== branch.name) {
      compareBranches(baseBranch, branch.name)
    } else if (onSetBase) {
      onSetBase()
    }
  }

  const handleCheckout = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await checkout(branch.name)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete branch "${branch.name}"?`)) {
      await deleteBranch(branch.name)
    }
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors',
        isBase ? 'bg-accent/10 text-accent' : 'hover:bg-muted',
        isCurrent && 'font-medium'
      )}
      onClick={handleClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isCurrent && (
        <svg className="w-3 h-3 text-success flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="6" />
        </svg>
      )}
      {branch.remote && (
        <svg className="w-3 h-3 text-muted-foreground flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
        </svg>
      )}
      <span className="truncate flex-1">{branch.name}</span>
      {showActions && !isCurrent && (
        <div className="flex items-center gap-1">
          {!branch.remote && (
            <button
              onClick={handleCheckout}
              className="p-1 rounded hover:bg-background"
              title="Checkout"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
              </svg>
            </button>
          )}
          {!branch.remote && !isCurrent && (
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-background text-destructive"
              title="Delete"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create src/components/branches/CreateBranchDialog.tsx**

```typescript
import { useState } from 'react'
import { useBranchesStore } from '@/stores/branches'

interface CreateBranchDialogProps {
  onClose: () => void
}

export function CreateBranchDialog({ onClose }: CreateBranchDialogProps): JSX.Element {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { createBranch } = useBranchesStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsCreating(true)
    try {
      await createBranch(name.trim())
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background border border-border rounded-lg p-4 w-80" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-medium mb-4">Create Branch</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Branch name"
            className="input w-full mb-4"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isCreating} className="btn btn-primary">
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 3: Create src/components/branches/BranchList.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useBranchesStore } from '@/stores/branches'
import { useDiffStore } from '@/stores/diff'
import { BranchItem } from './BranchItem'
import { CreateBranchDialog } from './CreateBranchDialog'

export function BranchList(): JSX.Element {
  const { branches, loadBranches, isLoading } = useBranchesStore()
  const { baseBranch, setMode, clearDiff } = useDiffStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedBase, setSelectedBase] = useState<string | null>(null)

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const localBranches = branches.filter(b => !b.remote)
  const remoteBranches = branches.filter(b => b.remote)

  const handleSetBase = (branchName: string) => {
    if (selectedBase === branchName) {
      setSelectedBase(null)
      clearDiff()
    } else {
      setSelectedBase(branchName)
      setMode('branches')
    }
  }

  if (isLoading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div>
      <div className="px-3 pb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selectedBase ? `Compare with: ${selectedBase}` : 'Click to set base branch'}
        </span>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="p-1 rounded hover:bg-muted"
          title="Create branch"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="space-y-0.5">
        {localBranches.map(branch => (
          <BranchItem
            key={branch.name}
            branch={branch}
            isBase={selectedBase === branch.name}
            onSetBase={() => handleSetBase(branch.name)}
          />
        ))}
      </div>

      {remoteBranches.length > 0 && (
        <>
          <div className="px-3 py-2 text-xs text-muted-foreground">Remote</div>
          <div className="space-y-0.5">
            {remoteBranches.map(branch => (
              <BranchItem
                key={branch.name}
                branch={branch}
                isBase={selectedBase === branch.name}
                onSetBase={() => handleSetBase(branch.name)}
              />
            ))}
          </div>
        </>
      )}

      {showCreateDialog && <CreateBranchDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  )
}
```

**Step 4: Commit**

```bash
mkdir -p src/components/branches
git add src/components/branches/
git commit -m "feat: create branch list components with create/delete/checkout functionality"
```

---

## Task 12: Create Staging Components

**Files:**
- Create: `src/components/staging/StagingArea.tsx`
- Create: `src/components/staging/FileItem.tsx`
- Create: `src/components/staging/CommitForm.tsx`

**Step 1: Create src/components/staging/FileItem.tsx**

```typescript
import { useRepositoryStore } from '@/stores/repository'
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import type { FileStatus } from '../../../electron/git/types'

interface FileItemProps {
  file: FileStatus
}

const statusColors: Record<FileStatus['status'], string> = {
  modified: 'text-warning',
  added: 'text-success',
  deleted: 'text-destructive',
  renamed: 'text-accent',
  untracked: 'text-muted-foreground'
}

const statusLabels: Record<FileStatus['status'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: '?'
}

export function FileItem({ file }: FileItemProps): JSX.Element {
  const { stageFile, unstageFile, discardChanges, repoPath } = useRepositoryStore()
  const { loadStagedDiff, loadUnstagedDiff } = useDiffStore()

  const handleToggleStage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (file.staged) {
      await unstageFile(file.path)
    } else {
      await stageFile(file.path)
    }
  }

  const handleDiscard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Discard changes to "${file.path}"?`)) {
      await discardChanges(file.path)
    }
  }

  const handleClick = async () => {
    if (file.staged) {
      await loadStagedDiff()
    } else {
      await loadUnstagedDiff()
    }
  }

  const fileName = file.path.split('/').pop() ?? file.path

  return (
    <div
      className="group flex items-center gap-2 px-3 py-1 text-sm hover:bg-muted cursor-pointer"
      onClick={handleClick}
    >
      <button
        onClick={handleToggleStage}
        className={cn(
          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
          file.staged ? 'bg-accent border-accent' : 'border-border hover:border-accent'
        )}
      >
        {file.staged && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        )}
      </button>
      <span className={cn('w-4 text-xs font-mono', statusColors[file.status])}>
        {statusLabels[file.status]}
      </span>
      <span className="truncate flex-1" title={file.path}>{fileName}</span>
      {!file.staged && file.status !== 'untracked' && (
        <button
          onClick={handleDiscard}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background text-destructive"
          title="Discard changes"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      )}
    </div>
  )
}
```

**Step 2: Create src/components/staging/CommitForm.tsx**

```typescript
import { useState } from 'react'
import { useRepositoryStore } from '@/stores/repository'

export function CommitForm(): JSX.Element {
  const [message, setMessage] = useState('')
  const [isCommitting, setIsCommitting] = useState(false)
  const { commit, status } = useRepositoryStore()

  const stagedCount = status.filter(f => f.staged).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || stagedCount === 0) return

    setIsCommitting(true)
    try {
      await commit(message.trim())
      setMessage('')
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 pt-2">
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Commit message"
        className="input w-full h-20 resize-none text-sm"
        disabled={stagedCount === 0}
      />
      <button
        type="submit"
        disabled={!message.trim() || stagedCount === 0 || isCommitting}
        className="btn btn-primary w-full mt-2 text-sm"
      >
        {isCommitting ? 'Committing...' : `Commit (${stagedCount})`}
      </button>
    </form>
  )
}
```

**Step 3: Create src/components/staging/StagingArea.tsx**

```typescript
import { useRepositoryStore } from '@/stores/repository'
import { FileItem } from './FileItem'
import { CommitForm } from './CommitForm'

export function StagingArea(): JSX.Element {
  const { status, stageAll, unstageAll } = useRepositoryStore()

  const staged = status.filter(f => f.staged)
  const unstaged = status.filter(f => !f.staged)

  if (status.length === 0) {
    return (
      <div className="px-3 py-2 text-sm text-muted-foreground">
        No changes
      </div>
    )
  }

  return (
    <div>
      {staged.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground">Staged ({staged.length})</span>
            <button
              onClick={unstageAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Unstage all
            </button>
          </div>
          {staged.map(file => (
            <FileItem key={file.path} file={file} />
          ))}
        </div>
      )}

      {unstaged.length > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground">Unstaged ({unstaged.length})</span>
            <button
              onClick={stageAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Stage all
            </button>
          </div>
          {unstaged.map(file => (
            <FileItem key={file.path} file={file} />
          ))}
        </div>
      )}

      <CommitForm />
    </div>
  )
}
```

**Step 4: Commit**

```bash
mkdir -p src/components/staging
git add src/components/staging/
git commit -m "feat: create staging area components with stage/unstage/discard/commit"
```

---

## Task 13: Create Commit History Components

**Files:**
- Create: `src/components/commits/CommitList.tsx`
- Create: `src/components/commits/CommitItem.tsx`

**Step 1: Create src/components/commits/CommitItem.tsx**

```typescript
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import type { Commit } from '../../../electron/git/types'

interface CommitItemProps {
  commit: Commit
}

export function CommitItem({ commit }: CommitItemProps): JSX.Element {
  const { loadCommitDiff, selectedCommit } = useDiffStore()
  const isSelected = selectedCommit?.hash === commit.hash

  const handleClick = () => {
    loadCommitDiff(commit)
  }

  const handleCopyHash = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(commit.hash)
  }

  return (
    <div
      className={cn(
        'px-3 py-2 cursor-pointer transition-colors',
        isSelected ? 'bg-accent/10' : 'hover:bg-muted'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={handleCopyHash}
          className="font-mono text-xs text-accent hover:underline"
          title="Copy hash"
        >
          {commit.shortHash}
        </button>
        <span className="text-xs text-muted-foreground">{commit.date}</span>
      </div>
      <p className="text-sm truncate">{commit.message}</p>
      <p className="text-xs text-muted-foreground truncate">{commit.author}</p>
    </div>
  )
}
```

**Step 2: Create src/components/commits/CommitList.tsx**

```typescript
import { useEffect, useState } from 'react'
import { useRepositoryStore } from '@/stores/repository'
import { CommitItem } from './CommitItem'
import type { Commit } from '../../../electron/git/types'

export function CommitList(): JSX.Element {
  const { repoPath } = useRepositoryStore()
  const [commits, setCommits] = useState<Commit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!repoPath) return

    const loadCommits = async () => {
      setIsLoading(true)
      try {
        const data = await window.electron.git.log(repoPath, 50)
        setCommits(data)
      } finally {
        setIsLoading(false)
      }
    }

    loadCommits()
  }, [repoPath])

  if (isLoading) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
  }

  if (commits.length === 0) {
    return <div className="px-3 py-2 text-sm text-muted-foreground">No commits</div>
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      {commits.map(commit => (
        <CommitItem key={commit.hash} commit={commit} />
      ))}
    </div>
  )
}
```

**Step 3: Commit**

```bash
mkdir -p src/components/commits
git add src/components/commits/
git commit -m "feat: create commit history list with diff viewing"
```

---

## Task 14: Create Diff View Components

**Files:**
- Create: `src/components/diff/DiffView.tsx`
- Create: `src/components/diff/SplitView.tsx`
- Create: `src/components/diff/UnifiedView.tsx`
- Create: `src/components/diff/FileList.tsx`

**Step 1: Create src/components/diff/FileList.tsx**

```typescript
import { useDiffStore } from '@/stores/diff'
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface FileListProps {
  files: DiffFile[]
  selectedFile: DiffFile | null
}

export function FileList({ files, selectedFile }: FileListProps): JSX.Element {
  const { selectFile } = useDiffStore()

  return (
    <div className="border-t border-border bg-background/50">
      <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Files Changed ({files.length})
      </div>
      <div className="max-h-40 overflow-y-auto">
        {files.map(file => (
          <button
            key={file.path}
            onClick={() => selectFile(file)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-1.5 text-sm hover:bg-muted transition-colors',
              selectedFile?.path === file.path && 'bg-muted'
            )}
          >
            <span className="truncate font-mono text-xs">{file.path}</span>
            <span className="flex items-center gap-2 text-xs flex-shrink-0 ml-2">
              <span className="text-success">+{file.additions}</span>
              <span className="text-destructive">-{file.deletions}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Create src/components/diff/UnifiedView.tsx**

```typescript
import { cn } from '@/lib/utils'
import type { DiffFile } from '../../../electron/git/types'

interface UnifiedViewProps {
  file: DiffFile
}

export function UnifiedView({ file }: UnifiedViewProps): JSX.Element {
  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="p-0">
        {file.chunks.map((chunk, chunkIndex) => (
          <div key={chunkIndex}>
            <div className="px-4 py-1 bg-accent/10 text-accent text-xs">
              @@ -{chunk.oldStart},{chunk.oldLines} +{chunk.newStart},{chunk.newLines} @@
            </div>
            {chunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  'flex',
                  line.type === 'add' && 'bg-success/10',
                  line.type === 'remove' && 'bg-destructive/10'
                )}
              >
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.oldLineNumber ?? ''}
                </span>
                <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                  {line.newLineNumber ?? ''}
                </span>
                <span className="w-6 text-center select-none">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                <pre className="flex-1 px-2 whitespace-pre-wrap break-all">
                  {line.content}
                </pre>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Create src/components/diff/SplitView.tsx**

```typescript
import { cn } from '@/lib/utils'
import type { DiffFile, DiffLine } from '../../../electron/git/types'

interface SplitViewProps {
  file: DiffFile
}

interface SideBySideLine {
  left: DiffLine | null
  right: DiffLine | null
}

function buildSideBySideLines(file: DiffFile): SideBySideLine[] {
  const result: SideBySideLine[] = []

  for (const chunk of file.chunks) {
    const removes: DiffLine[] = []
    const adds: DiffLine[] = []

    for (const line of chunk.lines) {
      if (line.type === 'context') {
        while (removes.length > 0 || adds.length > 0) {
          result.push({
            left: removes.shift() ?? null,
            right: adds.shift() ?? null
          })
        }
        result.push({ left: line, right: line })
      } else if (line.type === 'remove') {
        removes.push(line)
      } else if (line.type === 'add') {
        adds.push(line)
      }
    }

    while (removes.length > 0 || adds.length > 0) {
      result.push({
        left: removes.shift() ?? null,
        right: adds.shift() ?? null
      })
    }
  }

  return result
}

export function SplitView({ file }: SplitViewProps): JSX.Element {
  const lines = buildSideBySideLines(file)

  return (
    <div className="h-full overflow-auto font-mono text-sm">
      <div className="px-4 py-2 bg-muted/50 border-b border-border sticky top-0 z-10">
        <span className="text-xs">{file.path}</span>
      </div>
      <div className="flex">
        <div className="flex-1 border-r border-border">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.left?.type === 'remove' && 'bg-destructive/10'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.left?.oldLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 whitespace-pre-wrap break-all min-h-[1.5rem]">
                {line.left?.content ?? ''}
              </pre>
            </div>
          ))}
        </div>
        <div className="flex-1">
          {lines.map((line, index) => (
            <div
              key={index}
              className={cn(
                'flex',
                line.right?.type === 'add' && 'bg-success/10'
              )}
            >
              <span className="w-12 px-2 text-right text-muted-foreground text-xs select-none border-r border-border">
                {line.right?.newLineNumber ?? ''}
              </span>
              <pre className="flex-1 px-2 whitespace-pre-wrap break-all min-h-[1.5rem]">
                {line.right?.content ?? ''}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Create src/components/diff/DiffView.tsx**

```typescript
import { SplitView } from './SplitView'
import { UnifiedView } from './UnifiedView'
import type { DiffFile } from '../../../electron/git/types'

interface DiffViewProps {
  file: DiffFile
  viewMode: 'split' | 'unified'
}

export function DiffView({ file, viewMode }: DiffViewProps): JSX.Element {
  if (file.chunks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No diff available for this file</p>
          <p className="text-xs mt-1">File may be binary or empty</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'split') {
    return <SplitView file={file} />
  }

  return <UnifiedView file={file} />
}
```

**Step 5: Commit**

```bash
mkdir -p src/components/diff
git add src/components/diff/
git commit -m "feat: create diff view components with split and unified modes"
```

---

## Task 15: Fix TypeScript Build and Electron Script

**Files:**
- Update: `tsconfig.node.json`
- Create: `scripts/electron-dev.js`
- Update: `package.json`

**Step 1: Update tsconfig.node.json for electron build**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "CommonJS",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "outDir": "dist-electron",
    "esModuleInterop": true,
    "declaration": true
  },
  "include": ["electron/**/*.ts"]
}
```

**Step 2: Create scripts/electron-dev.js**

```javascript
const { spawn } = require('child_process')
const { createServer } = require('vite')

async function startDev() {
  const server = await createServer({
    configFile: './vite.config.ts'
  })
  await server.listen()

  const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.node.json', '--watch'], {
    stdio: 'inherit',
    shell: true
  })

  setTimeout(() => {
    const electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    })

    electron.on('close', () => {
      tsc.kill()
      server.close()
      process.exit()
    })
  }, 3000)
}

startDev()
```

**Step 3: Update package.json scripts**

Update the scripts section:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "node scripts/electron-dev.js",
    "build:electron": "tsc -p tsconfig.node.json",
    "build": "tsc && vite build && npm run build:electron && electron-builder",
    "preview": "vite preview"
  }
}
```

**Step 4: Commit**

```bash
mkdir -p scripts
git add tsconfig.node.json scripts/electron-dev.js package.json
git commit -m "fix: update typescript config and add electron dev script"
```

---

## Task 16: Add Path Alias Support

**Files:**
- Create: `vite.config.ts` (update)

**Step 1: Install vite-tsconfig-paths**

Run: `npm install -D vite-tsconfig-paths`

**Step 2: Update vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
```

**Step 3: Commit**

```bash
git add vite.config.ts package.json
git commit -m "feat: add vite-tsconfig-paths for path alias support"
```

---

## Task 17: Final Integration and Testing

**Step 1: Install all dependencies**

Run: `npm install`

**Step 2: Build electron files**

Run: `npm run build:electron`
Expected: dist-electron folder created with compiled JS

**Step 3: Run the application**

Run: `npm run dev:electron`
Expected: Application window opens with welcome screen

**Step 4: Test opening a repository**

- Click "Open Repository"
- Select a git repository folder
- Expected: Repository loads, branches appear in sidebar

**Step 5: Test branch comparison**

- Click on a branch to set as base
- Click on another branch
- Expected: Diff appears in main panel

**Step 6: Test staging area**

- Make changes in the repository
- Refresh status
- Stage/unstage files
- Expected: Files move between staged/unstaged

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete git branch viewer implementation"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] Application starts without errors
- [ ] Can open a git repository
- [ ] Branch list shows local and remote branches
- [ ] Can checkout branches
- [ ] Can create and delete branches
- [ ] Branch comparison shows diff
- [ ] Split and unified view modes work
- [ ] File list shows changed files
- [ ] Staging area shows modified files
- [ ] Can stage/unstage individual files
- [ ] Can stage/unstage all files
- [ ] Can discard changes
- [ ] Commit form works
- [ ] Commit history shows
- [ ] Can view commit diffs
- [ ] Fetch/pull/push buttons work
- [ ] Ahead/behind indicator shows
