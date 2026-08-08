import React from 'react'
import { format } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/primitives'

/**
 * Shared week navigator: ◀  Week of MMM d – MMM d, yyyy  ▶  [This week].
 * Consolidates the prev/next/current-week controls that MyHours, MySchedule,
 * ShiftSelection and HoursSummary each re-implemented.
 */
export interface WeekNavigatorProps {
  weekStart: Date
  weekEnd: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  /** Optional secondary line under the range (e.g. full weekday dates). */
  subLabel?: React.ReactNode
  className?: string
}

const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  onToday,
  subLabel,
  className,
}) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2.5 shadow-card sm:px-4',
      className
    )}
  >
    <Button variant="outline" size="icon" onClick={onPrev} aria-label="Previous week">
      <ChevronLeftIcon className="h-4 w-4" />
    </Button>

    <div className="min-w-0 text-center">
      <h2 className="truncate text-sm font-semibold text-heading-accent sm:text-base">
        {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
      </h2>
      {subLabel ? (
        <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">{subLabel}</p>
      ) : (
        <button
          onClick={onToday}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400"
        >
          Jump to this week
        </button>
      )}
    </div>

    <div className="flex items-center gap-2">
      {subLabel && (
        <Button variant="ghost" size="sm" onClick={onToday} className="hidden sm:inline-flex">
          This week
        </Button>
      )}
      <Button variant="outline" size="icon" onClick={onNext} aria-label="Next week">
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  </div>
)

export default WeekNavigator
