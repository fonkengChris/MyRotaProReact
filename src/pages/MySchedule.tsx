import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { shiftsApi, homesApi, servicesApi } from '@/lib/api'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { extractUserDefaultHomeId } from '@/types'
import { Shift, Home, Service, extractServiceId } from '@/types'

const MySchedule: React.FC = () => {
  const { user } = useAuth()
  
  // Parse week start date from URL or use current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  })

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Fetch user's assigned shifts for the current week
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['myShifts', format(currentWeekStart, 'yyyy-MM-dd'), user?.id],
    queryFn: () => shiftsApi.getAll({
      start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user?.id,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Get user's home ID (for services fetching)
  const userHomeId = user ? extractUserDefaultHomeId(user) : undefined

  // Fetch services for shift details
  const { data: services = [] } = useQuery({
    queryKey: ['services', userHomeId],
    queryFn: () => servicesApi.getAll(userHomeId!),
    enabled: !!userHomeId,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Filter shifts to only show those assigned to the current user
  const myShifts = shifts.filter(shift => 
    shift.assigned_staff?.some(assignment => assignment.user_id === user?.id)
  ) || []

  // Get unique home IDs from shifts
  const uniqueHomeIds = [...new Set(myShifts.map(shift => {
    if (typeof shift.home_id === 'string') {
      return shift.home_id
    } else if (shift.home_id && typeof shift.home_id === 'object' && shift.home_id.id) {
      return shift.home_id.id
    }
    return null
  }).filter(Boolean))]

  // Fetch homes data for all shifts
  const { data: homes = [] } = useQuery({
    queryKey: ['homes', uniqueHomeIds],
    queryFn: async () => {
      if (uniqueHomeIds.length === 0) return []
      const homesData = await Promise.all(
        uniqueHomeIds.map(homeId => homesApi.getById(homeId!))
      )
      return homesData.filter(Boolean)
    },
    enabled: uniqueHomeIds.length > 0,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Get home information from shift data
  const getHomeFromShift = (shift: Shift) => {
    // If home_id is already a populated object
    if (shift.home_id && typeof shift.home_id === 'object' && shift.home_id.name) {
      return {
        name: shift.home_id.name,
        location: { city: shift.home_id.location.city }
      }
    }
    
    // If home_id is a string ID, find the home in the fetched homes data
    if (typeof shift.home_id === 'string') {
      const home = homes.find(h => h.id === shift.home_id)
      if (home) {
        return {
          name: home.name,
          location: { city: home.location.city }
        }
      }
    }
    
    return null
  }

  // Get service name by ID
  const getServiceName = (serviceId: string | { id: string; name: string; category: string }): string => {
    const serviceIdStr = extractServiceId(serviceId)
    if (serviceIdStr) {
      const service = services?.find(s => s.id === serviceIdStr)
      return service?.name || 'Unknown Service'
    }
    return 'Unknown Service'
  }

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToCurrentWeek = () => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    setCurrentWeekStart(weekStart)
  }

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return myShifts.filter(shift => shift.date === dateStr)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
      {/* Header with Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">My Schedule</h1>
          <p className="text-gray-600 mt-1">
            View your weekly work schedule and assigned shifts
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

      {/* Home Info */}
      {/* Home Info */}

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
                Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(currentWeekStart, 'EEEE, MMMM d')} to {format(currentWeekEnd, 'EEEE, MMMM d, yyyy')}
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

      {/* Weekly Schedule Grid */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Weekly Schedule</CardTitle>
          <CardDescription>
            Your assigned shifts for this week
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 py-6">
          {myShifts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Shifts This Week</h3>
              <p className="text-gray-500">
                You don't have any shifts assigned for this week.
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-6 min-w-[2000px]">
                {weekDays.map((day) => {
                  const dayShifts = getShiftsForDate(day)
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  
                  return (
                    <div key={day.toISOString()} className="min-h-[300px] min-w-[280px]">
                    <div className={`text-center p-4 rounded-t-lg border-b-2 ${
                      isToday ? 'bg-primary-100 text-primary-900 border-primary-300' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      <div className="font-bold text-lg mb-1">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-base font-medium">
                        {format(day, 'MMM d')}
                      </div>
                      {isToday && (
                        <div className="text-sm mt-2 font-bold bg-primary-200 text-primary-800 px-2 py-1 rounded-full">Today</div>
                      )}
                    </div>
                    
                    <div className="border border-gray-200 rounded-b-lg p-3 min-h-[250px]">
                      {dayShifts.length === 0 ? (
                        <div className="text-center text-gray-400 py-12">
                          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <ClockIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-500">No shifts today</p>
                          <p className="text-xs text-gray-400 mt-1">Enjoy your day off!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                                                      {dayShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className="bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1"
                              >
                                {/* Time Header */}
                                <div className="flex items-center justify-between mb-5">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-gradient-to-br from-primary-200 to-primary-300 rounded-xl shadow-sm">
                                      <ClockIcon className="h-6 w-6 text-primary-800" />
                                    </div>
                                    <div>
                                      <div className="text-xl font-bold text-primary-900 mb-1">
                                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                      </div>
                                      <div className="text-sm text-primary-600 font-medium bg-primary-100 px-2 py-1 rounded-full">
                                        {(() => {
                                          const start = new Date(`2000-01-01T${shift.start_time}`)
                                          const end = new Date(`2000-01-01T${shift.end_time}`)
                                          const diffMs = end.getTime() - start.getTime()
                                          const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10
                                          return `${diffHours} hours`
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="primary" className="text-sm px-3 py-1.5 bg-primary-600 border-primary-700">
                                    {shift.required_staff_count || 1} Staff
                                  </Badge>
                                </div>
                                
                                {/* Service Information */}
                                <div className="mb-4">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                                    <span className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
                                      Service
                                    </span>
                                  </div>
                                  <div className="text-base font-medium text-primary-900 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-white/20">
                                    {getServiceName(shift.service_id)}
                                  </div>
                                </div>
                                
                                {/* Address Information */}
                                {getHomeFromShift(shift) && (
                                  <div className="mb-4">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                                      <span className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
                                        Location
                                      </span>
                                    </div>
                                    <div className="flex items-start space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2.5 border border-white/20">
                                      <MapPinIcon className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                                      <div className="text-sm text-primary-900">
                                        <div className="font-medium">{getHomeFromShift(shift)?.name}</div>
                                        <div className="text-primary-700">
                                          {getHomeFromShift(shift)?.location.city}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Shift Type Badge */}
                                <div className="flex justify-end pt-2">
                                  <Badge 
                                    variant="secondary" 
                                    className="text-xs px-3 py-1.5 bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 border border-primary-300 font-medium"
                                  >
                                    {shift.shift_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Standard'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {myShifts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{myShifts.length}</p>
                <p className="text-sm text-gray-600">Total Shifts</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success-600">
                  {myShifts.reduce((total, shift) => {
                    const start = new Date(`2000-01-01T${shift.start_time}`)
                    const end = new Date(`2000-01-01T${shift.end_time}`)
                    const diffMs = end.getTime() - start.getTime()
                    const diffHours = diffMs / (1000 * 60 * 60)
                    return total + diffHours
                  }, 0).toFixed(1)}
                </p>
                <p className="text-sm text-gray-600">Total Hours</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-600">
                  {myShifts.filter(shift => 
                    format(new Date(shift.date + 'T00:00:00'), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  ).length}
                </p>
                <p className="text-sm text-gray-600">Shifts Today</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MySchedule
