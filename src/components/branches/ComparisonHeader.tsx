import { useDiffStore } from '@/stores/diff'

export function ComparisonHeader() {
  const { baseBranch, compareBranch, mode, clearDiff, setBaseBranch, swapBranches } = useDiffStore()

  if (mode !== 'branches' || !baseBranch) {
    return null
  }

  const handleClear = () => {
    setBaseBranch(null)
    clearDiff()
  }

  const handleSwap = () => {
    if (compareBranch) {
      swapBranches()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b border-border text-sm">
      {compareBranch ? (
        <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-md">
          <span className="text-[10px] font-semibold uppercase text-blue-400">compare</span>
          <span className="font-mono text-xs text-blue-300">{compareBranch}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted border border-border rounded-md">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">compare</span>
          <span className="font-mono text-xs text-muted-foreground italic">select branch</span>
        </div>
      )}
      <button
        onClick={handleSwap}
        disabled={!compareBranch}
        className={`p-1.5 rounded transition-colors ${compareBranch ? 'hover:bg-muted text-muted-foreground hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed'}`}
        title="Swap branches"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M3 12h18" />
        </svg>
      </button>
      <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-md">
        <span className="text-[10px] font-semibold uppercase text-green-400">base</span>
        <span className="font-mono text-xs text-green-300">{baseBranch}</span>
      </div>
      <button
        onClick={handleClear}
        className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Clear comparison"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
