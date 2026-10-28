import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
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
import { Shift, User, formatShiftTypeLabel } from '@/types'
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
  // The server previews each shift with the same rules it applies on selection: 'hard'
  // means it would be refused, 'review' means it would be held pending admin approval
  // (short rest and/or over the weekly hours limit).
  const [conflicts, setConflicts] = useState<{[shiftId: string]: { severity: 'hard' | 'review'; message: string }}>({})

  useEffect(() => {
    if (!isOpen || availableShifts.length === 0) return
    let cancelled = false
    shiftsApi.previewSelection(availableShifts.map((s) => s.id))
      .then((preview) => {
        if (cancelled) return
        const conflictMap: {[shiftId: string]: { severity: 'hard' | 'review'; message: string }} = {}
        for (const [shiftId, result] of Object.entries(preview)) {
          if (result.outcome === 'blocked') {
            conflictMap[shiftId] = { severity: 'hard', message: result.message || 'This shift cannot be selected' }
          } else if (result.outcome === 'pending') {
            conflictMap[shiftId] = {
              severity: 'review',
              message: `Needs admin approval: ${(result.reasons || []).join('; ')}`,
            }
          }
        }
        setConflicts(conflictMap)
      })
      .catch((error) => console.error('Error previewing shift selection:', error))
    return () => { cancelled = true }
  }, [isOpen, availableShifts])

  const handleSelectShift = async (shiftId: string) => {
    const conflict = conflicts[shiftId]
    if (conflict?.severity === 'hard') {
      toast.error(`Cannot select this shift: ${conflict.message}`)
      return
    }

    setSelectedShiftId(shiftId)
    setIsSelecting(true)
    try {
      const result = await shiftsApi.assignStaff(shiftId, currentUser.id)
      // The server decides what needs approval; it holds the shift for them meanwhile.
      const pendingReasons = [
        result.hours_cap_exception_pending && 'going over your weekly hours limit',
        result.rest_exception_pending && 'the reduced rest period',
      ].filter(Boolean)
      if (pendingReasons.length > 0) {
        toast.success(`Shift held for you — pending admin approval of ${pendingReasons.join(' and ')}.`, { duration: 6000 })
      } else {
        toast.success('Shift selected successfully!')
      }
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
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-neutral-200 dark:border-neutral-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-300 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-100">Available Shifts</h2>
              <p className="text-sm text-neutral-700 dark:text-neutral-400 mt-1">
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
              <span className="ml-3 text-neutral-700 dark:text-neutral-400">Loading available shifts...</span>
            </div>
          ) : availableShifts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 text-neutral-500 dark:text-neutral-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-950 dark:text-neutral-100 mb-2">No Available Shifts</h3>
              <p className="text-neutral-700 dark:text-neutral-400">
                There are currently no shifts available for selection.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedShifts).map(([date, shifts]) => (
                <div key={date} className="border border-neutral-300 dark:border-neutral-700 rounded-lg">
                  <div className="bg-neutral-100 dark:bg-neutral-700 px-4 py-3 border-b border-neutral-300 dark:border-neutral-700">
                    <h3 className="font-medium text-neutral-950 dark:text-neutral-100">
                      {formatShiftDate(date)}
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    {shifts.map((shift) => {
                      const conflict = conflicts[shift.id]
                      const isHardConflict = conflict?.severity === 'hard'
                      const isReviewConflict = conflict?.severity === 'review'
                      const duration = getShiftDuration(shift.start_time, shift.end_time)
                      const isSelected = selectedShiftId === shift.id

                      return (
                        <div
                          key={shift.id}
                          className={`border rounded-lg p-4 transition-all ${
                            isHardConflict
                              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                              : isReviewConflict
                                ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                                : isSelected
                                  ? 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20 dark:text-neutral-100'
                                  : 'border-neutral-300 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:bg-neutral-700'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="flex items-center space-x-1">
                                  <ClockIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                  <span className="font-medium text-neutral-950 dark:text-neutral-100">
                                    {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                  </span>
                                </div>
                                
                                <Badge variant="neutral" className="text-xs">
                                  {duration.toFixed(1)}h duration
                                </Badge>
                                
                                <Badge 
                                  variant={['night', 'night-wake', 'night-sleep'].includes(shift.shift_type) ? 'secondary' : 'primary'} 
                                  className="text-xs"
                                >
                                  {formatShiftTypeLabel(shift.shift_type)}
                                </Badge>
                                
                                {isHardConflict && (
                                  <Badge variant="danger" className="text-xs">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                    Conflict
                                  </Badge>
                                )}

                                {isReviewConflict && (
                                  <Badge variant="warning" className="text-xs">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                    Needs approval
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-neutral-700 dark:text-neutral-400 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <UserIcon className="h-4 w-4" />
                                  <span>
                                    {shift.assigned_staff?.length || 0} / {shift.required_staff_count} staff assigned
                                  </span>
                                </div>
                                
                                {shift.notes && (
                                  <div className="text-neutral-600 dark:text-neutral-400 italic">
                                    Note: {shift.notes}
                                  </div>
                                )}
                                
                                {isHardConflict && (
                                  <div className="text-red-600 dark:text-red-400 font-medium">
                                    ⚠️ {conflict.message}
                                  </div>
                                )}

                                {isReviewConflict && (
                                  <div className="text-amber-700 dark:text-amber-400 font-medium">
                                    ⚠️ {conflict.message}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4">
                              <Button
                                variant={isHardConflict ? "outline" : "primary"}
                                size="sm"
                                onClick={() => handleSelectShift(shift.id)}
                                disabled={isHardConflict || isSelecting}
                                className="flex items-center space-x-2"
                              >
                                {isSelecting && selectedShiftId === shift.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <CheckIcon className="h-4 w-4" />
                                )}
                                <span>
                                  {isHardConflict ? 'Conflict' : isReviewConflict ? 'Select (needs approval)' : 'Select Shift'}
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
        <div className="px-6 py-4 border-t border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-700 dark:text-neutral-400">
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
