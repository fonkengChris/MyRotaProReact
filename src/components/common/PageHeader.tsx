import React from 'react'
import { cn } from '@/lib/utils'

/**
 * Standard page header: title + optional subtitle on the left, actions on the right.
 * Replaces the per-page "welcome banner card" / ad-hoc header markup so every page
 * shares the same top rhythm. Kept as a plain header (no Card) to reclaim vertical space.
 */
export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => (
  <div
    className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className
    )}
  >
    <div className="min-w-0">
      <h1 className="text-xl font-bold text-heading-accent font-display sm:text-2xl lg:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
    {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

export default PageHeader
