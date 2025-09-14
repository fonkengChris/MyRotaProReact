import React, { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  ClockIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Shift, User } from '@/types'
import { shiftsApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface ShiftSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  availableShifts: Shift[]
  currentUser: User
  onShiftSelected: (shiftId: string) => void
  isLoading?: boolean
}

const ShiftSelectionModal: React.FC<ShiftSelectionModalProps> = ({
  isOpen,
  onClose,
  availableShifts,
  currentUser,
  onShiftSelected,
  isLoading = false
}) => {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [conflicts, setConflicts] = useState<{[shiftId: string]: string}>({})

  // Check for conflicts when shifts change
  useEffect(() => {
    if (availableShifts.length > 0) {
      checkConflictsForShifts()
    }
  }, [availableShifts])

  const checkConflictsForShifts = async () => {
    const conflictMap: {[shiftId: string]: string} = {}
    
    for (const shift of availableShifts) {
      try {
        // Check if user already has shifts on the same date
        const userShifts = await shiftsApi.getAll({
          user_id: currentUser.id,
          date: shift.date
        })
        
        // Check for time conflicts
        const hasConflict = userShifts.some(userShift => {
          if (userShift.id === shift.id) return false // Skip the same shift
          
          const userStart = new Date(`2000-01-01T${userShift.start_time}`)
          const userEnd = new Date(`2000-01-01T${userShift.end_time}`)
          const shiftStart = new Date(`2000-01-01T${shift.start_time}`)
          const shiftEnd = new Date(`2000-01-01T${shift.end_time}`)
          
          // Handle overnight shifts
          if (userEnd < userStart) userEnd.setDate(userEnd.getDate() + 1)
          if (shiftEnd < shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1)
          
          // Check for overlap
          return !(userEnd <= shiftStart || shiftEnd <= userStart)
        })
        
        if (hasConflict) {
          conflictMap[shift.id] = 'Time conflict with existing shift'
        }
        
        // Check for insufficient rest period (8 hours minimum)
        const hasInsufficientRest = userShifts.some(userShift => {
          if (userShift.id === shift.id) return false
          
          const restPeriod = calculateRestPeriod(userShift, shift)
          return restPeriod < 8
        })
        
        if (hasInsufficientRest) {
          conflictMap[shift.id] = 'Insufficient rest period (less than 8 hours)'
        }
        
      } catch (error) {
        console.error('Error checking conflicts for shift:', shift.id, error)
      }
    }
    
    setConflicts(conflictMap)
  }

  const calculateRestPeriod = (shift1: Shift, shift2: Shift) => {
    const date1 = new Date(shift1.date)
    const date2 = new Date(shift2.date)
    
    const end1 = new Date(`2000-01-01T${shift1.end_time}`)
    const start2 = new Date(`2000-01-01T${shift2.start_time}`)
    
    // Handle overnight shifts
    if (end1.getHours() < start2.getHours()) {
      end1.setDate(end1.getDate() + 1)
    }
    
    const start2Adjusted = new Date(`2000-01-01T${shift2.start_time}`)
    const dayDiff = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24)
    start2Adjusted.setDate(start2Adjusted.getDate() + dayDiff)
    
    const restPeriodMs = start2Adjusted.getTime() - end1.getTime()
    const restPeriodHours = restPeriodMs / (1000 * 60 * 60)
    
    return Math.abs(restPeriodHours)
  }

  const handleSelectShift = async (shiftId: string) => {
    if (conflicts[shiftId]) {
      toast.error(`Cannot select this shift: ${conflicts[shiftId]}`)
      return
    }

    setIsSelecting(true)
    try {
      await shiftsApi.assignStaff(shiftId, currentUser.id)
      toast.success('Shift selected successfully!')
      onShiftSelected(shiftId)
      onClose()
    } catch (error: any) {
      console.error('Failed to select shift:', error)
      toast.error(error.response?.data?.error || 'Failed to select shift')
    } finally {
      setIsSelecting(false)
    }
  }

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const durationMs = end.getTime() - start.getTime()
    return durationMs / (1000 * 60 * 60) // Convert to hours
  }

  const formatShiftDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return format(date, 'EEEE, MMM d, yyyy')
  }

  const groupShiftsByDate = (shifts: Shift[]) => {
    const grouped: {[date: string]: Shift[]} = {}
    
    shifts.forEach(shift => {
      if (!grouped[shift.date]) {
        grouped[shift.date] = []
      }
      grouped[shift.date].push(shift)
    })
    
    // Sort dates
    const sortedDates = Object.keys(grouped).sort()
    const sortedGrouped: {[date: string]: Shift[]} = {}
    
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date].sort((a, b) => 
        a.start_time.localeCompare(b.start_time)
      )
    })
    
    return sortedGrouped
  }

  const groupedShifts = groupShiftsByDate(availableShifts)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Available Shifts</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select shifts that fit your schedule. Conflicts will be highlighted.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading available shifts...</span>
            </div>
          ) : availableShifts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Shifts</h3>
              <p className="text-gray-600">
                There are currently no shifts available for selection.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShifts).map(([date, shifts]) => (
                <div key={date} className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">
                      {formatShiftDate(date)}
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {shifts.map((shift) => {
                      const hasConflict = conflicts[shift.id]
                      const duration = getShiftDuration(shift.start_time, shift.end_time)
                      const isSelected = selectedShiftId === shift.id
                      
                      return (
                        <div
                          key={shift.id}
                          className={`border rounded-lg p-4 transition-all ${
                            hasConflict 
                              ? 'border-red-200 bg-red-50' 
                              : isSelected 
                                ? 'border-primary-300 bg-primary-50' 
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium text-gray-900">
                                    {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                  </span>
                                </div>
                                
                                <Badge variant="outline" className="text-xs">
                                  {duration}h duration
                                </Badge>
                                
                                <Badge 
                                  variant={shift.shift_type === 'night' ? 'secondary' : 'primary'} 
                                  className="text-xs"
                                >
                                  {shift.shift_type}
                                </Badge>
                                
                                {hasConflict && (
                                  <Badge variant="danger" className="text-xs">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                    Conflict
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <UserIcon className="h-4 w-4" />
                                  <span>
                                    {shift.assigned_staff?.length || 0} / {shift.required_staff_count} staff assigned
                                  </span>
                                </div>
                                
                                {shift.notes && (
                                  <div className="text-gray-500 italic">
                                    Note: {shift.notes}
                                  </div>
                                )}
                                
                                {hasConflict && (
                                  <div className="text-red-600 font-medium">
                                    ⚠️ {conflicts[shift.id]}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button
                                variant={hasConflict ? "outline" : "primary"}
                                size="sm"
                                onClick={() => handleSelectShift(shift.id)}
                                disabled={hasConflict || isSelecting}
                                className="flex items-center space-x-2"
                              >
                                {isSelecting && selectedShiftId === shift.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                                <span>
                                  {hasConflict ? 'Conflict' : 'Select Shift'}
                                </span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {availableShifts.length} shift{availableShifts.length !== 1 ? 's' : ''} available
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShiftSelectionModal
