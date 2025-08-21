import React, { useState } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  CalendarIcon, 
  ClockIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Availability, ShiftType } from '@/types'
import AvailabilityFormModal from './AvailabilityFormModal'

interface AvailabilityCalendarProps {
  userId: string
  availabilities: Availability[]
  onSaveAvailability: (availability: Partial<Availability>) => Promise<void>
  onDeleteAvailability: (availabilityId: string) => Promise<void>
  canEdit: boolean
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  userId,
  availabilities,
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
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00', '22:00', '23:00'
  ]

  // Filter out invalid availability records
  const validAvailabilities = availabilities.filter(availability => 
    availability && 
    availability.date && 
    availability.start_time && 
    availability.end_time
  )

  // Debug logging
  console.log('🔍 AvailabilityCalendar: Raw availabilities:', availabilities)
  console.log('🔍 AvailabilityCalendar: Valid availabilities:', validAvailabilities)
  
  // Log the first availability record structure if it exists
  if (availabilities.length > 0) {
    console.log('🔍 AvailabilityCalendar: First availability structure:', {
      id: availabilities[0].id,
      user_id: availabilities[0].user_id,
      date: availabilities[0].date,
      start_time: availabilities[0].start_time,
      end_time: availabilities[0].end_time,
      is_available: availabilities[0].is_available,
      preferred_shift_type: availabilities[0].preferred_shift_type,
      notes: availabilities[0].notes,
      allKeys: Object.keys(availabilities[0])
    })
  }

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
      case 'morning': return 'bg-blue-100 text-blue-800'
      case 'afternoon': return 'bg-green-100 text-green-800'
      case 'evening': return 'bg-purple-100 text-purple-800'
      case 'night': return 'bg-gray-100 text-gray-800'
      case 'overtime': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Weekly Availability</h3>
          <p className="text-sm text-gray-500">
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

              {/* Time slots and availability */}
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                  {/* Time label */}
                  <div className="p-2 text-sm text-gray-500 font-mono bg-gray-50 border-r">
                    {time}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const availability = getAvailabilityForSlot(day, time)
                    const isAvailable = isTimeSlotAvailable(day, time)
                    const preferredShiftType = getPreferredShiftType(day, time)
                    
                    return (
                      <div key={`${day.toISOString()}-${time}`} className="min-h-[60px] border-b border-r relative">
                        {availability ? (
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
                                  {preferredShiftType.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                            
                            {availability.notes && (
                              <div className="text-xs text-gray-600 mt-1 truncate">
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
                              className="h-full w-full border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50"
                              onClick={() => handleAddAvailability(day, time)}
                            >
                              <PlusIcon className="h-4 w-4 text-gray-400" />
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
