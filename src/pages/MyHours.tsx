import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import {
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { shiftsApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Shift, formatShiftTypeLabel } from '@/types'
import { computeShiftPaidWithBreaks } from '@/lib/shiftHours'
import PageHeader from '@/components/common/PageHeader'
import WeekNavigator from '@/components/common/WeekNavigator'
import KpiTile from '@/components/common/KpiTile'

interface PaidHoursData {
  rosteredHours: number
  totalSleepInHours: number
  paidHours: number
  breakDeductions: number
  shifts: Array<Shift & {
    rosteredHours: number
    paidHours: number
    breakDeduction: number
    deductionReason: string
    sleepInHours: number
    paidWorkBeforeBreak: number
  }>
}

const MyHours: React.FC = () => {
  const { user, isLoading } = useAuth()
  const [selectedWeek, setSelectedWeek] = useState(() => new Date())

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

  // Fetch shifts for the selected week
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['shifts', 'paid-hours', format(weekStart, 'yyyy-MM-dd'), user?.id],
    queryFn: () => shiftsApi.getAll({
      user_id: user?.id,
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user?.id,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Calculate paid hours with break deductions
  const paidHoursData = useMemo((): PaidHoursData => {
    const userShifts = shifts.filter(shift => 
      shift.assigned_staff?.some(assignment => 
        assignment.user_id === user?.id
      )
    )

    let rosteredHours = 0
    let totalSleepInHours = 0
    let paidHours = 0
    let totalBreakDeductions = 0

    const shiftsWithPaidHours = userShifts.map(shift => {
      const c = computeShiftPaidWithBreaks(shift)
      rosteredHours += c.rosteredHours
      totalSleepInHours += c.sleepInHours
      paidHours += c.paidHours
      totalBreakDeductions += c.breakDeduction

      return {
        ...shift,
        rosteredHours: c.rosteredHours,
        paidHours: c.paidHours,
        breakDeduction: c.breakDeduction,
        deductionReason: c.deductionReason,
        sleepInHours: c.sleepInHours,
        paidWorkBeforeBreak: c.paidWorkBeforeBreak,
      }
    })

    return {
      rosteredHours,
      totalSleepInHours,
      paidHours,
      breakDeductions: totalBreakDeductions,
      shifts: shiftsWithPaidHours
    }
  }, [shifts, user?.id])

  // Navigation functions
  const goToPreviousWeek = () => {
    setSelectedWeek(subWeeks(selectedWeek, 1))
  }

  const goToNextWeek = () => {
    setSelectedWeek(addWeeks(selectedWeek, 1))
  }

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date())
  }

  // Safety check - don't render if user is not loaded
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show error if there's an error loading shifts
  if (shiftsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-danger-900 dark:text-danger-300 mb-2">Error Loading Hours</h3>
          <p className="text-sm text-danger-600 dark:text-danger-400 mb-4">
            There was an error loading your hours data.
          </p>
          <p className="text-sm text-neutral-600">
            Error: {(shiftsError as any)?.message || 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  if (shiftsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="My Paid Hours"
        subtitle="Sleeping-night shifts: 8h sleep-in is excluded from paid work; breaks apply to paid hours only."
      />

      {/* Week Navigation */}
      <WeekNavigator
        weekStart={weekStart}
        weekEnd={weekEnd}
        onPrev={goToPreviousWeek}
        onNext={goToNextWeek}
        onToday={goToCurrentWeek}
        subLabel={`${format(weekStart, 'EEEE, MMMM d')} to ${format(weekEnd, 'EEEE, MMMM d, yyyy')}`}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <KpiTile
          icon={ClockIcon}
          tone="primary"
          label="Rostered hours"
          value={`${paidHoursData.rosteredHours.toFixed(1)}h`}
          caption="Total time on shift (incl. sleep-in)"
        />
        <KpiTile
          icon={MoonIcon}
          tone="secondary"
          label="Sleep-in hours"
          value={`${paidHoursData.totalSleepInHours.toFixed(1)}h`}
          caption="From sleeping-night shifts (not paid as work)"
        />
        <KpiTile
          icon={CurrencyDollarIcon}
          tone="success"
          label="Paid hours"
          value={`${paidHoursData.paidHours.toFixed(1)}h`}
          caption="After sleep-in split & breaks"
        />
        <KpiTile
          icon={ExclamationTriangleIcon}
          tone="warning"
          label="Break deductions"
          value={`-${paidHoursData.breakDeductions.toFixed(1)}h`}
        />
      </div>

      {/* Break Deduction Rules Info */}
      <Card>
        <CardHeader>
          <CardTitle>Break Deduction Rules</CardTitle>
          <CardDescription>
            Understanding how break deductions are calculated for your shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Badge variant="danger" className="text-xs">12+ hours</Badge>
              <span className="text-sm text-neutral-700">1 hour deduction for break</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="warning" className="text-xs">8-10 hours</Badge>
              <span className="text-sm text-neutral-700">30 minutes deduction for break</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success" className="text-xs">&lt; 8 hours</Badge>
              <span className="text-sm text-neutral-700">No break deduction</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Shift Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Shift Breakdown</CardTitle>
          <CardDescription>
            Detailed breakdown of your shifts and paid hours for the selected week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paidHoursData.shifts.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-neutral-500" />
              <h3 className="mt-2 text-sm font-medium text-neutral-950">
                No shifts this week
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                You have not been assigned to any shifts this week
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paidHoursData.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="border border-neutral-300 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-neutral-950">
                          {format(new Date(shift.date), 'EEEE, MMM d')}
                        </h3>
                        <p className="text-sm text-neutral-600">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {formatShiftTypeLabel(shift.shift_type)}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-wrap items-start justify-end gap-4 sm:gap-6">
                        <div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Rostered</p>
                          <p className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                            {shift.rosteredHours}h
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Sleep-in</p>
                          <p className="text-lg font-semibold text-secondary-700 dark:text-secondary-300">
                            {shift.sleepInHours.toFixed(1)}h
                          </p>
                        </div>
                        {shift.paidWorkBeforeBreak !== shift.rosteredHours && shift.paidWorkBeforeBreak >= 0 && (
                          <div>
                            <p className="text-sm text-neutral-600">Paid work</p>
                            <p className="text-lg font-semibold text-neutral-900">
                              {shift.paidWorkBeforeBreak}h
                            </p>
                          </div>
                        )}
                        {shift.breakDeduction > 0 && (
                          <div>
                            <p className="text-sm text-warning-500">Break Deduction</p>
                            <p className="text-lg font-semibold text-warning-600">
                              -{shift.breakDeduction}h
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-success-500">Paid Hours</p>
                          <p className="text-xl font-bold text-success-600">
                            {shift.paidHours}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {shift.breakDeduction > 0 && (
                    <div className="bg-warning-50 border border-warning-200 dark:bg-warning-900/20 dark:border-warning-800 rounded p-3">
                      <p className="text-sm text-warning-800 dark:text-warning-300">
                        <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                        {shift.deductionReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MyHours
