import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { shiftsApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const AvailableShiftsNotification: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasShownNotification, setHasShownNotification] = useState(false)

  // Get current week
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Fetch available shifts count
  const { data: availableShifts = [], isLoading } = useQuery({
    queryKey: ['available-shifts-count', user?.id, format(currentWeekStart, 'yyyy-MM-dd'), format(currentWeekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user || !user.homes || user.homes.length === 0) return []
      
      const userHomeIds = user.homes.map(home => {
        if (typeof home.home_id === 'string') {
          return home.home_id
        } else if (home.home_id && typeof home.home_id === 'object' && home.home_id.id) {
          return String(home.home_id.id)
        }
        return String(home.home_id)
      })
      
      return await shiftsApi.getAvailable({
        user_id: user.id,
        start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        end_date: format(currentWeekEnd, 'yyyy-MM-dd'),
        home_ids: userHomeIds.join(',')
      })
    },
    enabled: !!user && user.homes && user.homes.length > 0,
    select: (data) => Array.isArray(data) ? data : [],
    refetchInterval: 30000, // Check every 30 seconds
    refetchOnWindowFocus: true
  })

  // Show notification when shifts become available
  useEffect(() => {
    if (availableShifts.length > 0 && !hasShownNotification && !isDismissed) {
      toast.success(
        `${availableShifts.length} new shift${availableShifts.length !== 1 ? 's' : ''} available for selection!`,
        {
          duration: 8000,
          icon: '🔔',
          action: {
            label: 'View Shifts',
            onClick: () => navigate('/shift-selection')
          }
        }
      )
      setHasShownNotification(true)
    }
  }, [availableShifts.length, hasShownNotification, isDismissed, navigate])

  // Reset notification state when shifts change
  useEffect(() => {
    if (availableShifts.length === 0) {
      setHasShownNotification(false)
      setIsDismissed(false)
    }
  }, [availableShifts.length])

  // Don't show if no shifts available, dismissed, or loading
  if (isLoading || availableShifts.length === 0 || isDismissed) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <BellIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900">
              New Shifts Available!
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {availableShifts.length} shift{availableShifts.length !== 1 ? 's' : ''} are available for selection this week.
            </p>
            <div className="mt-2 flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/shift-selection')}
              >
                View Available Shifts
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDismissed(true)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default AvailableShiftsNotification
