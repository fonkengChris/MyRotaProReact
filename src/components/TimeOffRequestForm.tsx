import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { 
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { TimeOffRequestType } from '@/types'

const timeOffSchema = z.object({
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  request_type: z.string().min(1, 'Request type is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  is_urgent: z.boolean().default(false),
  notes: z.string().optional(),
}).refine((data) => {
  const startDate = new Date(data.start_date)
  const endDate = new Date(data.end_date)
  return endDate >= startDate
}, {
  message: "End date must be after start date",
  path: ["end_date"]
})

type TimeOffFormData = z.infer<typeof timeOffSchema>

interface TimeOffRequestFormProps {
  onSubmit: (data: TimeOffFormData) => Promise<void>
  isLoading?: boolean
}

const TimeOffRequestForm: React.FC<TimeOffRequestFormProps> = ({
  onSubmit,
  isLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<TimeOffFormData>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: {
      start_date: '',
      end_date: '',
      request_type: '',
      reason: '',
      is_urgent: false,
      notes: '',
    }
  })

  const startDate = watch('start_date')
  const endDate = watch('end_date')

  // Calculate duration
  const calculateDuration = () => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays + 1 // Include both start and end dates
    }
    return 0
  }

  const duration = calculateDuration()

  const handleFormSubmit = async (data: TimeOffFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      reset()
    } catch (error) {
      console.error('Error submitting time-off request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Time Off</CardTitle>
        <p className="text-sm text-gray-500">
          Submit a request for time off, vacation, or other leave
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Date Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                {...register('start_date')}
                type="date"
                className="input w-full"
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                {...register('end_date')}
                type="date"
                className="input w-full"
                min={startDate || new Date().toISOString().split('T')[0]}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          {/* Duration Display */}
          {duration > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <CalendarIcon className="h-4 w-4" />
                <span>Duration: {duration} day{duration > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Type
            </label>
            <select
              {...register('request_type')}
              className="input w-full"
            >
              <option value="">Select request type</option>
              <option value="vacation">Vacation</option>
              <option value="sick_leave">Sick Leave</option>
              <option value="personal_time">Personal Time</option>
              <option value="bereavement">Bereavement</option>
              <option value="jury_duty">Jury Duty</option>
              <option value="other">Other</option>
            </select>
            {errors.request_type && (
              <p className="mt-1 text-sm text-danger-600">{errors.request_type.message}</p>
            )}
          </div>

          {/* Urgent Request Toggle */}
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Urgent Request</p>
                <p className="text-xs text-yellow-700">Mark if this requires immediate attention</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register('is_urgent')}
              />
              <div className="w-11 h-6 bg-yellow-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-yellow-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
            </label>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Request
            </label>
            <textarea
              {...register('reason')}
              rows={4}
              className="input w-full"
              placeholder="Please provide a detailed reason for your time-off request..."
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-danger-600">{errors.reason.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Minimum 10 characters required
            </p>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input w-full"
              placeholder="Any additional information or special requests..."
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
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default TimeOffRequestForm
