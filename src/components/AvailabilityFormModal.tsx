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
  CalendarIcon,
  CheckIcon,
  XMarkIcon as XMarkIcon2
} from '@heroicons/react/24/outline'
import { Availability, ShiftType } from '@/types'

const availabilitySchema = z.object({
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_available: z.boolean(),
  preferred_shift_type: z.string().nullable().optional(),
  notes: z.string().optional(),
})

type AvailabilityFormData = z.infer<typeof availabilitySchema>

interface AvailabilityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AvailabilityFormData) => Promise<void>
  availability?: Availability | null
  date: Date
  time: string
}

const AvailabilityFormModal: React.FC<AvailabilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availability,
  date,
  time
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      start_time: time,
      end_time: '17:00',
      is_available: true,
      preferred_shift_type: null,
      notes: '',
    }
  })

  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const isAvailable = watch('is_available')

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

  // Reset form when modal opens/closes or availability changes
  useEffect(() => {
    if (isOpen) {
      if (availability && availability.start_time && availability.end_time) {
        // Editing existing availability
        setValue('start_time', availability.start_time.substring(0, 5))
        setValue('end_time', availability.end_time.substring(0, 5))
        setValue('is_available', availability.is_available)
        setValue('preferred_shift_type', availability.preferred_shift_type || null)
        setValue('notes', availability.notes || '')
      } else {
        // Creating new availability
        reset()
        setValue('start_time', time)
        setValue('end_time', '17:00')
        setValue('is_available', true)
        setValue('preferred_shift_type', null)
        setValue('notes', '')
      }
    }
  }, [isOpen, availability, setValue, reset, time])

  const handleFormSubmit = async (data: AvailabilityFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      onClose()
    } catch (error) {
      console.error('Error submitting availability:', error)
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
                  {availability ? 'Edit Availability' : 'Set Availability'}
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
                {/* Availability Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Available</p>
                      <p className="text-xs text-gray-500">Set your availability for this time</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isAvailable}
                      onChange={(e) => setValue('is_available', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
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

                {/* Preferred Shift Type */}
                {isAvailable && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Shift Type
                    </label>
                    <select
                      {...register('preferred_shift_type')}
                      className="input w-full"
                    >
                      <option value="">No preference</option>
                      <option value="morning">Morning (6 AM - 2 PM)</option>
                      <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
                      <option value="evening">Evening (4 PM - 12 AM)</option>
                      <option value="night">Night (10 PM - 6 AM)</option>
                      <option value="overtime">Overtime</option>
                    </select>
                    {errors.preferred_shift_type && (
                      <p className="mt-1 text-sm text-danger-600">{errors.preferred_shift_type.message}</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input w-full"
                    placeholder="Add any special notes or preferences..."
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
                    {isSubmitting ? 'Saving...' : (availability ? 'Update Availability' : 'Set Availability')}
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

export default AvailabilityFormModal
