import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { shiftsApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Shift } from '@/types'

interface PaidHoursData {
  totalHours: number
  paidHours: number
  breakDeductions: number
  shifts: Array<Shift & { 
    paidHours: number
    breakDeduction: number
    deductionReason: string
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

    let totalHours = 0
    let paidHours = 0
    let totalBreakDeductions = 0

    const shiftsWithPaidHours = userShifts.map(shift => {
      const shiftHours = shift.duration_hours || 0
      totalHours += shiftHours

      let breakDeduction = 0
      let deductionReason = ''

      // Apply break deduction rules
      if (shiftHours >= 12) {
        // Deduct 1 hour for 12+ hour shifts
        breakDeduction = 1
        deductionReason = '12+ hour shift break'
      } else if (shiftHours >= 8 && shiftHours < 12) {
        // Deduct 30 minutes for 8-10 hour shifts
        breakDeduction = 0.5
        deductionReason = '8-10 hour shift break'
      } else {
        // No deduction for shifts under 8 hours
        breakDeduction = 0
        deductionReason = 'No break deduction (< 8 hours)'
      }

      const shiftPaidHours = Math.max(0, shiftHours - breakDeduction)
      paidHours += shiftPaidHours
      totalBreakDeductions += breakDeduction

      return {
        ...shift,
        paidHours: shiftPaidHours,
        breakDeduction,
        deductionReason
      }
    })

    return {
      totalHours,
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
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Hours</h3>
          <p className="text-sm text-red-600 mb-4">
            There was an error loading your hours data.
          </p>
          <p className="text-sm text-gray-500">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">My Paid Hours</h1>
          <p className="text-gray-600 mt-1">
            Your paid hours for the selected week (after break deductions)
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
          >
            Current Week
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous Week
            </Button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(weekStart, 'EEEE, MMMM d')} to {format(weekEnd, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              Next Week
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {paidHoursData.totalHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Paid Hours</p>
                <p className="text-2xl font-semibold text-green-600">
                  {paidHoursData.paidHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Break Deductions</p>
                <p className="text-2xl font-semibold text-orange-600">
                  -{paidHoursData.breakDeductions.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <span className="text-sm text-gray-600">1 hour deduction for break</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="warning" className="text-xs">8-10 hours</Badge>
              <span className="text-sm text-gray-600">30 minutes deduction for break</span>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="success" className="text-xs">&lt; 8 hours</Badge>
              <span className="text-sm text-gray-600">No break deduction</span>
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
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No shifts this week
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                You have not been assigned to any shifts this week
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paidHoursData.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {format(new Date(shift.date), 'EEEE, MMM d')}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {shift.start_time} - {shift.end_time}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {shift.shift_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Total Hours</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {shift.duration_hours}h
                          </p>
                        </div>
                        {shift.breakDeduction > 0 && (
                          <div>
                            <p className="text-sm text-orange-500">Break Deduction</p>
                            <p className="text-lg font-semibold text-orange-600">
                              -{shift.breakDeduction}h
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-green-500">Paid Hours</p>
                          <p className="text-xl font-bold text-green-600">
                            {shift.paidHours}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {shift.breakDeduction > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded p-3">
                      <p className="text-sm text-orange-800">
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
