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
