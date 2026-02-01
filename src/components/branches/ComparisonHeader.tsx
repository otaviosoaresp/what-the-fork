import { useDiffStore } from '@/stores/diff'

export function ComparisonHeader() {
  const { baseBranch, compareBranch, mode, clearDiff, setBaseBranch } = useDiffStore()

  if (mode !== 'branches' || !baseBranch) {
    return null
  }

  const handleClear = () => {
    setBaseBranch(null)
    clearDiff()
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border text-sm">
      <span className="text-muted-foreground">Comparing:</span>
      {compareBranch ? (
        <>
          <span className="font-mono font-medium text-accent">{compareBranch}</span>
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="font-mono font-medium text-accent">{baseBranch}</span>
        </>
      ) : (
        <>
          <span className="text-muted-foreground italic">select source</span>
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <span className="font-mono font-medium text-accent">{baseBranch}</span>
        </>
      )}
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
