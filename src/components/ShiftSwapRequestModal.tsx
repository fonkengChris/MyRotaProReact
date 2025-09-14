import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  XMarkIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { Shift, User, AvailableSwap, ShiftSwapRequest } from '@/types'
import { shiftSwapsApi } from '@/lib/api'
import toast from 'react-hot-toast'

const swapRequestSchema = z.object({
  requester_message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
})

type SwapRequestFormData = z.infer<typeof swapRequestSchema>

interface ShiftSwapRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSwapRequested: () => void
  availableSwap: AvailableSwap
  currentUser: User
  isLoading?: boolean
}

const ShiftSwapRequestModal: React.FC<ShiftSwapRequestModalProps> = ({
  isOpen,
  onClose,
  onSwapRequested,
  availableSwap,
  currentUser,
  isLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSwapper, setSelectedSwapper] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<SwapRequestFormData>({
    resolver: zodResolver(swapRequestSchema),
    defaultValues: {
      requester_message: '',
    }
  })

  const requesterMessage = watch('requester_message')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset()
      setSelectedSwapper(null)
    }
  }, [isOpen, reset])

  const handleFormSubmit = async (data: SwapRequestFormData) => {
    if (!selectedSwapper) {
      toast.error('Please select a user to swap with')
      return
    }

    try {
      setIsSubmitting(true)

      // Find the target shift for the selected swapper
      const targetShift = availableSwap.target_shift
      
      const swapRequest: ShiftSwapRequest = {
        requester_shift_id: availableSwap.user_shift.id,
        target_shift_id: targetShift.id,
        requester_message: data.requester_message || undefined
      }

      await shiftSwapsApi.create(swapRequest)
      
      toast.success('Shift swap request sent successfully!')
      onSwapRequested()
      onClose()
    } catch (error: any) {
      console.error('Error creating shift swap request:', error)
      
      if (error.response?.status === 409) {
        // Conflict error - show detailed conflict information
        const conflictData = error.response.data
        if (conflictData.conflicts && conflictData.conflicts.length > 0) {
          const conflictMessages = conflictData.conflicts.map((c: any) => c.message).join('; ')
          toast.error(`Swap conflicts detected: ${conflictMessages}`, { duration: 8000 })
        } else {
          toast.error(conflictData.message || 'Swap conflicts detected')
        }
      } else {
        toast.error(error.response?.data?.error || 'Failed to send swap request')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatShiftTime = (startTime: string, endTime: string) => {
    return `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`
  }

  const formatShiftDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'EEE, MMM d, yyyy')
  }

  const getShiftDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return diffHours
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ArrowPathIcon className="h-5 w-5 text-primary-600" />
                  <span>Request Shift Swap</span>
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
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Shift Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Your Current Shift */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Your Current Shift
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{formatShiftDate(availableSwap.user_shift.date)}</span>
                      </div>
                      <div className="text-blue-800 font-semibold">
                        {formatShiftTime(availableSwap.user_shift.start_time, availableSwap.user_shift.end_time)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="primary" className="text-xs">
                          {availableSwap.user_shift.shift_type}
                        </Badge>
                        <span className="text-blue-600">
                          {getShiftDuration(availableSwap.user_shift.start_time, availableSwap.user_shift.end_time).toFixed(1)}h
                        </span>
                      </div>
                      <div className="text-blue-600">
                        {typeof availableSwap.user_shift.home_id === 'string' 
                          ? availableSwap.user_shift.home_id
                          : availableSwap.user_shift.home_id.name}
                      </div>
                    </div>
                  </div>

                  {/* Target Shift */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-3 flex items-center">
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Target Shift
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{formatShiftDate(availableSwap.target_shift.date)}</span>
                      </div>
                      <div className="text-green-800 font-semibold">
                        {formatShiftTime(availableSwap.target_shift.start_time, availableSwap.target_shift.end_time)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="success" className="text-xs">
                          {availableSwap.target_shift.shift_type}
                        </Badge>
                        <span className="text-green-600">
                          {getShiftDuration(availableSwap.target_shift.start_time, availableSwap.target_shift.end_time).toFixed(1)}h
                        </span>
                      </div>
                      <div className="text-green-600">
                        {typeof availableSwap.target_shift.home_id === 'string' 
                          ? availableSwap.target_shift.home_id
                          : availableSwap.target_shift.home_id.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Swappers */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Select User to Swap With</h3>
                  <div className="space-y-2">
                    {availableSwap.potential_swappers.map((swapper) => (
                      <div
                        key={swapper.user_id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSwapper === swapper.user_id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedSwapper(swapper.user_id)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 ${
                            selectedSwapper === swapper.user_id
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedSwapper === swapper.user_id && (
                              <CheckCircleIcon className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{swapper.name}</div>
                            <div className="text-sm text-gray-500">{swapper.email}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message (Optional)
                  </label>
                  <textarea
                    {...register('requester_message')}
                    rows={3}
                    className="input w-full"
                    placeholder="Add a message explaining why you want to swap this shift..."
                    maxLength={500}
                  />
                  {errors.requester_message && (
                    <p className="mt-1 text-sm text-danger-600">{errors.requester_message.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {requesterMessage?.length || 0}/500 characters
                  </p>
                </div>

                {/* Warning */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important:</p>
                      <p>The system will check for scheduling conflicts before sending the request. The other user will need to approve the swap for it to be completed.</p>
                    </div>
                  </div>
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
                    disabled={isSubmitting || !selectedSwapper}
                    onClick={handleSubmit(handleFormSubmit)}
                  >
                    {isSubmitting ? 'Sending Request...' : 'Send Swap Request'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ShiftSwapRequestModal
