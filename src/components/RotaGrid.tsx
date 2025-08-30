import React, { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Shift, User, extractServiceId, extractServiceName, WeeklySchedule } from '@/types'
import { weeklySchedulesApi } from '@/lib/api'

interface RotaGridProps {
  weekStart: Date
  shifts: Shift[]
  staff: User[]
  currentUser: User
  onAddShift: (date: Date, time: string) => void
  onEditShift: (shift: Shift) => void
  onDeleteShift: (shiftId: string) => void
  onAssignStaff: (shiftId: string, userId: string) => Promise<{ success: boolean; error?: string }>
  onUnassignStaff: (shiftId: string, userId: string) => void
  canEdit: boolean
  isLoading?: boolean
  conflicts?: any[]
  homeId: string // Add homeId prop
  onCreateShiftsFromSchedule?: () => Promise<void> // Add callback for creating shifts
}

const RotaGrid: React.FC<RotaGridProps> = ({
  weekStart,
  shifts,
  staff,
  currentUser,
  onAddShift,
  onEditShift,
  onDeleteShift,
  onAssignStaff,
  onUnassignStaff,
  canEdit,
  conflicts = [],
  homeId,
  onCreateShiftsFromSchedule
}) => {
  
  const [showStaffSelector, setShowStaffSelector] = useState<string | null>(null)
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null)
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)
  const [isCreatingShifts, setIsCreatingShifts] = useState(false)

  // Load weekly schedule when homeId changes
  useEffect(() => {
    if (homeId) {
      loadWeeklySchedule()
    }
  }, [homeId])

  // Auto-create shifts from weekly schedule when no shifts exist
  useEffect(() => {
    if (weeklySchedule && shifts.length === 0 && onCreateShiftsFromSchedule && canEdit) {
      // Check if weekly schedule has any active shifts
      const hasActiveShifts = Object.values(weeklySchedule.schedule).some(day => 
        day.is_active && day.shifts.length > 0
      )
      
      if (hasActiveShifts) {
        console.log('Auto-creating shifts from weekly schedule...')
        setIsCreatingShifts(true)
        onCreateShiftsFromSchedule()
          .then(() => {
            setIsCreatingShifts(false)
          })
          .catch(() => {
            setIsCreatingShifts(false)
          })
      }
    }
  }, [weeklySchedule, shifts.length, onCreateShiftsFromSchedule, canEdit])

  const loadWeeklySchedule = async () => {
    try {
      setIsLoadingSchedule(true)
      const schedule = await weeklySchedulesApi.getByHome(homeId)
      setWeeklySchedule(schedule)
    } catch (error) {
      console.error('Failed to load weekly schedule:', error)
      // If no weekly schedule exists, create empty structure
      setWeeklySchedule(null)
    } finally {
      setIsLoadingSchedule(false)
    }
  }

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Time slots for the day
  const timeSlots = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
    '21:00', '22:00', '23:00'
  ]

  // Filter shifts based on user role and permissions
  const getFilteredShifts = () => {
    if (!currentUser) return shifts

    switch (currentUser.role) {
      case 'admin':
      case 'home_manager':
        // Admins and managers see all shifts
        return shifts
      
      case 'senior_staff':
        // Senior staff see shifts for all users in their home
        if (currentUser.homes && currentUser.homes.length > 0) {
          const userHomeIds = currentUser.homes.map(home => home.home_id)
          const homeStaffIds = staff
            .filter(member => member.homes && member.homes.some(home => userHomeIds.includes(home.home_id)))
            .map(member => member.id)
          
          return shifts.filter(shift => {
            // Check if the shift has any assignments to users in the same home
            return shift.assigned_staff && shift.assigned_staff.some(assignment => 
              homeStaffIds.includes(assignment.user_id)
            )
          })
        }
        return []
      
      case 'support_worker':
        // Regular users only see shifts allocated to themselves
        return shifts.filter(shift => {
          return shift.assigned_staff && shift.assigned_staff.some(assignment => 
            assignment.user_id === currentUser.id
          )
        })
      
      default:
        return []
    }
  }

  const filteredShifts = getFilteredShifts()

  // Check if a shift has conflicts
  const hasShiftConflicts = (shiftId: string) => {
    return conflicts.some(conflict => conflict.shift?.id === shiftId)
  }

  // Get shifts for a specific date and time
  const getShiftsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredShifts.filter(shift => {
      const shiftDate = shift.date
      const shiftStart = shift.start_time.substring(0, 5)
      return shiftDate === dateStr && shiftStart === time
    })
  }

  // Get weekly schedule shifts for a specific date and time
  const getWeeklyScheduleShiftsForSlot = (date: Date, time: string) => {
    if (!weeklySchedule) return []
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayName = dayNames[date.getDay()]
    const daySchedule = weeklySchedule.schedule[dayName as keyof typeof weeklySchedule.schedule]
    
    if (!daySchedule || !daySchedule.is_active) return []
    
    return daySchedule.shifts.filter(shift => {
      const shiftStart = shift.start_time.substring(0, 5)
      return shiftStart === time
    })
  }

  // Get assignments for a shift
  const getAssignmentsForShift = (shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId)
    return shift?.assigned_staff || []
  }

  // Get staff member by ID
  const getStaffMember = (userId: string) => {
    return staff.find(member => member.id === userId)
  }

  // Handle staff assignment
  const handleAssignStaff = async (shiftId: string, userId: string) => {
    try {
      const result = await onAssignStaff(shiftId, userId)
      if (result.success) {
        setShowStaffSelector(null)
      } else {
        // Error will be handled by the parent component via toast
        console.error('Staff assignment failed:', result.error)
      }
    } catch (error) {
      console.error('Unexpected error during staff assignment:', error)
    }
  }

  // Handle staff unassignment
  const handleUnassignStaff = (shiftId: string, userId: string) => {
    onUnassignStaff(shiftId, userId)
  }

  // Check if a slot has weekly schedule shifts
  const hasWeeklyScheduleShifts = (date: Date, time: string) => {
    const weeklyShifts = getWeeklyScheduleShiftsForSlot(date, time)
    return weeklyShifts.length > 0
  }

  // Get the first weekly schedule shift for a slot (for display purposes)
  const getFirstWeeklyScheduleShift = (date: Date, time: string) => {
    const weeklyShifts = getWeeklyScheduleShiftsForSlot(date, time)
    return weeklyShifts[0] || null
  }

  if (isLoadingSchedule || isCreatingShifts) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
        <div className="ml-3 text-gray-600">
          {isCreatingShifts ? 'Creating shifts from weekly schedule...' : 'Loading weekly schedule...'}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header row with day names */}
        <div className="grid grid-cols-8 gap-1 mb-2">
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
              const dayShifts = getShiftsForSlot(day, time)
              const hasWeeklySchedule = hasWeeklyScheduleShifts(day, time)
              const weeklyShift = getFirstWeeklyScheduleShift(day, time)
              
              return (
                <div key={`${day.toISOString()}-${time}`} className="min-h-[80px] border-b border-r relative">
                  {dayShifts.length === 0 ? (
                    // No actual shifts - show weekly schedule if exists, otherwise add button
                    hasWeeklySchedule ? (
                      // Show weekly schedule shift template
                      <div className="p-2 text-xs bg-gray-100 border border-gray-300 rounded">
                        <div className="text-gray-600 mb-1">
                          <ClockIcon className="inline h-3 w-3 mr-1" />
                          {weeklyShift?.start_time.substring(0, 5)} - {weeklyShift?.end_time.substring(0, 5)}
                        </div>
                        <div className="text-gray-500 mb-1">
                          {weeklyShift?.shift_type} • {weeklyShift?.required_staff_count} staff needed
                        </div>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 w-full text-xs border-dashed border-gray-400 hover:border-primary-400 hover:bg-primary-50"
                            onClick={() => onAddShift(day, time)}
                          >
                            <PlusIcon className="h-3 w-3 mr-1" />
                            Create Shift
                          </Button>
                        )}
                      </div>
                    ) : (
                      // Empty slot - show add button if can edit
                      canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-full w-full border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50"
                          onClick={() => onAddShift(day, time)}
                        >
                          <PlusIcon className="h-4 w-4 text-gray-400" />
                        </Button>
                      )
                    )
                  ) : (
                    // Show shifts in this time slot
                    <div className="space-y-1 p-1">
                      {dayShifts.map((shift) => {
                        const shiftAssignments = getAssignmentsForShift(shift.id)
                        
                        return (
                          <div
                            key={shift.id}
                            className={`rounded p-2 text-xs ${
                              hasShiftConflicts(shift.id)
                                ? 'bg-red-50 border-2 border-red-300'
                                : 'bg-primary-50 border border-primary-200'
                            }`}
                          >
                            {/* Shift header */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-1">
                                <ClockIcon className="h-3 w-3 text-primary-600" />
                                <span className="font-medium text-primary-900">
                                  {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                </span>
                                {hasShiftConflicts(shift.id) && (
                                  <Badge variant="danger" className="text-xs ml-2">
                                    Conflict
                                  </Badge>
                                )}
                              </div>
                              {canEdit && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => onEditShift(shift)}
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => onDeleteShift(shift.id)}
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Service info */}
                            <div className="text-primary-700 mb-2">
                              Service: {extractServiceName(shift.service_id) || 'Unknown Service'}
                            </div>

                            {/* Staff assignments */}
                            <div className="space-y-1">
                              {shiftAssignments.map((assignment, index) => {
                                const staffMember = getStaffMember(assignment.user_id)
                                return (
                                  <div
                                    key={`${shift.id}-${assignment.user_id}-${index}`}
                                    className="flex items-center justify-between bg-white rounded px-2 py-1 border"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <UserIcon className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-700">
                                        {staffMember?.name || 'Unknown Staff'}
                                      </span>
                                    </div>
                                    {canEdit && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-4 w-4 p-0"
                                        onClick={() => handleUnassignStaff(shift.id, assignment.user_id)}
                                      >
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Add staff button */}
                              {canEdit && (
                                <div className="relative">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-full text-xs border-dashed"
                                    onClick={() => setShowStaffSelector(shift.id)}
                                  >
                                    <PlusIcon className="h-3 w-3 mr-1" />
                                    Add Staff
                                  </Button>

                                  {/* Staff selector dropdown */}
                                  {showStaffSelector === shift.id && (
                                    <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                                      <div className="p-2 max-h-32 overflow-y-auto">
                                        {staff
                                          .filter(member => member.is_active)
                                          .filter(member => !shiftAssignments.some(a => a.user_id === member.id))
                                          .map(member => (
                                            <button
                                              key={member.id}
                                              className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                                              onClick={() => handleAssignStaff(shift.id, member.id)}
                                            >
                                              <div className="flex items-center space-x-2">
                                                <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                                                  <span className="text-xs font-medium text-primary-700">
                                                    {member.name.charAt(0)}
                                                  </span>
                                                </div>
                                                <span>{member.name}</span>
                                              </div>
                                            </button>
                                          ))}
                                        {staff.filter(member => 
                                          member.is_active && 
                                          !shiftAssignments.some(a => a.user_id === member.id)
                                        ).length === 0 && (
                                          <div className="px-2 py-1 text-sm text-gray-500">
                                            No available staff
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Shift status */}
                            <div className="mt-2">
                              <Badge 
                                variant={shiftAssignments.length >= (shift.required_staff_count || 1) ? 'success' : 'warning'}
                                className="text-xs"
                              >
                                {shiftAssignments.length}/{shift.required_staff_count || 1} Staff
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default RotaGrid
