import React, { useState } from 'react'
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
import { Shift, User } from '@/types'

interface RotaGridProps {
  weekStart: Date
  shifts: Shift[]
  staff: User[]
  currentUser: User
  onAddShift: (date: Date, time: string) => void
  onEditShift: (shift: Shift) => void
  onDeleteShift: (shiftId: string) => void
  onAssignStaff: (shiftId: string, userId: string) => void
  onUnassignStaff: (shiftId: string, userId: string) => void
  canEdit: boolean
  isLoading?: boolean
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
  canEdit
}) => {
  
  const [showStaffSelector, setShowStaffSelector] = useState<string | null>(null)

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
        if (currentUser.home_id) {
          const homeStaffIds = staff
            .filter(member => member.home_id === currentUser.home_id)
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

  // Get shifts for a specific date and time
  const getShiftsForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredShifts.filter(shift => {
              const shiftDate = shift.date
      const shiftStart = shift.start_time.substring(0, 5)
      return shiftDate === dateStr && shiftStart === time
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
  const handleAssignStaff = (shiftId: string, userId: string) => {
    onAssignStaff(shiftId, userId)
    setShowStaffSelector(null)
  }

  // Handle staff unassignment
  const handleUnassignStaff = (shiftId: string, userId: string) => {
    onUnassignStaff(shiftId, userId)
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
              
              return (
                <div key={`${day.toISOString()}-${time}`} className="min-h-[80px] border-b border-r relative">
                  {dayShifts.length === 0 ? (
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
                  ) : (
                    // Show shifts in this time slot
                    <div className="space-y-1 p-1">
                      {dayShifts.map((shift) => {
                        const shiftAssignments = getAssignmentsForShift(shift.id)
                        
                        return (
                          <div
                            key={shift.id}
                            className="bg-primary-50 border border-primary-200 rounded p-2 text-xs"
                          >
                            {/* Shift header */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center space-x-1">
                                <ClockIcon className="h-3 w-3 text-primary-600" />
                                <span className="font-medium text-primary-900">
                                  {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                </span>
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
                              Service: {typeof shift.service_id === 'string' ? shift.service_id : shift.service_id.name || 'Unknown Service'}
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
