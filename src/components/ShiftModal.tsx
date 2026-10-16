import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { Shift, Service, extractHomeId, extractServiceId, shiftServiceUserId } from '@/types'
import { serviceUsersApi } from '@/lib/api'

const shiftSchema = z
  .object({
    home_id: z.string().min(1, 'Home is required'),
    service_id: z.string().min(1, 'Service is required'),
    service_user_id: z.string().optional(),
    start_time: z.string().min(1, 'Start time is required'),
    end_time: z.string().min(1, 'End time is required'),
    required_staff_count: z.number().min(1, 'At least 1 staff member required'),
    shift_type: z.string().min(1, 'Shift type is required'),
    notes: z.string().optional(),
  })
  .refine((d) => d.shift_type !== 'one_to_one' || !!d.service_user_id, {
    message: 'Choose the service user this 1-to-1 is for',
    path: ['service_user_id'],
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
  isLoading?: boolean
  /** Admins only: may create/edit 1-to-1 shifts. */
  canManageOneToOne?: boolean
  /** Shift type preselected for a new shift (e.g. 'one_to_one' from "Add 1-to-1"). */
  initialShiftType?: string
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shift,
  date,
  services,
  homeId,
  isLoading = false,
  canManageOneToOne = false,
  initialShiftType,
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
      service_user_id: '',
      notes: '',
    }
  })

  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const selectedServiceId = watch('service_id')
  const shiftType = watch('shift_type')
  const selectedHomeId = watch('home_id')
  const isOneToOne = shiftType === 'one_to_one'
  // Only admins create/edit 1-to-1s; a non-admin opening one sees it read-only.
  const readOnlyOneToOne = !canManageOneToOne && (isOneToOne || shift?.shift_type === 'one_to_one')

  const { data: homeServiceUsers = [], isLoading: serviceUsersLoading } = useQuery({
    queryKey: ['service-users', { home_id: selectedHomeId, is_active: true }],
    queryFn: () => serviceUsersApi.getAll({ home_id: selectedHomeId, is_active: true }),
    enabled: isOpen && isOneToOne && !!selectedHomeId,
  })

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
        setValue('service_user_id', shiftServiceUserId(shift) || '')
        setValue('notes', shift.notes || '')
      } else {
        // Creating new shift
        reset()
        setValue('start_time', '09:00')
        setValue('end_time', '17:00')
        setValue('required_staff_count', 1)
        setValue('shift_type', initialShiftType || 'morning')
        setValue('service_user_id', '')
        
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
  }, [isOpen, shift, setValue, reset, homeId, services, initialShiftType])

  // A 1-to-1 is always one staff member; leaving the type clears the service user.
  useEffect(() => {
    if (isOneToOne) setValue('required_staff_count', 1)
    else setValue('service_user_id', '')
  }, [isOneToOne, setValue])

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
      setIsSubmitting(true)
      await onSubmit({
        ...data,
        service_user_id: data.shift_type === 'one_to_one' ? data.service_user_id : '',
      })
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
        <div className="fixed inset-0 bg-neutral-1000 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl border border-neutral-200 dark:border-neutral-700 transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isOneToOne
                    ? (shift ? 'Edit 1-to-1 Shift' : 'Create 1-to-1 Shift')
                    : (shift ? 'Edit Shift' : 'Create New Shift')}
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* Service Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Service automatically selected for this home</p>
                  )}
                </div>

                {/* Home Selection */}
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Please select a service first</p>
                  )}
                  {!shift && homeId && (
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Home automatically selected</p>
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
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        Available homes: {uniqueHomes.length}
                      </p>
                    )
                  })()}
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
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

                {/* Duration Display */}
                <div className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded-md">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-neutral-700 dark:text-neutral-400">
                      <ClockIcon className="h-4 w-4" />
                      <span>Duration: {duration.toFixed(1)} hours</span>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      {formatTimeDisplay(startTime, endTime)}
                    </div>
                  </div>
                </div>

                {/* Staff Count and Shift Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                      Required Staff
                    </label>
                    <input
                      {...register('required_staff_count', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="10"
                      className="input w-full"
                      disabled={isOneToOne}
                    />
                    {errors.required_staff_count && (
                      <p className="mt-1 text-sm text-danger-600">{errors.required_staff_count.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                      <option value="night-wake">Waking night</option>
                      <option value="night-sleep">Sleeping night</option>
                      <option value="overtime">Overtime</option>
                      <option value="long_day">Long Day</option>
                      {(canManageOneToOne || shift?.shift_type === 'one_to_one') && (
                        <option value="one_to_one">1-to-1 (service user)</option>
                      )}
                      <option value="split">Split</option>
                    </select>
                    {errors.shift_type && (
                      <p className="mt-1 text-sm text-danger-600">{errors.shift_type.message}</p>
                    )}
                  </div>
                </div>

                {/* 1-to-1: service user + how hours are counted */}
                {isOneToOne && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                      Service User
                    </label>
                    <select
                      {...register('service_user_id')}
                      className="input w-full"
                      disabled={!selectedHomeId || readOnlyOneToOne}
                    >
                      <option value="">
                        {!selectedHomeId
                          ? 'Select a home first'
                          : serviceUsersLoading
                            ? 'Loading service users…'
                            : 'Select a service user'}
                      </option>
                      {homeServiceUsers.map((su) => (
                        <option key={su.id} value={su.id}>
                          {su.name}
                        </option>
                      ))}
                    </select>
                    {errors.service_user_id && (
                      <p className="mt-1 text-sm text-danger-600">{errors.service_user_id.message}</p>
                    )}
                    {selectedHomeId && !serviceUsersLoading && homeServiceUsers.length === 0 && (
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        No active service users in this home.
                      </p>
                    )}
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                      Staff already on a background shift at this time cover it at no extra hours;
                      only time outside their background shift is paid.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
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
                    disabled={isSubmitting || readOnlyOneToOne}
                    title={readOnlyOneToOne ? 'Only admins can edit 1-to-1 shifts' : undefined}
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
