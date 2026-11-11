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
  CalendarIcon
} from '@heroicons/react/24/outline'
import { Availability, AvailabilityStatus } from '@/types'
import {
  AVAILABILITY_STATUS_OPTIONS,
  availabilityStatusOf,
  availabilityWindowHours,
  windowRunsPastMidnight
} from '@/utils/availability'

const availabilitySchema = z.object({
  status: z.enum(['available', 'unavailable', 'partial']),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  preferred_shift_type: z.string().nullable().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.status !== 'partial') return
  if (!data.start_time) ctx.addIssue({ code: 'custom', path: ['start_time'], message: 'Start time is required' })
  if (!data.end_time) ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'End time is required' })
  if (data.start_time && data.start_time === data.end_time) {
    ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'End time must differ from start time' })
  }
})

type AvailabilityFormData = z.infer<typeof availabilitySchema>

interface AvailabilityFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AvailabilityFormData) => Promise<void>
  availability?: Availability | null
  date: Date
  /** Start time suggested for a new partial day. */
  time?: string
}

const statusSelectedClass: Record<AvailabilityStatus, string> = {
  available: 'border-success-500 bg-success-50 dark:bg-success-900/20',
  partial: 'border-warning-500 bg-warning-50 dark:bg-warning-900/20',
  unavailable: 'border-danger-500 bg-danger-50 dark:bg-danger-900/20',
}

const AvailabilityFormModal: React.FC<AvailabilityFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availability,
  date,
  time = '09:00'
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
      status: 'available',
      start_time: time,
      end_time: '17:00',
      preferred_shift_type: null,
      notes: '',
    }
  })

  const status = watch('status')
  const startTime = watch('start_time')
  const endTime = watch('end_time')
  const duration = status === 'partial' && startTime && endTime && startTime !== endTime
    ? availabilityWindowHours(startTime, endTime)
    : 0

  // Reset form when modal opens/closes or availability changes
  useEffect(() => {
    if (!isOpen) return
    if (availability) {
      reset({
        status: availabilityStatusOf(availability),
        start_time: availability.start_time?.substring(0, 5) || time,
        end_time: availability.end_time?.substring(0, 5) || '17:00',
        // 'none' is stored for "no preference"; show it as the blank option.
        preferred_shift_type: availability.preferred_shift_type === 'none' ? '' : availability.preferred_shift_type || null,
        notes: availability.notes || '',
      })
    } else {
      reset({ status: 'available', start_time: time, end_time: '17:00', preferred_shift_type: null, notes: '' })
    }
  }, [isOpen, availability, reset, time])

  const handleFormSubmit = async (data: AvailabilityFormData) => {
    try {
      setIsSubmitting(true)
      // Times only mean something on a partial day; the server drops them otherwise.
      await onSubmit({
        ...data,
        ...(data.status !== 'partial' && { start_time: undefined, end_time: undefined }),
        ...(data.status === 'unavailable' && { preferred_shift_type: 'none' }),
      })
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
        <div className="fixed inset-0 bg-neutral-1000 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl border border-neutral-200 dark:border-neutral-700 transition-all sm:my-8 sm:w-full sm:max-w-lg">
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {/* Status */}
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-2">
                    <CalendarIcon className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    Availability
                  </p>
                  <div role="radiogroup" aria-label="Availability" className="grid grid-cols-3 gap-2">
                    {AVAILABILITY_STATUS_OPTIONS.map((option) => {
                      const selected = status === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setValue('status', option.value as AvailabilityStatus, { shouldValidate: true })}
                          className={`rounded-lg border-2 px-3 py-2 text-left transition-colors ${
                            selected
                              ? statusSelectedClass[option.value]
                              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                          }`}
                        >
                          <span className="block text-sm font-medium text-neutral-950 dark:text-neutral-100">{option.label}</span>
                          <span className="block text-xs text-neutral-600 dark:text-neutral-400">{option.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time slot (partial days only) */}
                {status === 'partial' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                          Available from
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
                          Available until
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

                    <div className="bg-neutral-100 dark:bg-neutral-700 p-3 rounded-md">
                      <div className="flex items-center space-x-2 text-sm text-neutral-700 dark:text-neutral-400">
                        <ClockIcon className="h-4 w-4" />
                        <span>
                          {duration.toFixed(1)} hours
                          {windowRunsPastMidnight(startTime, endTime) && ' · runs past midnight into the next day'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      Only shifts that start and finish inside these times can be given to this person.
                    </p>
                  </div>
                )}

                {/* Preferred Shift Type */}
                {status !== 'unavailable' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                      Preferred Shift Type
                    </label>
                    <select
                      {...register('preferred_shift_type')}
                      className="input w-full"
                    >
                      <option value="">No preference</option>
                      <option value="morning">Morning (6 AM - 2 PM)</option>
                      <option value="day">Day</option>
                      <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
                      <option value="evening">Evening (4 PM - 12 AM)</option>
                      <option value="night-wake">Waking night (10 PM - 6 AM)</option>
                      <option value="night-sleep">Sleeping night / sleep-in</option>
                      <option value="long_day">Long day</option>
                      <option value="overtime">Overtime</option>
                    </select>
                    {errors.preferred_shift_type && (
                      <p className="mt-1 text-sm text-danger-600">{errors.preferred_shift_type.message}</p>
                    )}
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
