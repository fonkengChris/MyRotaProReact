import React from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import Badge from '@/components/ui/Badge'

// Collapsible list of checklist prompts (shift tips, key-worker tasks). A highlighted
// section gets the primary accent and an optional badge, e.g. "Your shift" or "Today".
export interface ChecklistSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: string[]
  open: boolean
  onToggle: () => void
  highlighted?: boolean
  badge?: React.ReactNode
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  title,
  icon: Icon,
  items,
  open,
  onToggle,
  highlighted,
  badge,
}) => (
  <div
    className={`rounded-xl border ${
      highlighted
        ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
        : 'border-neutral-200 dark:border-neutral-700'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
    >
      <span className="flex flex-wrap items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
        <Icon className={`h-5 w-5 ${highlighted ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
        {title}
        {badge && <Badge variant="primary">{badge}</Badge>}
      </span>
      <ChevronDownIcon className={`h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && (
      <ul className="px-4 pb-4 space-y-2">
        {items.length === 0 ? (
          <li className="text-sm text-neutral-500 dark:text-neutral-400">No items.</li>
        ) : (
          items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
              {item}
            </li>
          ))
        )}
      </ul>
    )}
  </div>
)

export default ChecklistSection
