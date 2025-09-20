import React, { useState } from 'react'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Availability, ShiftType } from '@/types'
import toast from 'react-hot-toast'

interface WeeklyAvailabilitySelectorProps {
  userId: string
  availabilities: Availability[]
  onSaveAvailability: (availability: Partial<Availability>) => Promise<void>
  onDeleteAvailability: (availabilityId: string) => Promise<void>
  canEdit: boolean
}

interface DayAvailability {
  date: string
  isAvailable: boolean
  startTime: string
  endTime: string
  preferredShiftType: ShiftType | null
  notes?: string
}

const WeeklyAvailabilitySelector: React.FC<WeeklyAvailabilitySelectorProps> = ({
  userId,
  availabilities,
  onSaveAvailability,
  onDeleteAvailability,
  canEdit
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [defaultStartTime, setDefaultStartTime] = useState('09:00')
  const [defaultEndTime, setDefaultEndTime] = useState('17:00')
  const [defaultShiftType, setDefaultShiftType] = useState<ShiftType>('morning')
  const [defaultNotes, setDefaultNotes] = useState('')

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Get existing availability for the current week
  const getWeekAvailability = () => {
    const weekAvailability: Record<string, DayAvailability> = {}
    
    weekDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayAvailability = availabilities.find(a => a.date === dateStr)
      
      if (dayAvailability) {
        weekAvailability[dateStr] = {
          date: dateStr,
          isAvailable: dayAvailability.is_available,
          startTime: dayAvailability.start_time,
          endTime: dayAvailability.end_time,
          preferredShiftType: dayAvailability.preferred_shift_type as ShiftType,
          notes: dayAvailability.notes
        }
      }
    })
    
    return weekAvailability
  }

  const weekAvailability = getWeekAvailability()

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  // Handle day selection
  const handleDayToggle = (date: string) => {
    if (!canEdit) return
    
    const newSelectedDays = new Set(selectedDays)
    if (newSelectedDays.has(date)) {
      newSelectedDays.delete(date)
    } else {
      newSelectedDays.add(date)
    }
    setSelectedDays(newSelectedDays)
  }

  // Handle applying availability to selected days
  const handleApplyAvailability = async () => {
    if (!canEdit || selectedDays.size === 0) return

    try {
      const promises = Array.from(selectedDays).map(async (dateStr) => {
        const existingAvailability = weekAvailability[dateStr]
        
        if (existingAvailability) {
          // Update existing availability
          return await onSaveAvailability({
            id: availabilities.find(a => a.date === dateStr)?.id,
            user_id: userId,
            date: dateStr,
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            is_available: true,
            preferred_shift_type: defaultShiftType,
            notes: defaultNotes
          })
        } else {
          // Create new availability
          return await onSaveAvailability({
            user_id: userId,
            date: dateStr,
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            is_available: true,
            preferred_shift_type: defaultShiftType,
            notes: defaultNotes
          })
        }
      })

      await Promise.all(promises)
      setSelectedDays(new Set())
      // Show success message
    } catch (error) {
      console.error('Error applying availability:', error)
    }
  }

  // Handle marking days as unavailable
  const handleMarkUnavailable = async () => {
    if (!canEdit || selectedDays.size === 0) return

    try {
      const promises = Array.from(selectedDays).map(async (dateStr) => {
        const existingAvailability = weekAvailability[dateStr]
        
        if (existingAvailability) {
          // Update existing availability
          return await onSaveAvailability({
            id: availabilities.find(a => a.date === dateStr)?.id,
            user_id: userId,
            date: dateStr,
            start_time: existingAvailability.startTime,
            end_time: existingAvailability.endTime,
            is_available: false,
            preferred_shift_type: 'none',
            notes: existingAvailability.notes
          })
        } else {
          // Create new availability as unavailable
          return await onSaveAvailability({
            user_id: userId,
            date: dateStr,
            start_time: '08:00',
            end_time: '17:00',
            is_available: false,
            preferred_shift_type: 'none',
            notes: 'Marked as unavailable'
          })
        }
      })

      await Promise.all(promises)
      setSelectedDays(new Set())
    } catch (error: any) {
      console.error('Error marking days as unavailable:', error)
      console.error('Server response:', error.response?.data)
      toast.error(error.response?.data?.error || 'Failed to mark days as unavailable')
    }
  }

  // Handle clearing availability
  const handleClearAvailability = async (dateStr: string) => {
    if (!canEdit) return

    const availability = availabilities.find(a => a.date === dateStr)
    if (availability) {
      await onDeleteAvailability(availability.id)
    }
  }

  // Get shift type color
  const getShiftTypeColor = (shiftType: ShiftType) => {
    switch (shiftType) {
      case 'morning': return 'bg-blue-100 text-blue-800 dark:bg-cyan-900/30 dark:text-cyan-300'
      case 'afternoon': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'evening': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'night': return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
      case 'overtime': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'none': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">Weekly Day Availability</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Select available days for the week and apply default availability settings
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousWeek}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
          >
            Current Week
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextWeek}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week Display */}
      <Card>
        <CardHeader>
          <CardTitle>
            Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-4 mb-6">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayAvailability = weekAvailability[dateStr]
              const isSelected = selectedDays.has(dateStr)
              const isToday = isSameDay(day, new Date())
              
              return (
                <div
                  key={dateStr}
                  className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                  } ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => handleDayToggle(dateStr)}
                >
                  {/* Day Header */}
                  <div className="text-center mb-2">
                    <div className={`font-medium ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {format(day, 'MMM d')}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="h-5 w-5 text-primary-600" />
                    </div>
                  )}

                  {/* Availability Status */}
                  {dayAvailability && (
                    <div className="space-y-2">
                      <Badge 
                        variant={dayAvailability.isAvailable ? 'success' : 'danger'}
                        className="text-xs w-full justify-center"
                      >
                        {dayAvailability.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                      
                      {dayAvailability.preferredShiftType && (
                        <div className="text-xs">
                          <span className={`inline-block px-2 py-1 rounded w-full text-center ${getShiftTypeColor(dayAvailability.preferredShiftType)}`}>
                            {dayAvailability.preferredShiftType.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
                        {dayAvailability.startTime} - {dayAvailability.endTime}
                      </div>
                      
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClearAvailability(dateStr)
                          }}
                        >
                          <XMarkIcon className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {!dayAvailability && (
                    <div className="text-center text-neutral-400 dark:text-neutral-500 text-sm">
                      No availability set
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Default Settings */}
          {canEdit && selectedDays.size > 0 && (
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                Apply to {selectedDays.size} selected day{selectedDays.size !== 1 ? 's' : ''}:
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={defaultEndTime}
                    onChange={(e) => setDefaultEndTime(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Shift Type
                  </label>
                  <select
                    value={defaultShiftType}
                    onChange={(e) => setDefaultShiftType(e.target.value as ShiftType)}
                    className="input text-sm"
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="overtime">Overtime</option>
                    <option value="long_day">Long Day</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={defaultNotes}
                    onChange={(e) => setDefaultNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="input text-sm"
                  />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApplyAvailability}
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Mark as Available
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkUnavailable}
                >
                  <XMarkIcon className="h-4 w-4 mr-2" />
                  Mark as Unavailable
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDays(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WeeklyAvailabilitySelector
