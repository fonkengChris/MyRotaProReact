import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/primitives'

/**
 * A single KPI/stat tile: brand-tinted icon square + mono tabular value + caption.
 * Standardizes the stat-card pattern that Dashboard, MyHours and HoursSummary each
 * hand-rolled (and which leaked hardcoded indigo/green/orange colors). All tones map
 * to semantic design tokens so tiles stay consistent across palettes.
 */
export type KpiTone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'secondary'
  | 'danger'
  | 'accent'

const toneStyles: Record<KpiTone, { tile: string; icon: string }> = {
  primary: { tile: 'bg-primary-100 group-hover:bg-primary-200', icon: 'text-primary-600' },
  success: { tile: 'bg-success-100 group-hover:bg-success-200', icon: 'text-success-600' },
  warning: { tile: 'bg-warning-100 group-hover:bg-warning-200', icon: 'text-warning-600' },
  secondary: { tile: 'bg-secondary-100 group-hover:bg-secondary-200', icon: 'text-secondary-600' },
  danger: { tile: 'bg-danger-100 group-hover:bg-danger-200', icon: 'text-danger-600' },
  accent: { tile: 'bg-accent-100 group-hover:bg-accent-200', icon: 'text-accent-600' },
}

export interface KpiTileProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  caption?: React.ReactNode
  /** Optional trailing chip, e.g. a "vs. last week" trend. */
  trend?: React.ReactNode
  tone?: KpiTone
  className?: string
}

const KpiTile: React.FC<KpiTileProps> = ({
  icon: Icon,
  label,
  value,
  caption,
  trend,
  tone = 'primary',
  className,
}) => {
  const styles = toneStyles[tone]
  return (
    <Card className={cn('group transition-shadow duration-200 hover:shadow-card-hover', className)}>
      <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 transition-colors dark:ring-white/10 sm:h-12 sm:w-12',
            styles.tile
          )}
        >
          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', styles.icon)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 sm:text-sm">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-2xl font-bold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
              {value}
            </p>
            {trend}
          </div>
          {caption && (
            <p className="mt-0.5 text-[10px] leading-tight text-neutral-500 sm:text-xs">
              {caption}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default KpiTile
