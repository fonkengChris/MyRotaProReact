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
  CheckBadgeIcon,
} from '@heroicons/react/24/outline'
import { shiftsApi, overtimeApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Shift, OvertimeRequest, formatShiftTypeLabel } from '@/types'
import { computeShiftPaidWithBreaks, clampedWorkedDurationHours, getShiftHourBreakdown } from '@/lib/shiftHours'
import PageHeader from '@/components/common/PageHeader'
import WeekNavigator from '@/components/common/WeekNavigator'
import KpiTile from '@/components/common/KpiTile'

interface PaidHoursData {
  rosteredHours: number
  totalSleepInHours: number
  paidHours: number
  breakDeductions: number
  // Approved overtime hours this week (added on top of paid hours).
  overtimeHours: number
  // Actual clocked time this week, split into regular work vs sleep-night sleep-in.
  workedRegularHours: number
  workedSleepInHours: number
  sleepNightsWorked: number
  shifts: Array<Shift & {
    rosteredHours: number
    paidHours: number
    breakDeduction: number
    deductionReason: string
    sleepInHours: number
    paidWorkBeforeBreak: number
    overtimeHours: number
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

  // The caller's own overtime requests (the API auto-scopes staff to themselves),
  // used to flag shifts that have overtime and show its approval status.
  const { data: overtimeRequests = [] } = useQuery({
    queryKey: ['overtime', 'mine', user?.id],
    queryFn: () => overtimeApi.list(),
    enabled: !!user?.id,
    select: (data) => Array.isArray(data) ? data : [],
  })

  const overtimeByShiftId = useMemo(() => {
    const map = new Map<string, OvertimeRequest>()
    for (const ot of overtimeRequests) {
      const raw = ot.shift_id as unknown
      const sid =
        typeof raw === 'string' ? raw : (raw as { id?: string; _id?: string })?.id ?? (raw as { _id?: string })?._id
      if (sid) map.set(String(sid), ot)
    }
    return map
  }, [overtimeRequests])

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
    let overtimeHours = 0
    let workedRegularHours = 0
    let workedSleepInHours = 0
    let sleepNightsWorked = 0

    const now = Date.now()

    const shiftsWithPaidHours = userShifts.map(shift => {
      const assignment = shift.assigned_staff?.find(a => a.user_id === user?.id)
      // Paid hours use actual clamped clock time once a shift is fully clocked
      // (late arrival / early leaving reduce pay); otherwise the rostered estimate.
      const c = computeShiftPaidWithBreaks(shift, assignment)

      // Only approved overtime counts toward paid hours (matches the payroll backend).
      const ot = overtimeByShiftId.get(shift.id)
      const shiftOvertimeHours =
        ot?.status === 'approved' ? Math.max(0, (ot.requested_minutes || 0) / 60) : 0

      rosteredHours += c.rosteredHours
      totalSleepInHours += c.sleepInHours
      paidHours += c.paidHours + shiftOvertimeHours
      overtimeHours += shiftOvertimeHours
      totalBreakDeductions += c.breakDeduction

      // Actual clocked time clamped to the scheduled window, including elapsed time
      // so far on a shift the user is currently clocked into. Split into regular
      // work vs the sleep-in portion of sleeping-night shifts.
      if (assignment?.clock_in_time) {
        const workedDuration = clampedWorkedDurationHours(shift, assignment, now)
        if (workedDuration != null && workedDuration > 0) {
          const wb = getShiftHourBreakdown(shift, workedDuration)
          workedRegularHours += wb.paid_work_hours + shiftOvertimeHours
          workedSleepInHours += wb.sleep_in_hours
          if (shift.shift_type === 'night-sleep') sleepNightsWorked += 1
        }
      }

      return {
        ...shift,
        rosteredHours: c.rosteredHours,
        // Paid hours for this shift include approved overtime on top.
        paidHours: c.paidHours + shiftOvertimeHours,
        breakDeduction: c.breakDeduction,
        deductionReason: c.deductionReason,
        sleepInHours: c.sleepInHours,
        paidWorkBeforeBreak: c.paidWorkBeforeBreak,
        overtimeHours: shiftOvertimeHours,
      }
    })

    return {
      rosteredHours,
      totalSleepInHours,
      paidHours,
      breakDeductions: totalBreakDeductions,
      overtimeHours,
      workedRegularHours,
      workedSleepInHours,
      sleepNightsWorked,
      shifts: shiftsWithPaidHours
    }
  }, [shifts, user?.id, overtimeByShiftId])

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <KpiTile
          icon={CheckBadgeIcon}
          tone="accent"
          label="Worked (regular)"
          value={`${paidHoursData.workedRegularHours.toFixed(1)}h`}
          caption="Actual clocked work this week (excl. sleep-in)"
        />
        <KpiTile
          icon={MoonIcon}
          tone="secondary"
          label="Sleep nights worked"
          value={`${paidHoursData.sleepNightsWorked}`}
          caption={`${paidHoursData.workedSleepInHours.toFixed(1)}h sleep-in clocked this week`}
        />
        <KpiTile
          icon={ClockIcon}
          tone="primary"
          label="Rostered hours"
          value={`${paidHoursData.rosteredHours.toFixed(1)}h`}
          caption="Total time on shift (incl. sleep-in), this week"
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
          caption={
            paidHoursData.overtimeHours > 0
              ? `Incl. ${paidHoursData.overtimeHours.toFixed(1)}h approved overtime`
              : 'After sleep-in split & breaks'
          }
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
              <h3 className="mt-2 text-sm font-medium text-neutral-950 dark:text-neutral-100">
                No shifts this week
              </h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
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
                        <h3 className="text-lg font-medium text-neutral-950 dark:text-neutral-100">
                          {format(new Date(shift.date), 'EEEE, MMM d')}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {formatShiftTypeLabel(shift.shift_type)}
                          </Badge>
                          {(() => {
                            const ot = overtimeByShiftId.get(shift.id)
                            if (!ot) return null
                            const variant =
                              ot.status === 'approved' ? 'success' : ot.status === 'denied' ? 'danger' : 'warning'
                            const label =
                              ot.status === 'approved'
                                ? `Overtime approved · ${ot.requested_minutes}m`
                                : ot.status === 'denied'
                                  ? 'Overtime denied'
                                  : `Overtime pending · ${ot.requested_minutes}m`
                            return (
                              <Badge variant={variant} className="text-xs">
                                {label}
                              </Badge>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-wrap items-start justify-end gap-4 sm:gap-6">
                        <div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Rostered</p>
                          <p className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                            {shift.rosteredHours.toFixed(1)}h
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
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">Paid work</p>
                            <p className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">
                              {shift.paidWorkBeforeBreak.toFixed(1)}h
                            </p>
                          </div>
                        )}
                        {shift.breakDeduction > 0 && (
                          <div>
                            <p className="text-sm text-warning-600 dark:text-warning-400">Break Deduction</p>
                            <p className="text-lg font-semibold text-warning-700 dark:text-warning-300">
                              -{shift.breakDeduction.toFixed(1)}h
                            </p>
                          </div>
                        )}
                        {shift.overtimeHours > 0 && (
                          <div>
                            <p className="text-sm text-success-600 dark:text-success-400">Overtime</p>
                            <p className="text-lg font-semibold text-success-700 dark:text-success-300">
                              +{shift.overtimeHours.toFixed(1)}h
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-success-600 dark:text-success-400">Paid Hours</p>
                          <p className="text-xl font-bold text-success-700 dark:text-success-300">
                            {shift.paidHours.toFixed(1)}h
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
