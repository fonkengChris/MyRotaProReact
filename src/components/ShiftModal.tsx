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
  UserGroupIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { Shift, Service } from '@/types'

const shiftSchema = z.object({
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
  isLoading?: boolean
}

const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shift,
  date,
  services,
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

  // Calculate duration
  const calculateDuration = () => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`)
      const end = new Date(`2000-01-01T${endTime}`)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      return Math.max(0, diffHours)
    }
    return 0
  }

  const duration = calculateDuration()

  // Reset form when modal opens/closes or shift changes
  useEffect(() => {
    if (isOpen) {
      if (shift) {
        // Editing existing shift
        setValue('service_id', shift.service_id)
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
      }
    }
  }, [isOpen, shift, setValue, reset])

  const handleFormSubmit = async (data: ShiftFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting shift:', error)
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

                {/* Duration Display */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4" />
                    <span>Duration: {duration.toFixed(1)} hours</span>
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
