import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  CalendarIcon,
  ClockIcon,
  ArrowPathIcon,
  BellIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { shiftsApi, homesApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import ShiftSelectionModal from '@/components/ShiftSelectionModal'
import { Shift } from '@/types'
import toast from 'react-hot-toast'

const ShiftSelection: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([])

  // Fetch homes data
  const { data: homes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    enabled: !!user
  })

  // Fetch available shifts for the current user
  const { data: availableShifts = [], isLoading: shiftsLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['available-shifts', user?.id, format(currentWeekStart, 'yyyy-MM-dd'), format(currentWeekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return []
      
      const userHomeIds = user.homes?.map(home => {
        if (typeof home.home_id === 'string') {
          return home.home_id
        } else if (home.home_id && typeof home.home_id === 'object' && home.home_id.id) {
          return String(home.home_id.id)
        }
        return String(home.home_id)
      }) || []
      
      if (userHomeIds.length === 0) return []
      
      // Use the new available shifts API
      return await shiftsApi.getAvailable({
        user_id: user.id,
        start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        end_date: format(currentWeekEnd, 'yyyy-MM-dd'),
        home_ids: userHomeIds.join(',')
      })
    },
    enabled: !!user && user.homes && user.homes.length > 0,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch user's current shifts for the week
  const { data: userShifts = [], isLoading: userShiftsLoading } = useQuery({
    queryKey: ['user-shifts', user?.id, format(currentWeekStart, 'yyyy-MM-dd'), format(currentWeekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user) return []
      
      return await shiftsApi.getAll({
        user_id: user.id,
        start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        end_date: format(currentWeekEnd, 'yyyy-MM-dd')
      })
    },
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
  }

  const goToNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
  }

  const goToCurrentWeek = () => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    setCurrentWeekStart(weekStart)
  }

  // Handle shift selection
  const handleShiftSelected = (shiftId: string) => {
    // Remove the selected shift from available shifts
    setSelectedShifts(prev => prev.filter(shift => shift.id !== shiftId))
    
    // Refresh both queries
    queryClient.invalidateQueries({ queryKey: ['available-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['user-shifts'] })
    
    toast.success('Shift selected successfully!')
  }

  // Open modal with available shifts
  const openShiftSelection = () => {
    setSelectedShifts(availableShifts)
    setIsModalOpen(true)
  }

  // Calculate total hours for user's shifts
  const calculateTotalHours = (shifts: Shift[]) => {
    return shifts.reduce((total, shift) => {
      const start = new Date(`2000-01-01T${shift.start_time}`)
      const end = new Date(`2000-01-01T${shift.end_time}`)
      
      if (end < start) {
        end.setDate(end.getDate() + 1)
      }
      
      const durationMs = end.getTime() - start.getTime()
      const durationHours = durationMs / (1000 * 60 * 60)
      
      return total + durationHours
    }, 0)
  }

  const totalHours = calculateTotalHours(userShifts)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user.homes || user.homes.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-4">No Homes Assigned</h2>
        <p className="text-gray-600 dark:text-neutral-400">
          You need to be assigned to a care home to view available shifts.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Shift Selection</h1>
          <p className="text-gray-600 dark:text-neutral-400 mt-1">
            Select additional shifts that fit your schedule
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentWeek}
          >
            Current Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchShifts()}
            disabled={shiftsLoading}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              ← Previous Week
            </Button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(currentWeekStart, 'EEEE, MMMM d')} to {format(currentWeekEnd, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              Next Week →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Shifts Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span>Your Current Shifts</span>
          </CardTitle>
          <CardDescription>
            Shifts you're already assigned to for this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userShiftsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : userShifts.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Shifts This Week</h3>
              <p className="text-gray-600 dark:text-neutral-400">
                You don't have any shifts assigned for this week.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{userShifts.length}</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Total Shifts</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Total Hours</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {(totalHours / userShifts.length).toFixed(1)}h
                  </p>
                  <p className="text-sm text-gray-600 dark:text-neutral-400">Avg per Shift</p>
                </div>
              </div>
              
              <div className="space-y-2">
                {userShifts.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {format(new Date(shift.date + 'T00:00:00'), 'EEE, MMM d')}
                      </span>
                      <span className="text-gray-600 dark:text-neutral-400">
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {shift.shift_type}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-neutral-400">
                      {typeof shift.home_id === 'string' 
                        ? homes.find(h => h.id === shift.home_id)?.name || shift.home_id
                        : shift.home_id.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellIcon className="h-5 w-5 text-blue-600" />
            <span>Available Shifts</span>
          </CardTitle>
          <CardDescription>
            Additional shifts you can select to pick up extra hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : availableShifts.length === 0 ? (
            <div className="text-center py-8">
              <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Shifts</h3>
              <p className="text-gray-600 dark:text-neutral-400 mb-4">
                There are currently no shifts available for selection this week.
              </p>
              <Button
                variant="outline"
                onClick={() => refetchShifts()}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                Check Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-neutral-400">
                  {availableShifts.length} shift{availableShifts.length !== 1 ? 's' : ''} available for selection
                </div>
                <Button
                  variant="primary"
                  onClick={openShiftSelection}
                >
                  <BellIcon className="h-4 w-4 mr-2" />
                  View Available Shifts
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableShifts.slice(0, 6).map((shift) => (
                  <div key={shift.id} className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors">
                    <div className="flex items-center space-x-2 mb-2">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">
                        {format(new Date(shift.date + 'T00:00:00'), 'EEE, MMM d')}
                      </span>
                    </div>
                    
                    <div className="space-y-1 mb-3">
                      <div className="text-lg font-semibold">
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="primary" className="text-xs">
                          {shift.shift_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {shift.assigned_staff?.length || 0}/{shift.required_staff_count} staff
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-neutral-400">
                      {typeof shift.home_id === 'string' ? shift.home_id : shift.home_id.name}
                    </div>
                  </div>
                ))}
              </div>
              
              {availableShifts.length > 6 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={openShiftSelection}
                  >
                    View All {availableShifts.length} Available Shifts
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift Selection Modal */}
      <ShiftSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableShifts={selectedShifts}
        currentUser={user}
        onShiftSelected={handleShiftSelected}
        isLoading={false}
      />
    </div>
  )
}

export default ShiftSelection
