import React, { useState, useEffect } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { XMarkIcon, CalendarIcon, ClockIcon, UsersIcon, ExclamationTriangleIcon, CheckCircleIcon, ViewColumnsIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import { Timetable } from '@/types'
import { homesApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

interface TimetableViewModalProps {
  isOpen: boolean
  onClose: () => void
  timetable: Timetable
  userFilter?: boolean // If true, only show shifts assigned to current user
}

const TimetableViewModal: React.FC<TimetableViewModalProps> = ({
  isOpen,
  onClose,
  timetable,
  userFilter = false
}) => {
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [homes, setHomes] = useState<any[]>([])
  const [homesLoading, setHomesLoading] = useState(false)
  const { user } = useAuth()

  // Fetch homes data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchHomes()
    }
  }, [isOpen])

  const fetchHomes = async () => {
    try {
      setHomesLoading(true)
      const homesData = await homesApi.getAll()
      setHomes(homesData || [])
    } catch (error) {
      console.error('Failed to fetch homes:', error)
      setHomes([])
    } finally {
      setHomesLoading(false)
    }
  }

  // Helper function to get home name by ID
  const getHomeName = (homeId: string) => {
    if (homesLoading) return 'Loading...'
    const home = homes.find(h => h.id === homeId)
    return home ? home.name : `Home ${homeId}`
  }

  // Helper function to get home name with location
  const getHomeNameWithLocation = (homeId: string) => {
    if (homesLoading) return 'Loading...'
    const home = homes.find(h => h.id === homeId)
    if (!home) return `Home ${homeId}`
    return home.location ? `${home.name} (${home.location.city})` : home.name
  }

  if (!isOpen) return null

  const currentWeek = timetable.weekly_rotas[selectedWeek]
  
  // Filter shifts based on user filter
  const filteredShifts = userFilter && user
    ? currentWeek.shifts.filter((shift: any) =>
        shift.assigned_staff.some((staff: any) =>
          staff.user_id === user.id
        )
      )
    : currentWeek.shifts

  // Calculate filtered statistics
  const filteredStats = userFilter ? {
    total_shifts: filteredShifts.length,
    total_hours: filteredShifts.reduce((total: number, shift: any) => total + (shift.duration_hours || 0), 0),
    total_assignments: filteredShifts.reduce((total: number, shift: any) => total + (shift.assigned_staff?.length || 0), 0)
  } : {
    total_shifts: currentWeek.total_shifts,
    total_hours: currentWeek.total_hours,
    total_assignments: currentWeek.total_assignments
  }
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'generating': return 'warning'
      case 'generated': return 'primary'
      case 'published': return 'success'
      case 'archived': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <CalendarIcon className="h-4 w-4" />
      case 'generating': return <ClockIcon className="h-4 w-4 animate-spin" />
      case 'generated': return <CheckCircleIcon className="h-4 w-4" />
      case 'published': return <CheckCircleIcon className="h-4 w-4" />
      case 'archived': return <XMarkIcon className="h-4 w-4" />
      default: return <CalendarIcon className="h-4 w-4" />
    }
  }

  // Timetable Grid Component
  const TimetableGrid: React.FC<{ week: any }> = ({ week }) => {
    if (!week) return null
    
    if (homesLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">Loading home information...</div>
        </div>
      )
    }

    // Group shifts by home
    const shiftsByHome: { [homeId: string]: any[] } = {}
    
    // Filter shifts based on userFilter
    const filteredShifts = userFilter && user 
      ? week.shifts.filter((shift: any) => 
          shift.assigned_staff.some((staff: any) => 
            staff.user_id === user.id
          )
        )
      : week.shifts
    
    filteredShifts.forEach((shift: any) => {
      const homeId = shift.home_id
      if (!shiftsByHome[homeId]) {
        shiftsByHome[homeId] = []
      }
      shiftsByHome[homeId].push(shift)
    })

    // Generate week days
    const weekStart = parseISO(week.week_start_date)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    // Time slots for the day (based on actual shift times)
    const allTimes = new Set<string>()
    week.shifts.forEach((shift: any) => {
      allTimes.add(shift.start_time.substring(0, 5))
    })
    const timeSlots = Array.from(allTimes).sort()

    return (
      <div className="space-y-6">
        {/* Grid View Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-blue-900">Grid View Summary</h5>
            {userFilter && (
              <Badge variant="primary" className="text-xs">
                Showing only your assignments
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700 font-medium">Homes:</span>
              <span className="ml-1 text-blue-600">{Object.keys(shiftsByHome).length}</span>
              <div className="text-xs text-blue-500 mt-1">
                {Object.keys(shiftsByHome).map(homeId => getHomeNameWithLocation(homeId)).join(', ')}
              </div>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Total Shifts:</span>
              <span className="ml-1 text-blue-600">{filteredShifts.length}</span>
              {userFilter && filteredShifts.length !== week.shifts.length && (
                <span className="text-xs text-blue-500 ml-1">(filtered)</span>
              )}
            </div>
            <div>
              <span className="text-blue-700 font-medium">Time Slots:</span>
              <span className="ml-1 text-blue-600">{timeSlots.length}</span>
            </div>
            <div>
              <span className="text-blue-700 font-medium">Total Assignments:</span>
              <span className="ml-1 text-blue-600">{week.total_assignments}</span>
            </div>
          </div>
        </div>

        {Object.entries(shiftsByHome).map(([homeId, shifts]) => (
          <div key={homeId} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">
                  {getHomeName(homeId)}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{shifts.length} shifts</span>
                  <span>{shifts.reduce((total, shift) => total + shift.assigned_staff.length, 0)} assignments</span>
                  <span>{shifts.reduce((total, shift) => total + shift.duration_hours * shift.assigned_staff.length, 0)}h total</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Header row with day names */}
                <div className="grid grid-cols-8 gap-1 mb-2 bg-gray-100">
                  <div className="p-2 font-medium text-gray-500 text-sm">Time</div>
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className="p-2 text-center">
                      <div className="font-medium text-gray-900">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(day, 'MMM d')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time slots and shifts */}
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                    {/* Time label */}
                    <div className="p-2 text-sm text-gray-500 font-mono bg-gray-50 border-r">
                      {time}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day) => {
                      const dayShifts = shifts.filter((shift: any) => {
                        const shiftDate = shift.date
                        const shiftStart = shift.start_time.substring(0, 5)
                        return shiftDate === format(day, 'yyyy-MM-dd') && shiftStart === time
                      })
                      
                      return (
                        <div key={`${day.toISOString()}-${time}`} className="min-h-[60px] border-b border-r relative">
                          {dayShifts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-300 text-xs">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1 p-1">
                              {dayShifts.map((shift: any) => (
                                <div
                                  key={shift.shift_id}
                                  className="rounded p-2 text-xs bg-blue-50 border border-blue-200"
                                >
                                  {/* Shift header */}
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center space-x-1">
                                      <ClockIcon className="h-3 w-3 text-blue-600" />
                                      <span className="font-medium text-blue-900">
                                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                      </span>
                                    </div>
                                    <Badge 
                                      variant={shift.assigned_staff.length >= shift.required_staff_count ? 'success' : 'warning'}
                                      className="text-xs"
                                    >
                                      {shift.assigned_staff.length}/{shift.required_staff_count}
                                    </Badge>
                                  </div>

                                  {/* Staff assignments */}
                                  <div className="space-y-1">
                                    {shift.assigned_staff.map((staff: any, index: number) => (
                                      <div
                                        key={`${shift.shift_id}-${staff.user_id}-${index}`}
                                        className="flex items-center bg-white rounded px-2 py-1 border"
                                      >
                                        <UsersIcon className="h-3 w-3 text-gray-500 mr-1" />
                                        <span className="text-gray-700 text-xs">
                                          {staff.name}
                                        </span>
                                        <Badge variant="secondary" className="text-xs ml-1">
                                          {staff.type}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{timetable.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {format(parseISO(timetable.start_date), 'MMM d, yyyy')} - {format(parseISO(timetable.end_date), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={getStatusBadgeVariant(timetable.status)}>
              {getStatusIcon(timetable.status)}
              <span className="ml-1 capitalize">{timetable.status}</span>
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Timetable Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Weeks</p>
                  <p className="text-2xl font-bold text-gray-900">{timetable.total_weeks}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold text-gray-900">{timetable.total_shifts}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold text-gray-900">{timetable.total_hours}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center">
                <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Assignments</p>
                  <p className="text-2xl font-bold text-gray-900">{timetable.total_assignments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicts and Errors */}
          {(timetable.conflicts_detected > 0 || timetable.generation_errors.length > 0) && (
            <div className="space-y-3">
              {timetable.conflicts_detected > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {timetable.conflicts_detected} conflicts detected
                      </p>
                      <p className="text-sm text-red-600">
                        This timetable cannot be published until conflicts are resolved.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {timetable.generation_errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {timetable.generation_errors.length} generation errors
                      </p>
                      <div className="mt-2 space-y-1">
                        {timetable.generation_errors.map((error, index) => (
                          <p key={index} className="text-sm text-red-600">
                            Week {error.week}: {error.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Week Navigation */}
          {timetable.weekly_rotas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Weekly Breakdown</h3>
                <div className="flex items-center space-x-3">
                  {/* View Mode Selector */}
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'list' ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="px-3 py-1"
                    >
                      <ListBulletIcon className="h-4 w-4 mr-1" />
                      List
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="px-3 py-1"
                    >
                      <ViewColumnsIcon className="h-4 w-4 mr-1" />
                      Grid
                    </Button>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                      disabled={selectedWeek === 0}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Week {selectedWeek + 1} of {timetable.weekly_rotas.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWeek(Math.min(timetable.weekly_rotas.length - 1, selectedWeek + 1))}
                      disabled={selectedWeek === timetable.weekly_rotas.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              {/* Week Selector */}
              <div className="flex flex-wrap gap-2">
                {timetable.weekly_rotas.map((week, index) => (
                  <Button
                    key={index}
                    variant={selectedWeek === index ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedWeek(index)}
                  >
                    Week {index + 1}
                  </Button>
                ))}
              </div>

              {/* Selected Week Details */}
              {currentWeek && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        Week {currentWeek.week_number}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(parseISO(currentWeek.week_start_date), 'MMM d')} - {format(parseISO(currentWeek.week_end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{filteredStats.total_shifts} shifts</span>
                      <span>{filteredStats.total_hours} hours</span>
                      <span>{filteredStats.total_assignments} assignments</span>
                    </div>
                  </div>

                  {/* Employment Distribution */}
                  <div className="mb-6">
                    <h5 className="text-sm font-medium text-gray-900 mb-3">Employment Distribution</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">Full-time</p>
                        <p className="text-lg font-bold text-blue-900">{currentWeek.employment_distribution.fulltime.staff_count}</p>
                        <p className="text-xs text-blue-700">{currentWeek.employment_distribution.fulltime.total_hours}h total</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-green-900">Part-time</p>
                        <p className="text-lg font-bold text-green-900">{currentWeek.employment_distribution.parttime.staff_count}</p>
                        <p className="text-xs text-green-700">{currentWeek.employment_distribution.parttime.total_hours}h total</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-purple-900">Bank</p>
                        <p className="text-lg font-bold text-purple-900">{currentWeek.employment_distribution.bank.staff_count}</p>
                        <p className="text-xs text-purple-700">{currentWeek.employment_distribution.bank.total_hours}h total</p>
                      </div>
                    </div>
                  </div>

                  {/* Conditional Rendering: Grid View or List View */}
                  {viewMode === 'grid' ? (
                    <TimetableGrid week={currentWeek} />
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-gray-900">
                          Shifts ({userFilter ? filteredShifts.length : currentWeek.shifts.length})
                        </h5>
                        {userFilter && (
                          <Badge variant="primary" className="text-xs">
                            Showing only your assignments
                          </Badge>
                        )}
                      </div>
                      {filteredShifts.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          {userFilter ? 'No shifts assigned to you this week' : 'No shifts for this week'}
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {filteredShifts.map((shift) => (
                            <div key={shift.shift_id} className="border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {format(parseISO(shift.date), 'MMM d')} - {shift.start_time} to {shift.end_time}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {shift.shift_type} • {shift.required_staff_count} staff needed • {shift.duration_hours}h
                                  </p>
                                </div>
                                <Badge variant={shift.assigned_staff.length >= shift.required_staff_count ? 'success' : 'warning'}>
                                  {shift.assigned_staff.length}/{shift.required_staff_count}
                                </Badge>
                              </div>
                              
                              {shift.assigned_staff.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1">Assigned Staff:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {shift.assigned_staff.map((staff, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {staff.name} ({staff.type})
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generation Info */}
          {timetable.generation_started_at && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Generation Information</h5>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p>Started: {format(parseISO(timetable.generation_started_at), 'MMM d, yyyy HH:mm')}</p>
                  {timetable.generation_completed_at && (
                    <p>Completed: {format(parseISO(timetable.generation_completed_at), 'MMM d, yyyy HH:mm')}</p>
                  )}
                </div>
                {timetable.generation_duration_ms && (
                  <div>
                    <p>Duration: {Math.round(timetable.generation_duration_ms / 1000)}s</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TimetableViewModal
