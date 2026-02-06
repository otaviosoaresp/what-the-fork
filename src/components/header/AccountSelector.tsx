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
