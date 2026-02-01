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

function Section({ title, section, children }: SectionProps) {
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

export function Sidebar() {
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
