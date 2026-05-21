import React, { useState } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  CalendarIcon,
  XMarkIcon,
  PlusIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { Availability, ShiftType, TimeOffRequest, formatShiftTypeLabel } from '@/types'
import { getApprovedLeaveForDate, getTimeOffTypeLabel } from '@/utils/timeOff'
import { approvedLeaveBadgeClass, approvedLeaveSlotClass } from '@/utils/timeOffDisplay'
import AvailabilityFormModal from './AvailabilityFormModal'

interface AvailabilityCalendarProps {
  userId: string
  availabilities: Availability[]
  approvedLeaveRequests?: TimeOffRequest[]
  onSaveAvailability: (availability: Partial<Availability>) => Promise<void>
  onDeleteAvailability: (availabilityId: string) => Promise<void>
  canEdit: boolean
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  userId,
  availabilities,
  approvedLeaveRequests = [],
  onSaveAvailability,
  onDeleteAvailability,
  canEdit
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isAddingAvailability, setIsAddingAvailability] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState<Availability | null>(null)
  
  // Get current week dates
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Time slots for availability
  const timeSlots = [
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
    '21:00', '22:00', '23:00'
  ]

  // Filter out invalid availability records
  const validAvailabilities = availabilities.filter(availability => 
    availability && 
    availability.date && 
    availability.start_time && 
    availability.end_time
  )



  // Get availability for a specific date and time
  const getAvailabilityForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return validAvailabilities.find(availability => {
      const availabilityDate = format(parseISO(availability.date), 'yyyy-MM-dd')
      // Add safety check for start_time
      if (!availability.start_time) return false
      const availabilityStart = availability.start_time.substring(0, 5)
      return availabilityDate === dateStr && availabilityStart === time
    })
  }

  // Check if a time slot is available
  const isTimeSlotAvailable = (date: Date, time: string) => {
    const availability = getAvailabilityForSlot(date, time)
    return availability?.is_available || false
  }

  // Get preferred shift type for a time slot
  const getPreferredShiftType = (date: Date, time: string) => {
    const availability = getAvailabilityForSlot(date, time)
    return availability?.preferred_shift_type || null
  }

  // Handle adding new availability
  const handleAddAvailability = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (getApprovedLeaveForDate(dateStr, approvedLeaveRequests)) return

    setSelectedDate(date)
    setIsAddingAvailability(true)
    setEditingAvailability(null)
  }

  // Handle editing existing availability
  const handleEditAvailability = (availability: Availability) => {
    setEditingAvailability(availability)
    setIsAddingAvailability(true)
    setSelectedDate(parseISO(availability.date))
  }

  // Handle saving availability
  const handleSaveAvailability = async (data: any) => {
    try {
      if (editingAvailability) {
        await onSaveAvailability({
          id: editingAvailability.id,
          ...data
        })
      } else {
        await onSaveAvailability({
          user_id: userId,
          date: format(selectedDate!, 'yyyy-MM-dd'),
          ...data
        })
      }
      setIsAddingAvailability(false)
      setEditingAvailability(null)
      setSelectedDate(null)
    } catch (error) {
      console.error('Error saving availability:', error)
    }
  }

  // Handle deleting availability
  const handleDeleteAvailability = async (availabilityId: string) => {
    if (window.confirm('Are you sure you want to delete this availability?')) {
      try {
        await onDeleteAvailability(availabilityId)
      } catch (error) {
        console.error('Error deleting availability:', error)
      }
    }
  }

  // Get shift type color
  const getShiftTypeColor = (shiftType: ShiftType) => {
    switch (shiftType) {
      case 'morning': return 'bg-blue-100 text-blue-800 dark:bg-cyan-900/30 dark:text-white'
      case 'day': return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
      case 'afternoon': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'evening': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'night-wake':
      case 'night-sleep':
      case 'night': return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
      case 'overtime': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'long_day': return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
      case 'none': return 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-300'
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Weekly Availability</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Set your preferred availability for the week
          </p>
        </div>
        {canEdit && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedDate(now)
              setIsAddingAvailability(true)
              setEditingAvailability(null)
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Availability
          </Button>
        )}
      </div>

      {/* Availability Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Header row with day names */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 font-medium text-neutral-600 text-sm">Time</div>
                {weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const approvedLeave = getApprovedLeaveForDate(dateStr, approvedLeaveRequests)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 text-center rounded-t-md ${
                        approvedLeave ? 'bg-violet-100 dark:bg-violet-950/50' : ''
                      }`}
                    >
                      <div className={`font-medium ${approvedLeave ? 'text-violet-900 dark:text-violet-100' : 'text-neutral-950 dark:text-neutral-100'}`}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-sm ${approvedLeave ? 'text-violet-700 dark:text-violet-300' : 'text-neutral-600 dark:text-neutral-400'}`}>
                        {format(day, 'MMM d')}
                      </div>
                      {approvedLeave && (
                        <div className={`mt-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${approvedLeaveBadgeClass}`}>
                          <CalendarDaysIcon className="h-3 w-3" />
                          Leave
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Time slots and availability */}
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                  {/* Time label */}
                  <div className="p-2 text-sm text-neutral-600 dark:text-neutral-400 font-mono bg-neutral-100 dark:bg-neutral-800 border-r dark:border-neutral-700">
                    {time}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const approvedLeave = getApprovedLeaveForDate(dateStr, approvedLeaveRequests)
                    const availability = getAvailabilityForSlot(day, time)
                    const isAvailable = isTimeSlotAvailable(day, time)
                    const preferredShiftType = getPreferredShiftType(day, time)
                    const isLeaveDay = !!approvedLeave
                    const showLeaveInSlot = isLeaveDay && time === '09:00'
                    
                    return (
                      <div
                        key={`${day.toISOString()}-${time}`}
                        className={`min-h-[60px] border-b border-r relative ${
                          isLeaveDay ? approvedLeaveSlotClass : ''
                        }`}
                      >
                        {showLeaveInSlot ? (
                          <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                            <span className={`badge text-[10px] px-1.5 py-0.5 ${approvedLeaveBadgeClass}`}>
                              <CalendarDaysIcon className="h-3 w-3 inline mr-0.5" />
                              On leave
                            </span>
                            <span className="text-[10px] font-medium text-violet-800 dark:text-violet-200 leading-tight">
                              {getTimeOffTypeLabel(approvedLeave!.request_type)}
                            </span>
                          </div>
                        ) : isLeaveDay ? (
                          <div className="h-full min-h-[60px]" aria-hidden />
                        ) : availability ? (
                          // Show existing availability
                          <div className="p-2">
                            <div className="flex items-center justify-between mb-1">
                              <Badge 
                                variant={isAvailable ? 'success' : 'danger'}
                                className="text-xs"
                              >
                                {isAvailable ? 'Available' : 'Unavailable'}
                              </Badge>
                              {canEdit && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleEditAvailability(availability)}
                                  >
                                    <CalendarIcon className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() => handleDeleteAvailability(availability.id)}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {preferredShiftType && (
                              <div className="text-xs">
                                <span className={`inline-block px-2 py-1 rounded ${getShiftTypeColor(preferredShiftType)}`}>
                                  {formatShiftTypeLabel(preferredShiftType)}
                                </span>
                              </div>
                            )}
                            
                            {availability.notes && (
                              <div className="text-xs text-neutral-700 mt-1 truncate">
                                {availability.notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Empty slot - show add button if can edit
                          canEdit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-full w-full border-dashed border-neutral-400 hover:border-primary-400 hover:bg-primary-50"
                              onClick={() => handleAddAvailability(day, time)}
                            >
                              <PlusIcon className="h-4 w-4 text-neutral-500" />
                            </Button>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Form Modal */}
      {isAddingAvailability && selectedDate && (
        <AvailabilityFormModal
          isOpen={isAddingAvailability}
          onClose={() => {
            setIsAddingAvailability(false)
            setEditingAvailability(null)
            setSelectedDate(null)
          }}
          onSubmit={handleSaveAvailability}
          availability={editingAvailability}
          date={selectedDate}
          time={timeSlots[0]}
        />
      )}
    </div>
  )
}

export default AvailabilityCalendar
