import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { 
  XMarkIcon,
  ClockIcon,
 
} from '@heroicons/react/24/outline'
import { Shift, Service, extractHomeId, extractServiceId } from '@/types'

const shiftSchema = z.object({
  home_id: z.string().min(1, 'Home is required'),
  service_id: z.string().min(1, 'Service is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  required_staff_count: z.number().min(1, 'At least 1 staff member required'),
  shift_type: z.string().min(1, 'Shift type is required'),
  notes: z.string().optional(),
})

type ShiftFormData = z.infer<typeof shiftSchema>

interface ShiftModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ShiftFormData) => void
  shift?: Shift | null
  date: Date
  services: Service[]
  homeId?: string // Add homeId prop for pre-filling
  existingShifts?: Shift[] // Add existing shifts for overlap validation
  isLoading?: boolean
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shift,
  date,
  services,
  homeId,
  existingShifts,
  isLoading = false
}) => {
  

  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      home_id: homeId || '',
      service_id: '',
      start_time: '09:00',
      end_time: '17:00',
      required_staff_count: 1,
      shift_type: 'morning',
      notes: '',
    }
  })

  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const selectedServiceId = watch('service_id')

  // Calculate duration (handles overnight shifts)
  const calculateDuration = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`)
      let end = new Date(`2000-01-01T${endTime}`)
      
      // If end time is before start time, it means the shift crosses midnight
      if (end < start) {
        end.setDate(end.getDate() + 1)
      }
      
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return Math.max(0, diffHours)
    }
    return 0
  }

  const duration = calculateDuration()

  // Helper function to format time display (handles midnight crossing)
  const formatTimeDisplay = (start: string, end: string) => {
    if (!start || !end) return ''
    
    const startTime = new Date(`2000-01-01T${start}`)
    const endTime = new Date(`2000-01-01T${end}`)
    
    // If end time is before start time, it crosses midnight
    if (endTime < startTime) {
      return `${start} - ${end} (next day)`
    }
    
    return `${start} - ${end}`
  }

  // Check for shift overlaps (handles multi-day shifts)
  const checkShiftOverlap = (startTime: string, endTime: string, date: string) => {
    if (!existingShifts || !homeId) return null
    
    // Convert current shift times to minutes since midnight
    const currentStartMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
    let currentEndMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
    
    // Handle overnight shifts
    if (currentEndMinutes < currentStartMinutes) {
      currentEndMinutes += 24 * 60 // Add 24 hours (1440 minutes)
    }
    
    const overlappingShift = existingShifts.find(existingShift => {
      // Skip the current shift being edited
      if (shift && existingShift.id === shift.id) return false
      
      // Check if it's the same home
      if (existingShift.home_id !== homeId) return false
      
      // Check for overlaps on the same date
      if (existingShift.date === date) {
        const existingStartMinutes = parseInt(existingShift.start_time.split(':')[0]) * 60 + parseInt(existingShift.start_time.split(':')[1])
        let existingEndMinutes = parseInt(existingShift.end_time.split(':')[0]) * 60 + parseInt(existingShift.end_time.split(':')[1])
        
        // Handle overnight shifts for existing shifts
        if (existingEndMinutes < existingStartMinutes) {
          existingEndMinutes += 24 * 60
        }
        
        // Check for overlap
        const hasOverlap = !(currentEndMinutes <= existingStartMinutes || currentStartMinutes >= existingEndMinutes)
        return hasOverlap
      }
      
      // Check for overlaps on the next day (for overnight shifts)
      // We need to check the next day in two scenarios:
      // 1. Current shift crosses midnight (spans into next day)
      // 2. Current shift might overlap with overnight shifts that start on current day and span into next day
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]
      
      if (existingShift.date === nextDayStr) {
        const existingStartMinutes = parseInt(existingShift.start_time.split(':')[0]) * 60 + parseInt(existingShift.start_time.split(':')[1])
        let existingEndMinutes = parseInt(existingShift.end_time.split(':')[0]) * 60 + parseInt(existingShift.end_time.split(':')[1])
        
        // Handle overnight shifts for existing shifts
        if (existingEndMinutes < existingStartMinutes) {
          existingEndMinutes += 24 * 60
        }
        
        // Check for overlap with next day shifts
        const hasOverlap = !(currentEndMinutes <= existingStartMinutes || currentStartMinutes >= existingEndMinutes)
        return hasOverlap
      }
      
      // Check for overlaps with overnight shifts that start on the current day and span into the next day
      if (existingShift.date === date) {
        const existingStartMinutes = parseInt(existingShift.start_time.split(':')[0]) * 60 + parseInt(existingShift.start_time.split(':')[1])
        let existingEndMinutes = parseInt(existingShift.end_time.split(':')[0]) * 60 + parseInt(existingShift.end_time.split(':')[1])
        
        // If this existing shift crosses midnight (spans into next day)
        if (existingEndMinutes < existingStartMinutes) {
          // Adjust the end time to be relative to the next day
          existingEndMinutes += 24 * 60
          
          // Check for overlap with the portion of the overnight shift that's in the next day
          const hasOverlap = !(currentEndMinutes <= existingStartMinutes || currentStartMinutes >= existingEndMinutes)
          return hasOverlap
        }
      }
      
      // Check for overlaps with shifts from the previous day that span into the current day
      const previousDay = new Date(date)
      previousDay.setDate(previousDay.getDate() - 1)
      const previousDayStr = previousDay.toISOString().split('T')[0]
      
      if (existingShift.date === previousDayStr) {
        // Check if this existing shift spans into the current day (overnight shift)
        const existingStartMinutes = parseInt(existingShift.start_time.split(':')[0]) * 60 + parseInt(existingShift.start_time.split(':')[1])
        let existingEndMinutes = parseInt(existingShift.end_time.split(':')[0]) * 60 + parseInt(existingShift.end_time.split(':')[1])
        
        // If end time is before start time, it's an overnight shift that spans into the current day
        if (existingEndMinutes < existingStartMinutes) {
          // This shift spans from previous day into current day
          // The existing shift starts at midnight of the previous day and ends at existingEndMinutes of the current day
          // We need to check if the current shift overlaps with the portion that's in the current day (00:00 to existingEndMinutes)
          
          // For overlap calculation, we need to adjust the start time to be relative to the current day
          const adjustedExistingStartMinutes = 0 // Start at midnight of current day (00:00)
          
          // Check for overlap with the portion of the overnight shift that's in the current day
          // adjustedExistingStartMinutes is 0 (midnight), existingEndMinutes is the end time in current day
          const hasOverlap = !(currentEndMinutes <= adjustedExistingStartMinutes || currentStartMinutes >= existingEndMinutes)
          return hasOverlap
        }
      }
      
      return false
    })
    
    return overlappingShift
  }

  // Reset form when modal opens/closes or shift changes
  useEffect(() => {
    if (isOpen) {
      if (shift) {
        // Editing existing shift
        setValue('home_id', extractHomeId(shift.home_id) || '')
        setValue('service_id', extractServiceId(shift.service_id) || '')
        setValue('start_time', shift.start_time.substring(0, 5))
        setValue('end_time', shift.end_time.substring(0, 5))
        setValue('required_staff_count', shift.required_staff_count || 1)
        setValue('shift_type', shift.shift_type || 'morning')
        setValue('notes', shift.notes || '')
      } else {
        // Creating new shift
        reset()
        setValue('start_time', '09:00')
        setValue('end_time', '17:00')
        setValue('required_staff_count', 1)
        setValue('shift_type', 'morning')
        
        // Auto-fill home and service if homeId is provided
        if (homeId && services.length > 0) {
          setValue('home_id', homeId)
          
          // Find the first service that supports this home
          const availableService = services.find(service => 
            service.home_ids && service.home_ids.some((home: any) => 
              extractHomeId(home) === homeId
            )
          )
          
          if (availableService) {
            setValue('service_id', availableService.id)
          }
        }
      }
    }
  }, [isOpen, shift, setValue, reset, homeId, services])

  // Reset home_id when service changes
  useEffect(() => {
    if (selectedServiceId) {
      // Check if current home_id is valid for the selected service
      const selectedService = services.find(s => s.id === selectedServiceId)
      if (selectedService && typeof selectedService !== 'string') {
        const currentHomeId = watch('home_id')
        if (currentHomeId && selectedService.home_ids && !selectedService.home_ids.includes(currentHomeId)) {
          setValue('home_id', '')
        }
      }
    } else {
      // If no service selected, clear home selection
      setValue('home_id', '')
    }
  }, [selectedServiceId, services, setValue, watch])

  const handleFormSubmit = async (data: ShiftFormData) => {
    try {
      // Check for shift overlaps before submitting
      const overlap = checkShiftOverlap(data.start_time, data.end_time, format(date, 'yyyy-MM-dd'))
      
      if (overlap) {
        const overlapStart = overlap.start_time.substring(0, 5)
        const overlapEnd = overlap.end_time.substring(0, 5)
        throw new Error(`Shift overlaps with existing shift: ${overlapStart} - ${overlapEnd}`)
      }
      
      setIsSubmitting(true)
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting shift:', error)
      // Show error to user (you can use toast or form error display)
      alert(error instanceof Error ? error.message : 'Failed to save shift')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {shift ? 'Edit Shift' : 'Create New Shift'}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onClose}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service
                  </label>
                  <select
                    {...register('service_id')}
                    className="input w-full"
                    disabled={!shift && !!homeId} // Disable for new shifts when home is pre-filled
                  >
                    <option value="">Select a service</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  {errors.service_id && (
                    <p className="mt-1 text-sm text-danger-600">{errors.service_id.message}</p>
                  )}
                  {!shift && homeId && (
                    <p className="mt-1 text-sm text-gray-500">Service automatically selected for this home</p>
                  )}
                </div>

                {/* Home Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home
                  </label>
                  <select
                    {...register('home_id')}
                    className="input w-full"
                    disabled={!watch('service_id') || (!shift && !!homeId)} // Disable for new shifts when home is pre-filled
                  >
                    <option value="">Select a home</option>
                    {(() => {
                      const selectedService = services.find(s => s.id === watch('service_id'))
                      if (!selectedService) {
                        return null
                      }
                      
                      // Use the populated home_ids from the service and deduplicate them
                      const availableHomes = selectedService.home_ids || []
                      
                      // Deduplicate homes by ID to prevent React key warnings
                      const uniqueHomes = availableHomes.reduce((acc: any[], home: any) => {
                        const homeId = extractHomeId(home) || home
                        if (!acc.find(h => extractHomeId(h) === homeId)) {
                          acc.push(home)
                        }
                        return acc
                      }, [])
                      

                      
                      return uniqueHomes.map((home: any) => (
                        <option key={extractHomeId(home) || home} value={extractHomeId(home) || home}>
                          {typeof home === 'string' ? home : `${home.name} - ${home.location?.city || 'Unknown'}`}
                        </option>
                      ))
                    })()}
                  </select>
                  {errors.home_id && (
                    <p className="mt-1 text-sm text-danger-600">{errors.home_id.message}</p>
                  )}
                  {!watch('service_id') && (
                    <p className="mt-1 text-sm text-gray-500">Please select a service first</p>
                  )}
                  {!shift && homeId && (
                    <p className="mt-1 text-sm text-gray-500">Home automatically selected</p>
                  )}
                  {watch('service_id') && (() => {
                    const selectedService = services.find(s => s.id === watch('service_id'))
                    if (!selectedService) return null
                    const availableHomes = selectedService.home_ids || []
                    
                    // Deduplicate homes by ID for accurate count
                    const uniqueHomes = availableHomes.reduce((acc: any[], home: any) => {
                      const homeId = extractHomeId(home) || home
                      if (!acc.find(h => extractHomeId(h) === homeId)) {
                        acc.push(home)
                      }
                      return acc
                    }, [])
                    
                    return (
                      <p className="mt-1 text-sm text-gray-500">
                        Available homes: {uniqueHomes.length}
                      </p>
                    )
                  })()}
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      {...register('start_time')}
                      type="time"
                      className="input w-full"
                    />
                    {errors.start_time && (
                      <p className="mt-1 text-sm text-danger-600">{errors.start_time.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      {...register('end_time')}
                      type="time"
                      className="input w-full"
                    />
                    {errors.end_time && (
                      <p className="mt-1 text-sm text-danger-600">{errors.end_time.message}</p>
                    )}
                  </div>
                </div>
                
                {/* Overnight Shift Info */}
                {startTime && endTime && (
                  <div className="text-xs text-gray-500 text-center">
                    {(() => {
                      const start = new Date(`2000-01-01T${startTime}`)
                      const end = new Date(`2000-01-01T${endTime}`)
                      if (end < start) {
                        return "⏰ This shift crosses midnight to the next day"
                      }
                      return null
                    })()}
                  </div>
                )}

                {/* Overlap Warning */}
                {startTime && endTime && existingShifts && homeId && (() => {
                  const overlap = checkShiftOverlap(startTime, endTime, format(date, 'yyyy-MM-dd'))
                  if (overlap) {
                    return (
                      <div className="text-xs text-red-600 text-center bg-red-50 p-2 rounded border border-red-200">
                        ⚠️ Overlaps with existing shift: {overlap.start_time.substring(0, 5)} - {overlap.end_time.substring(0, 5)}
                      </div>
                    )
                  }
                  return null
                })()}

                {/* Duration Display */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4" />
                      <span>Duration: {duration.toFixed(1)} hours</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTimeDisplay(startTime, endTime)}
                    </div>
                  </div>
                </div>

                {/* Staff Count and Shift Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Staff
                    </label>
                    <input
                      {...register('required_staff_count', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="10"
                      className="input w-full"
                    />
                    {errors.required_staff_count && (
                      <p className="mt-1 text-sm text-danger-600">{errors.required_staff_count.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift Type
                    </label>
                    <select
                      {...register('shift_type')}
                      className="input w-full"
                    >
                      <option value="morning">Morning</option>
                      <option value="day">Day</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="overtime">Overtime</option>
                      <option value="long_day">Long Day</option>
                      <option value="split">Split</option>
                    </select>
                    {errors.shift_type && (
                      <p className="mt-1 text-sm text-danger-600">{errors.shift_type.message}</p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input w-full"
                    placeholder="Add any special instructions or notes..."
                  />
                  {errors.notes && (
                    <p className="mt-1 text-sm text-danger-600">{errors.notes.message}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : (shift ? 'Update Shift' : 'Create Shift')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ShiftModal
