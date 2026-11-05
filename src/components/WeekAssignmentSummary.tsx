import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Home, Shift } from '@/types'
import { shiftHomeId } from '@/lib/shiftHours'
import { cn } from '@/utils/cn'

interface AssignmentCounts {
  total: number
  fullyAssigned: number
  partiallyAssigned: number
  unassigned: number
  slotsRequired: number
  slotsFilled: number
}

const emptyCounts = (): AssignmentCounts => ({
  total: 0,
  fullyAssigned: 0,
  partiallyAssigned: 0,
  unassigned: 0,
  slotsRequired: 0,
  slotsFilled: 0,
})

function addShift(counts: AssignmentCounts, shift: Shift) {
  // Declined assignments don't cover the shift.
  const assigned = (shift.assigned_staff || []).filter((a) => a.status !== 'declined').length
  const required = shift.required_staff_count || 1
  counts.total += 1
  counts.slotsRequired += required
  counts.slotsFilled += Math.min(assigned, required)
  if (assigned === 0) counts.unassigned += 1
  else if (assigned < required) counts.partiallyAssigned += 1
  else counts.fullyAssigned += 1
}

interface WeekAssignmentSummaryProps {
  homes: Home[]
  shifts: Shift[]
  isLoading: boolean
  selectedHomeId: string
  onSelectHome: (homeId: string) => void
}

/** Week-wide assigned/unassigned shift counts across every home the user can reach. */
const WeekAssignmentSummary: React.FC<WeekAssignmentSummaryProps> = ({
  homes,
  shifts,
  isLoading,
  selectedHomeId,
  onSelectHome,
}) => {
  const { overall, byHome } = useMemo(() => {
    const overall = emptyCounts()
    const byHome = new Map<string, AssignmentCounts>()
    shifts
      .filter((shift) => shift.is_active !== false)
      .forEach((shift) => {
        addShift(overall, shift)
        const homeId = shiftHomeId(shift)
        if (!homeId) return
        if (!byHome.has(homeId)) byHome.set(homeId, emptyCounts())
        addShift(byHome.get(homeId)!, shift)
      })
    return { overall, byHome }
  }, [shifts])

  const coverage = overall.slotsRequired > 0
    ? Math.round((overall.slotsFilled / overall.slotsRequired) * 100)
    : 0

  const tiles = [
    { label: 'Total shifts', value: overall.total, className: 'text-heading-accent' },
    { label: 'Fully assigned', value: overall.fullyAssigned, className: 'text-success-600 dark:text-success-400' },
    { label: 'Partially assigned', value: overall.partiallyAssigned, className: 'text-warning-600 dark:text-warning-400' },
    { label: 'Unassigned', value: overall.unassigned, className: 'text-danger-600 dark:text-danger-400' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment Analysis — All Homes</CardTitle>
        <CardDescription>
          Shifts this week and how many have staff assigned, across every home
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tiles.map((tile) => (
                <div key={tile.label} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-600">{tile.label}</p>
                  <p className={cn('mt-1 text-2xl font-semibold tabular-nums', tile.className)}>{tile.value}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-neutral-600">
                <span>Staff slots filled</span>
                <span className="tabular-nums">
                  {overall.slotsFilled} / {overall.slotsRequired} ({coverage}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${coverage}%` }} />
              </div>
            </div>

            {homes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs text-neutral-600 dark:border-neutral-700">
                      <th className="py-2 pr-3 font-medium">Home</th>
                      <th className="px-3 py-2 text-right font-medium">Shifts</th>
                      <th className="px-3 py-2 text-right font-medium">Assigned</th>
                      <th className="px-3 py-2 text-right font-medium">Partial</th>
                      <th className="px-3 py-2 text-right font-medium">Unassigned</th>
                      <th className="py-2 pl-3 text-right font-medium">Slots filled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homes.map((home) => {
                      const c = byHome.get(home.id) ?? emptyCounts()
                      const isSelected = home.id === selectedHomeId
                      return (
                        <tr
                          key={home.id}
                          onClick={() => onSelectHome(home.id)}
                          className={cn(
                            'cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50',
                            isSelected && 'bg-primary-50 dark:bg-primary-900/20'
                          )}
                          title={`Open ${home.name} rota`}
                        >
                          <td className="py-2 pr-3 font-medium text-neutral-900">{home.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{c.total}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-success-600 dark:text-success-400">{c.fullyAssigned}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-warning-600 dark:text-warning-400">{c.partiallyAssigned}</td>
                          <td className={cn('px-3 py-2 text-right tabular-nums', c.unassigned > 0 ? 'font-semibold text-danger-600 dark:text-danger-400' : 'text-neutral-500')}>
                            {c.unassigned}
                          </td>
                          <td className="py-2 pl-3 text-right tabular-nums text-neutral-700">
                            {c.slotsFilled} / {c.slotsRequired}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WeekAssignmentSummary
