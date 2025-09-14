import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { shiftsApi, usersApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import { Shift, User } from '@/types'

interface HoursSummaryProps {
  homeId?: string
  userId?: string // For individual user view
  isAdminView?: boolean // Whether this is admin view (shows all users) or individual view
  userRole?: string // User role to determine permissions
}

interface UserHours {
  user: User
  totalHours: number
  paidHours: number
  breakDeductions: number
  totalShifts: number
  shifts: Shift[]
}

const HoursSummary: React.FC<HoursSummaryProps> = ({ 
  homeId, 
  userId, 
  isAdminView = false,
  userRole = 'support_worker'
}) => {
  const [selectedWeek, setSelectedWeek] = useState(() => new Date())

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

  // Fetch shifts for the selected week
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['shifts', 'hours-summary', format(weekStart, 'yyyy-MM-dd'), homeId, userId, userRole],
    queryFn: () => shiftsApi.getAll({
      home_id: userRole === 'admin' ? undefined : homeId, // Admin can see all shifts, others need homeId
      user_id: !isAdminView ? userId : undefined, // For individual users, filter by user_id
      start_date: format(weekStart, 'yyyy-MM-dd'),
      end_date: format(weekEnd, 'yyyy-MM-dd')
    }),
    enabled: userRole === 'admin' || isAdminView || (!!userId && !!homeId), // Admin can always view, or if admin view, or if individual user with homeId
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch staff for admin view
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', 'hours-summary', homeId, userRole],
    queryFn: () => usersApi.getAll({ 
      home_id: userRole === 'admin' ? undefined : homeId // Admin can see all users, others need homeId
    }),
    enabled: userRole === 'admin' || isAdminView, // Admin can always view, or if admin view
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch individual user for user view (only for individual users, not admin view)
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['user', 'hours-summary', userId],
    queryFn: () => usersApi.getById(userId!),
    enabled: !!userId && !isAdminView && userRole !== 'admin' // Only for individual users, not admin view
  })

  const isLoading = shiftsLoading || staffLoading || (userLoading && !isAdminView && userRole !== 'admin')





  // Calculate hours for each user
  const calculateUserHours = useMemo((): UserHours[] => {
    if (isAdminView) {
      return staff.map(staffMember => {
        const userShifts = shifts.filter(shift => 
          shift.assigned_staff?.some(assignment => 
            assignment.user_id === staffMember.id
          )
        )
        
        const totalHours = userShifts.reduce((sum, shift) => 
          sum + (shift.duration_hours || 0), 0
        )
        
        // Calculate paid hours with break deductions
        let paidHours = 0
        let totalBreakDeductions = 0
        
        userShifts.forEach(shift => {
          const shiftHours = shift.duration_hours || 0
          let breakDeduction = 0
          
          // Apply break deduction rules
          if (shiftHours >= 12) {
            breakDeduction = 1 // 1 hour deduction for 12+ hour shifts
          } else if (shiftHours >= 8 && shiftHours < 12) {
            breakDeduction = 0.5 // 30 minutes deduction for 8-10 hour shifts
          }
          // No deduction for shifts under 8 hours
          
          paidHours += Math.max(0, shiftHours - breakDeduction)
          totalBreakDeductions += breakDeduction
        })
        
        return {
          user: staffMember,
          totalHours,
          paidHours,
          breakDeductions: totalBreakDeductions,
          totalShifts: userShifts.length,
          shifts: userShifts
        }
      }).sort((a, b) => b.totalHours - a.totalHours) // Sort by hours descending
    } else {
      // Individual user view
      if (!userId) return []
      
      // For individual user view without homeId, use shifts directly (filtered by user_id)
      if (!homeId) {
        const userShifts = shifts.filter(shift => 
          shift.assigned_staff?.some(assignment => 
            assignment.user_id === userId
          )
        )
        
        const totalHours = userShifts.reduce((sum, shift) => 
          sum + (shift.duration_hours || 0), 0
        )
        
        // Calculate paid hours with break deductions
        let paidHours = 0
        let totalBreakDeductions = 0
        
        userShifts.forEach(shift => {
          const shiftHours = shift.duration_hours || 0
          let breakDeduction = 0
          
          // Apply break deduction rules
          if (shiftHours >= 12) {
            breakDeduction = 1 // 1 hour deduction for 12+ hour shifts
          } else if (shiftHours >= 8 && shiftHours < 12) {
            breakDeduction = 0.5 // 30 minutes deduction for 8-10 hour shifts
          }
          // No deduction for shifts under 8 hours
          
          paidHours += Math.max(0, shiftHours - breakDeduction)
          totalBreakDeductions += breakDeduction
        })
        
        return [{
          user: userData || { id: userId, name: 'Unknown User', role: userRole },
          totalHours,
          paidHours,
          breakDeductions: totalBreakDeductions,
          totalShifts: userShifts.length,
          shifts: userShifts
        }]
      }
      
      const userShifts = shifts.filter(shift => 
        shift.assigned_staff?.some(assignment => 
          assignment.user_id === userId
        )
      )
      
      const totalHours = userShifts.reduce((sum, shift) => 
        sum + (shift.duration_hours || 0), 0
      )
      
      // Calculate paid hours with break deductions
      let paidHours = 0
      let totalBreakDeductions = 0
      
      userShifts.forEach(shift => {
        const shiftHours = shift.duration_hours || 0
        let breakDeduction = 0
        
        // Apply break deduction rules
        if (shiftHours >= 12) {
          breakDeduction = 1 // 1 hour deduction for 12+ hour shifts
        } else if (shiftHours >= 8 && shiftHours < 12) {
          breakDeduction = 0.5 // 30 minutes deduction for 8-10 hour shifts
        }
        // No deduction for shifts under 8 hours
        
        paidHours += Math.max(0, shiftHours - breakDeduction)
        totalBreakDeductions += breakDeduction
      })
      
      return [{
        user: userData || { id: userId, name: 'Unknown User', role: userRole },
        totalHours,
        paidHours,
        breakDeductions: totalBreakDeductions,
        totalShifts: userShifts.length,
        shifts: userShifts
      }]
    }
  }, [isAdminView, staff, shifts, userId, homeId, userData, userRole])

  const userHours = calculateUserHours
  const totalHours = useMemo(() => userHours.reduce((sum, uh) => sum + uh.totalHours, 0), [userHours])
  const totalPaidHours = useMemo(() => userHours.reduce((sum, uh) => sum + uh.paidHours, 0), [userHours])
  const totalBreakDeductions = useMemo(() => userHours.reduce((sum, uh) => sum + uh.breakDeductions, 0), [userHours])
  const totalShifts = useMemo(() => userHours.reduce((sum, uh) => sum + uh.totalShifts, 0), [userHours])

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
            Error: {shiftsError.message || 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  // Show message if no home is selected (only for non-admin users)
  if (isAdminView && !homeId && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Care Home Assigned</h3>
          <p className="text-sm text-gray-500 mb-4">
            You need to be assigned to a care home to view the hours summary for staff members.
          </p>
          <p className="text-sm text-gray-400">
            Contact your administrator to assign you to a care home.
          </p>
        </div>
      </div>
    )
  }

  // Show message if no user ID is provided for individual view
  if (!isAdminView && !userId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">User Not Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            Unable to load user information
          </p>
        </div>
      </div>
    )
  }


  // Show message if no home or user ID is provided (but not for admin users)
  if (!homeId && !userId && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-sm text-gray-500 mb-4">
            {isAdminView 
              ? 'Please select a care home to view hours summary'
              : 'You are not assigned to any care home'
            }
          </p>
        </div>
      </div>
    )
  }

  // Show message if user doesn't have a home assigned (for individual view) - check this before loading
  if (!isAdminView && !homeId && userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Care Home Assigned</h3>
          <p className="text-sm text-gray-500 mb-4">
            You need to be assigned to a care home to view your hours.
          </p>
          <p className="text-sm text-gray-400">
            Contact your administrator to assign you to a care home.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show error if there's an issue
  if (shiftsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-sm text-gray-500 mb-4">
            Failed to load hours data
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdminView ? 'Hours Summary' : 'My Hours'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdminView 
              ? userRole === 'admin'
                ? 'Total hours worked by all staff across all homes for the selected week'
                : 'Total hours worked by staff for the selected week'
              : 'Your allocated hours for the selected week'
            }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {isAdminView ? 'Total Staff' : 'My Shifts'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isAdminView ? userHours.length : userHours[0]?.totalShifts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {isAdminView ? 'Assigned Hours' : 'My Assigned Hours'}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {isAdminView ? 'Paid Hours' : 'My Paid Hours'}
                </p>
                <p className="text-2xl font-semibold text-green-600">
                  {totalPaidHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  {isAdminView ? 'Break Deductions' : 'My Break Deductions'}
                </p>
                <p className="text-2xl font-semibold text-orange-600">
                  -{totalBreakDeductions.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hours Breakdown */}
      <Card>
        <CardHeader>
                  <CardTitle>
          {isAdminView 
            ? userRole === 'admin' 
              ? 'All Staff Hours Breakdown' 
              : 'Staff Hours Breakdown'
            : 'My Hours Breakdown'
          }
        </CardTitle>
          <CardDescription>
            Detailed breakdown of hours and shifts for the selected week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userHours.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hours recorded
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {isAdminView 
                  ? userRole === 'admin' 
                    ? 'No shifts have been created this week'
                    : 'No staff have been assigned to shifts this week'
                  : !homeId 
                    ? 'You are not assigned to any care home'
                    : 'You have not been assigned to any shifts this week'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {userHours.map((userHour) => (
                <div
                  key={userHour.user.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {userHour.user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {userHour.user.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {userHour.user.role} • {userHour.user.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Assigned Hours</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {userHour.totalHours.toFixed(1)}h
                          </p>
                        </div>
                        {userHour.breakDeductions > 0 && (
                          <div>
                            <p className="text-sm text-orange-500">Break Deductions</p>
                            <p className="text-lg font-semibold text-orange-600">
                              -{userHour.breakDeductions.toFixed(1)}h
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-green-500">Paid Hours</p>
                          <p className="text-xl font-bold text-green-600">
                            {userHour.paidHours.toFixed(1)}h
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Shifts</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {userHour.totalShifts}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shift details */}
                  {userHour.shifts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Shifts:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {userHour.shifts.map((shift) => (
                          <div
                            key={shift.id}
                            className="bg-gray-50 rounded p-2 text-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {format(new Date(shift.date), 'EEE, MMM d')}
                                </p>
                                <p className="text-gray-600">
                                  {shift.start_time} - {shift.end_time}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-gray-900">
                                  {shift.duration_hours}h
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {shift.shift_type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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

export default HoursSummary
