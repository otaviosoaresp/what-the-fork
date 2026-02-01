import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { AISettings } from './AISettings'
import { cn } from '@/lib/utils'

interface SettingsModalProps {
  onClose: () => void
}

type Tab = 'ai'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'ai', label: 'AI', icon: <Sparkles size={14} /> }
]

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('ai')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg w-[500px] max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-medium">Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-32 border-r border-border py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                  activeTab === tab.id
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'ai' && <AISettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
