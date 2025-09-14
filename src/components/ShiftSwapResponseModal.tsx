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
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { ShiftSwap, ShiftSwapResponse } from '@/types'
import { shiftSwapsApi } from '@/lib/api'
import toast from 'react-hot-toast'

const swapResponseSchema = z.object({
  response_message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
})

type SwapResponseFormData = z.infer<typeof swapResponseSchema>

interface ShiftSwapResponseModalProps {
  isOpen: boolean
  onClose: () => void
  onSwapResponded: () => void
  swapRequest: ShiftSwap
  isLoading?: boolean
}

const ShiftSwapResponseModal: React.FC<ShiftSwapResponseModalProps> = ({
  isOpen,
  onClose,
  onSwapResponded,
  swapRequest,
  isLoading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<SwapResponseFormData>({
    resolver: zodResolver(swapResponseSchema),
    defaultValues: {
      response_message: '',
    }
  })

  const responseMessage = watch('response_message')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset()
      setAction(null)
    }
  }, [isOpen, reset])

  const handleApprove = async (data: SwapResponseFormData) => {
    try {
      setIsSubmitting(true)

      const response: ShiftSwapResponse = {
        response_message: data.response_message || undefined
      }

      await shiftSwapsApi.approve(swapRequest._id, response)
      
      toast.success('Shift swap approved and executed successfully!')
      onSwapResponded()
      onClose()
    } catch (error: any) {
      console.error('Error approving shift swap:', error)
      
      if (error.response?.status === 409) {
        // Conflict error - show detailed conflict information
        const conflictData = error.response.data
        if (conflictData.conflicts && conflictData.conflicts.length > 0) {
          const conflictMessages = conflictData.conflicts.map((c: any) => c.message).join('; ')
          toast.error(`Cannot approve swap due to conflicts: ${conflictMessages}`, { duration: 8000 })
        } else {
          toast.error(conflictData.message || 'Cannot approve swap due to conflicts')
        }
      } else {
        toast.error(error.response?.data?.error || 'Failed to approve swap request')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (data: SwapResponseFormData) => {
    try {
      setIsSubmitting(true)

      const response: ShiftSwapResponse = {
        response_message: data.response_message || undefined
      }

      await shiftSwapsApi.reject(swapRequest._id, response)
      
      toast.success('Shift swap request rejected')
      onSwapResponded()
      onClose()
    } catch (error: any) {
      console.error('Error rejecting shift swap:', error)
      toast.error(error.response?.data?.error || 'Failed to reject swap request')
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

  const getRequesterName = () => {
    if (typeof swapRequest.requester_id === 'string') {
      return 'Unknown User'
    }
    return swapRequest.requester_id.name
  }

  const getRequesterShift = () => {
    if (typeof swapRequest.requester_shift_id === 'string') {
      return null
    }
    return swapRequest.requester_shift_id
  }

  const getTargetShift = () => {
    if (typeof swapRequest.target_shift_id === 'string') {
      return null
    }
    return swapRequest.target_shift_id
  }

  if (!isOpen) return null

  const requesterShift = getRequesterShift()
  const targetShift = getTargetShift()

  if (!requesterShift || !targetShift) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
          <div className="relative bg-white rounded-lg p-6 shadow-xl">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Swap Request</h3>
              <p className="text-gray-600 mb-4">This swap request contains invalid shift data.</p>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                  <span>Respond to Shift Swap Request</span>
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
              <div className="text-sm text-gray-600">
                Request from {getRequesterName()} • {format(new Date(swapRequest.requested_at), 'MMM d, yyyy')}
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                {/* Requester Message */}
                {swapRequest.requester_message && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">Message from {getRequesterName()}</h3>
                    <p className="text-blue-800 text-sm">{swapRequest.requester_message}</p>
                  </div>
                )}

                {/* Shift Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Your Current Shift (Target Shift) */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-3 flex items-center">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Your Current Shift
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{formatShiftDate(targetShift.date)}</span>
                      </div>
                      <div className="text-green-800 font-semibold">
                        {formatShiftTime(targetShift.start_time, targetShift.end_time)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="success" className="text-xs">
                          {targetShift.shift_type}
                        </Badge>
                        <span className="text-green-600">
                          {getShiftDuration(targetShift.start_time, targetShift.end_time).toFixed(1)}h
                        </span>
                      </div>
                      <div className="text-green-600">
                        {typeof targetShift.home_id === 'string' 
                          ? targetShift.home_id
                          : targetShift.home_id.name}
                      </div>
                    </div>
                  </div>

                  {/* Requester's Shift */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      {getRequesterName()}'s Shift
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{formatShiftDate(requesterShift.date)}</span>
                      </div>
                      <div className="text-blue-800 font-semibold">
                        {formatShiftTime(requesterShift.start_time, requesterShift.end_time)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="primary" className="text-xs">
                          {requesterShift.shift_type}
                        </Badge>
                        <span className="text-blue-600">
                          {getShiftDuration(requesterShift.start_time, requesterShift.end_time).toFixed(1)}h
                        </span>
                      </div>
                      <div className="text-blue-600">
                        {typeof requesterShift.home_id === 'string' 
                          ? requesterShift.home_id
                          : requesterShift.home_id.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conflict Check Results */}
                {swapRequest.conflict_check.has_conflict && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-red-900 mb-2">Conflicts Detected</h3>
                        <div className="space-y-1 text-sm text-red-800">
                          {swapRequest.conflict_check.conflict_details.map((conflict, index) => (
                            <div key={index}>• {conflict.message}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Response Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Response Message (Optional)
                  </label>
                  <textarea
                    {...register('response_message')}
                    rows={3}
                    className="input w-full"
                    placeholder="Add a message to explain your decision..."
                    maxLength={500}
                  />
                  {errors.response_message && (
                    <p className="mt-1 text-sm text-danger-600">{errors.response_message.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {responseMessage?.length || 0}/500 characters
                  </p>
                </div>

                {/* Expiration Warning */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Request Expires:</p>
                      <p>{format(new Date(swapRequest.expires_at), 'MMM d, yyyy \'at\' h:mm a')}</p>
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
                    type="button"
                    variant="danger"
                    loading={isSubmitting && action === 'reject'}
                    disabled={isSubmitting || swapRequest.conflict_check.has_conflict}
                    onClick={handleSubmit(handleReject)}
                  >
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    loading={isSubmitting && action === 'approve'}
                    disabled={isSubmitting || swapRequest.conflict_check.has_conflict}
                    onClick={handleSubmit(handleApprove)}
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Approve & Execute
                  </Button>
                </div>

                {swapRequest.conflict_check.has_conflict && (
                  <div className="text-center text-sm text-red-600">
                    Cannot approve this swap due to scheduling conflicts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ShiftSwapResponseModal
