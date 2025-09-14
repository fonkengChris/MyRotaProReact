import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  ArrowPathIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { shiftSwapsApi } from '@/lib/api'
import { ShiftSwap } from '@/types'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

interface ShiftSwapNotificationProps {
  onClose?: () => void
}

const ShiftSwapNotification: React.FC<ShiftSwapNotificationProps> = ({ onClose }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)

  // Fetch pending swap requests
  const { data: pendingSwaps = [] } = useQuery({
    queryKey: ['shift-swaps', 'pending', user?.id],
    queryFn: () => shiftSwapsApi.getPending(),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : [],
    refetchInterval: 30000 // Check every 30 seconds
  })

  const handleViewSwaps = () => {
    navigate('/shift-swaps')
    if (onClose) onClose()
  }

  const handleDismiss = () => {
    setIsVisible(false)
    if (onClose) onClose()
  }

  const getRequesterName = (swap: ShiftSwap) => {
    if (typeof swap.requester_id === 'string') {
      return 'Unknown User'
    }
    return swap.requester_id.name
  }

  const formatShiftTime = (startTime: string, endTime: string) => {
    return `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`
  }

  const formatShiftDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'MMM d')
  }

  // Don't show if no pending swaps or user dismissed
  if (!isVisible || !pendingSwaps.length || !user) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="h-5 w-5 text-primary-600" />
            <h3 className="font-medium text-gray-900">Shift Swap Requests</h3>
            <Badge variant="warning" className="text-xs">
              {pendingSwaps.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleDismiss}
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 mb-4">
          {pendingSwaps.slice(0, 2).map((swap) => (
            <div key={swap._id} className="border border-gray-200 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{getRequesterName(swap)}</span>
              </div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="h-3 w-3" />
                  <span>
                    {typeof swap.requester_shift_id === 'string' 
                      ? 'Loading...'
                      : `${formatShiftDate(swap.requester_shift_id.date)} • ${formatShiftTime(swap.requester_shift_id.start_time, swap.requester_shift_id.end_time)}`}
                  </span>
                </div>
                <div className="text-gray-500">
                  {format(new Date(swap.requested_at), 'MMM d, h:mm a')}
                </div>
              </div>
            </div>
          ))}
          
          {pendingSwaps.length > 2 && (
            <div className="text-xs text-gray-500 text-center">
              +{pendingSwaps.length - 2} more request{pendingSwaps.length - 2 !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={handleViewSwaps}
          >
            View All Requests
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ShiftSwapNotification
