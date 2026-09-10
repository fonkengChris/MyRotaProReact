import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  SunIcon,
} from '@heroicons/react/24/outline'
import { User } from '@/types'
import { LeaveSummary as LeaveSummaryData, formatLeaveYearLabel } from '@/utils/leave'

interface LeaveSummaryProps {
  summary: LeaveSummaryData
  user?: User | null
}

const LeaveSummary: React.FC<LeaveSummaryProps> = ({ summary, user }) => {
  const { entitlement, taken, booked, pending, remaining, leaveYear } = summary
  const isBank = user?.type === 'bank'

  // Progress bar: proportion of entitlement already taken + booked.
  const used = taken + booked
  const usedPct = entitlement > 0 ? Math.min(100, Math.round((used / entitlement) * 100)) : 0
  const takenPct = entitlement > 0 ? Math.min(100, Math.round((taken / entitlement) * 100)) : 0

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 ring-1 ring-primary-300/50 dark:bg-primary-900/50 dark:ring-primary-600/40">
              <SunIcon className="h-5 w-5 text-primary-700 dark:text-primary-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                Annual Leave
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Leave year {formatLeaveYearLabel(leaveYear)}
              </p>
            </div>
          </div>
          {isBank ? (
            <Badge variant="neutral" className="self-start sm:self-center">
              Accrued (12.07%)
            </Badge>
          ) : (
            <Badge
              variant={remaining < 0 ? 'danger' : remaining <= 3 ? 'warning' : 'success'}
              className="self-start text-sm px-3 py-1 sm:self-center"
            >
              {remaining} day{Math.abs(remaining) !== 1 ? 's' : ''} remaining
            </Badge>
          )}
        </div>

        {/* Balance figures */}
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="flex items-center justify-center gap-1.5 text-neutral-600 dark:text-neutral-400">
              <CalendarDaysIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Entitlement</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-950 dark:text-neutral-100">
              {isBank ? '—' : entitlement}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="flex items-center justify-center gap-1.5 text-success-700 dark:text-success-300">
              <CheckCircleIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Taken</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-success-700 dark:text-success-300">{taken}</p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="flex items-center justify-center gap-1.5 text-primary-700 dark:text-primary-300">
              <CalendarDaysIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Booked</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-primary-700 dark:text-primary-300">{booked}</p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="flex items-center justify-center gap-1.5 text-warning-700 dark:text-warning-300">
              <ClockIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-warning-700 dark:text-warning-300">{pending}</p>
          </div>
        </div>

        {/* Progress bar (not shown for bank staff, who have no fixed entitlement) */}
        {!isBank && entitlement > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span>{used} of {entitlement} days used or booked</span>
              <span>{usedPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="flex h-full">
                <div
                  className="h-full bg-success-500 dark:bg-success-400"
                  style={{ width: `${takenPct}%` }}
                />
                <div
                  className="h-full bg-primary-500 dark:bg-primary-400"
                  style={{ width: `${Math.max(0, usedPct - takenPct)}%` }}
                />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success-500 dark:bg-success-400" /> Taken
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary-500 dark:bg-primary-400" /> Booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" /> Remaining
              </span>
            </div>
          </div>
        )}

        {isBank && (
          <p className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-400">
            As bank staff you don't hold a fixed annual leave entitlement — holiday pay
            accrues at 12.07% of the hours you actually work. The figures above show leave
            you've booked and taken this leave year.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default LeaveSummary
