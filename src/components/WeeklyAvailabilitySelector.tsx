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
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { Availability, AvailabilityStatus, ShiftType, TimeOffRequest, formatShiftTypeLabel } from '@/types'
import {
  AVAILABILITY_STATUS_OPTIONS,
  availabilityBadgeVariant,
  availabilityStatusOf,
  formatAvailabilityWindow,
  windowRunsPastMidnight
} from '@/utils/availability'
import { getApprovedLeaveForDate, getTimeOffTypeLabel } from '@/utils/timeOff'
import { approvedLeaveBadgeClass, approvedLeaveDayCardClass } from '@/utils/timeOffDisplay'
import toast from 'react-hot-toast'

interface WeeklyAvailabilitySelectorProps {
  userId: string
  availabilities: Availability[]
  approvedLeaveRequests?: TimeOffRequest[]
  onSaveAvailability: (availability: Partial<Availability>) => Promise<void>
  onDeleteAvailability: (availabilityId: string) => Promise<void>
  canEdit: boolean
}

interface DayAvailability {
  date: string
  status: AvailabilityStatus
  startTime?: string
  endTime?: string
  preferredShiftType: ShiftType | null
  notes?: string
}

const WeeklyAvailabilitySelector: React.FC<WeeklyAvailabilitySelectorProps> = ({
  userId,
  availabilities,
  approvedLeaveRequests = [],
  onSaveAvailability,
  onDeleteAvailability,
  canEdit
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [defaultStatus, setDefaultStatus] = useState<AvailabilityStatus>('available')
  const [defaultStartTime, setDefaultStartTime] = useState('09:00')
  const [defaultEndTime, setDefaultEndTime] = useState('17:00')
  const [defaultShiftType, setDefaultShiftType] = useState<ShiftType>('none')
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
          status: availabilityStatusOf(dayAvailability),
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
    if (getApprovedLeaveForDate(date, approvedLeaveRequests)) {
      toast.error('This day is approved leave and cannot be edited here')
      return
    }

    const newSelectedDays = new Set(selectedDays)
    if (newSelectedDays.has(date)) {
      newSelectedDays.delete(date)
    } else {
      newSelectedDays.add(date)
    }
    setSelectedDays(newSelectedDays)
  }

  // Apply the chosen status (and, for partial days, the time slot) to every selected day.
  // Posting replaces any existing entry for that day.
  const handleApply = async () => {
    if (!canEdit || selectedDays.size === 0) return
    if (defaultStatus === 'partial' && (!defaultStartTime || !defaultEndTime || defaultStartTime === defaultEndTime)) {
      toast.error('Set a start and end time for partial availability')
      return
    }

    try {
      await Promise.all(Array.from(selectedDays).map((dateStr) =>
        onSaveAvailability({
          id: availabilities.find(a => a.date === dateStr)?.id,
          user_id: userId,
          date: dateStr,
          status: defaultStatus,
          ...(defaultStatus === 'partial' && { start_time: defaultStartTime, end_time: defaultEndTime }),
          preferred_shift_type: defaultStatus === 'unavailable' ? 'none' : defaultShiftType,
          notes: defaultNotes
        })
      ))
      setSelectedDays(new Set())
    } catch (error: any) {
      console.error('Error applying availability:', error)
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to save availability')
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
      case 'morning': return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-white'
      case 'day': return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
      case 'afternoon': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'evening': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'night-wake':
      case 'night-sleep':
      case 'night': return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
      case 'overtime': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'none': return 'bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-300'
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
            Select days, then mark them available, partially available (set times) or unavailable
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
          <CardTitle className="text-neutral-900 dark:text-white">
            Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-4 mb-6">
            {weekDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayAvailability = weekAvailability[dateStr]
              const approvedLeave = getApprovedLeaveForDate(dateStr, approvedLeaveRequests)
              const isSelected = selectedDays.has(dateStr)
              const isToday = isSameDay(day, new Date())
              
              return (
                <div
                  key={dateStr}
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    approvedLeave
                      ? `${approvedLeaveDayCardClass} ${canEdit ? 'cursor-default' : 'opacity-90'}`
                      : isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 cursor-pointer'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 cursor-pointer'
                  } ${!canEdit && !approvedLeave ? 'cursor-not-allowed opacity-50' : ''}`}
                  onClick={() => handleDayToggle(dateStr)}
                >
                  {/* Day Header */}
                  <div className="text-center mb-2">
                    <div className={`font-medium ${isToday ? 'text-primary-600 dark:text-white' : 'text-neutral-900 dark:text-neutral-100'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm ${isToday ? 'text-primary-600 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {format(day, 'MMM d')}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <CheckIcon className="h-5 w-5 text-primary-600" />
                    </div>
                  )}

                  {/* Approved leave */}
                  {approvedLeave && (
                    <div className="space-y-2">
                      <span className={`badge w-full justify-center gap-1 ${approvedLeaveBadgeClass}`}>
                        <CalendarDaysIcon className="h-3.5 w-3.5 shrink-0" />
                        On leave
                      </span>
                      <p className="text-xs font-medium text-center text-violet-800 dark:text-violet-200">
                        {getTimeOffTypeLabel(approvedLeave.request_type)}
                      </p>
                      {dayAvailability?.notes?.startsWith('Approved leave') && (
                        <p className="text-xs text-center text-violet-700/90 dark:text-violet-300/90 line-clamp-2">
                          {dayAvailability.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Availability Status */}
                  {!approvedLeave && dayAvailability && (
                    <div className="space-y-2">
                      <Badge 
                        variant={availabilityBadgeVariant[dayAvailability.status]}
                        className="text-xs w-full justify-center"
                      >
                        {AVAILABILITY_STATUS_OPTIONS.find(o => o.value === dayAvailability.status)?.label}
                      </Badge>

                      {dayAvailability.status === 'partial' && (
                        <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 text-center">
                          {formatAvailabilityWindow(dayAvailability.startTime, dayAvailability.endTime)}
                        </div>
                      )}
                      
                      {dayAvailability.status !== 'unavailable' && dayAvailability.preferredShiftType && dayAvailability.preferredShiftType !== 'none' && (
                        <div className="text-xs">
                          <span className={`inline-block px-2 py-1 rounded w-full text-center ${getShiftTypeColor(dayAvailability.preferredShiftType)}`}>
                            {formatShiftTypeLabel(dayAvailability.preferredShiftType)}
                          </span>
                        </div>
                      )}
                      
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
                  {!approvedLeave && !dayAvailability && (
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
              
              <div role="radiogroup" aria-label="Availability" className="flex flex-wrap gap-2">
                {AVAILABILITY_STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={defaultStatus === option.value}
                    variant={defaultStatus === option.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setDefaultStatus(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {defaultStatus === 'partial' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Available from
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
                        Available until
                      </label>
                      <input
                        type="time"
                        value={defaultEndTime}
                        onChange={(e) => setDefaultEndTime(e.target.value)}
                        className="input text-sm"
                      />
                      {windowRunsPastMidnight(defaultStartTime, defaultEndTime) && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Runs past midnight</p>
                      )}
                    </div>
                  </>
                )}
                
                {defaultStatus !== 'unavailable' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Preferred shift
                    </label>
                    <select
                      value={defaultShiftType}
                      onChange={(e) => setDefaultShiftType(e.target.value as ShiftType)}
                      className="input text-sm"
                    >
                      <option value="none">No preference</option>
                      <option value="morning">Morning</option>
                      <option value="day">Day</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="night-wake">Waking night</option>
                      <option value="night-sleep">Sleeping night</option>
                      <option value="overtime">Overtime</option>
                      <option value="long_day">Long Day</option>
                    </select>
                  </div>
                )}
                
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

              {defaultStatus === 'partial' && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Only shifts that start and finish inside these times can be given to this person.
                </p>
              )}
              
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleApply}
                >
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Apply
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
