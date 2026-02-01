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
