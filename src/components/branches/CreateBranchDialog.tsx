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
