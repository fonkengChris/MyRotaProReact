import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  ArrowPathIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { shiftSwapsApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'
import ShiftSwapRequestModal from '@/components/ShiftSwapRequestModal'
import ShiftSwapResponseModal from '@/components/ShiftSwapResponseModal'
import { ShiftSwap, AvailableSwap, User } from '@/types'
import toast from 'react-hot-toast'

const ShiftSwaps: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Week navigation state
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  
  // Modal state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false)
  const [selectedSwapRequest, setSelectedSwapRequest] = useState<ShiftSwap | null>(null)
  const [selectedAvailableSwap, setSelectedAvailableSwap] = useState<AvailableSwap | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'received' | 'history'>('pending')

  // Fetch pending swap requests (where user needs to respond)
  const { data: pendingSwaps = [], isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['shift-swaps', 'pending', user?.id],
    queryFn: () => shiftSwapsApi.getPending(),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch sent swap requests
  const { data: sentSwaps = [], isLoading: sentLoading } = useQuery({
    queryKey: ['shift-swaps', 'sent', user?.id],
    queryFn: () => shiftSwapsApi.getAll({ type: 'sent' }),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch received swap requests
  const { data: receivedSwaps = [], isLoading: receivedLoading } = useQuery({
    queryKey: ['shift-swaps', 'received', user?.id],
    queryFn: () => shiftSwapsApi.getAll({ type: 'received' }),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch swap history
  const { data: swapHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['shift-swaps', 'history', user?.id],
    queryFn: () => shiftSwapsApi.getAll({ status: 'completed,approved,rejected,cancelled' }),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch available shifts for swapping
  const { data: availableSwaps = [], isLoading: availableLoading } = useQuery({
    queryKey: ['available-swaps', user?.id, format(currentWeekStart, 'yyyy-MM-dd'), format(currentWeekEnd, 'yyyy-MM-dd')],
    queryFn: () => shiftSwapsApi.getAvailableShifts(user!.id, {
      start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch swap statistics
  const { data: swapStats } = useQuery({
    queryKey: ['shift-swaps', 'stats', user?.id],
    queryFn: () => shiftSwapsApi.getStats(user!.id),
    enabled: !!user
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

  // Handle swap request response
  const handleSwapResponded = () => {
    queryClient.invalidateQueries({ queryKey: ['shift-swaps'] })
    // Also invalidate shift-related queries to refresh shift data and counters
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
    queryClient.invalidateQueries({ queryKey: ['rota'] })
    queryClient.invalidateQueries({ queryKey: ['available-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['user-shifts'] })
    setSelectedSwapRequest(null)
  }

  // Handle swap request creation
  const handleSwapRequested = () => {
    queryClient.invalidateQueries({ queryKey: ['shift-swaps'] })
    queryClient.invalidateQueries({ queryKey: ['available-swaps'] })
    // Also invalidate shift-related queries as new swap requests might affect availability
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
    queryClient.invalidateQueries({ queryKey: ['available-shifts'] })
    setSelectedAvailableSwap(null)
  }

  // Open response modal
  const openResponseModal = (swapRequest: ShiftSwap) => {
    setSelectedSwapRequest(swapRequest)
    setIsResponseModalOpen(true)
  }

  // Open request modal
  const openRequestModal = (availableSwap: AvailableSwap) => {
    setSelectedAvailableSwap(availableSwap)
    setIsRequestModalOpen(true)
  }

  const formatShiftTime = (startTime: string, endTime: string) => {
    return `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`
  }

  const formatShiftDate = (dateStr: string) => {
    return format(new Date(dateStr + 'T00:00:00'), 'EEE, MMM d')
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, label: 'Pending' },
      approved: { variant: 'success' as const, label: 'Approved' },
      rejected: { variant: 'danger' as const, label: 'Rejected' },
      cancelled: { variant: 'secondary' as const, label: 'Cancelled' },
      completed: { variant: 'success' as const, label: 'Completed' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
  }

  const getRequesterName = (swap: ShiftSwap) => {
    if (typeof swap.requester_id === 'string') {
      return 'Unknown User'
    }
    return swap.requester_id.name
  }

  const getTargetUserName = (swap: ShiftSwap) => {
    if (typeof swap.target_user_id === 'string') {
      return 'Unknown User'
    }
    return swap.target_user_id.name
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Shift Swaps</h1>
          <p className="text-gray-600 mt-1">
            Request and manage shift exchanges with other staff members
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
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['shift-swaps'] })
              queryClient.invalidateQueries({ queryKey: ['available-swaps'] })
            }}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {swapStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{swapStats.total}</p>
                <p className="text-sm text-gray-600">Total Swaps</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-warning-600">{swapStats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success-600">{swapStats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-danger-600">{swapStats.rejected}</p>
                <p className="text-sm text-gray-600">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-600">{swapStats.cancelled}</p>
                <p className="text-sm text-gray-600">Cancelled</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'pending', label: 'Pending Requests', count: pendingSwaps.length },
            { key: 'sent', label: 'Sent Requests', count: sentSwaps.length },
            { key: 'received', label: 'Received Requests', count: receivedSwaps.length },
            { key: 'history', label: 'History', count: swapHistory.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />
              <span>Pending Requests</span>
            </CardTitle>
            <CardDescription>
              Swap requests that require your response
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : pendingSwaps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                <p className="text-gray-600">
                  You don't have any pending shift swap requests.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSwaps.map((swap) => (
                  <div key={swap._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Request from {getRequesterName(swap)}</span>
                        {getStatusBadge(swap.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(swap.requested_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    
                    {swap.requester_message && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">{swap.requester_message}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Your Current Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.target_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.target_shift_id.date)} • ${formatShiftTime(swap.target_shift_id.start_time, swap.target_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Requested Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.requester_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.requester_shift_id.date)} • ${formatShiftTime(swap.requester_shift_id.start_time, swap.requester_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResponseModal(swap)}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Review Request
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'sent' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowPathIcon className="h-5 w-5 text-primary-600" />
              <span>Sent Requests</span>
            </CardTitle>
            <CardDescription>
              Swap requests you have sent to other staff members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : sentSwaps.length === 0 ? (
              <div className="text-center py-8">
                <ArrowPathIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Sent Requests</h3>
                <p className="text-gray-600">
                  You haven't sent any shift swap requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentSwaps.map((swap) => (
                  <div key={swap._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Request to {getTargetUserName(swap)}</span>
                        {getStatusBadge(swap.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(swap.requested_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    
                    {swap.requester_message && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">{swap.requester_message}</p>
                      </div>
                    )}
                    
                    {swap.response_message && (
                      <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Response:</span> {swap.response_message}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Your Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.requester_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.requester_shift_id.date)} • ${formatShiftTime(swap.requester_shift_id.start_time, swap.requester_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Requested Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.target_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.target_shift_id.date)} • ${formatShiftTime(swap.target_shift_id.start_time, swap.target_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'received' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              <span>Received Requests</span>
            </CardTitle>
            <CardDescription>
              All swap requests you have received (including completed ones)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {receivedLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : receivedSwaps.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Received Requests</h3>
                <p className="text-gray-600">
                  You haven't received any shift swap requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedSwaps.map((swap) => (
                  <div key={swap._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">Request from {getRequesterName(swap)}</span>
                        {getStatusBadge(swap.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(swap.requested_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    
                    {swap.requester_message && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">{swap.requester_message}</p>
                      </div>
                    )}
                    
                    {swap.response_message && (
                      <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Your Response:</span> {swap.response_message}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Your Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.target_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.target_shift_id.date)} • ${formatShiftTime(swap.target_shift_id.start_time, swap.target_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Requested Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.requester_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.requester_shift_id.date)} • ${formatShiftTime(swap.requester_shift_id.start_time, swap.requester_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              <span>Swap History</span>
            </CardTitle>
            <CardDescription>
              All completed, rejected, and cancelled swap requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : swapHistory.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Swap History</h3>
                <p className="text-gray-600">
                  You don't have any completed swap requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {swapHistory.map((swap) => (
                  <div key={swap._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">
                          {swap.requester_id === user.id ? `Request to ${getTargetUserName(swap)}` : `Request from ${getRequesterName(swap)}`}
                        </span>
                        {getStatusBadge(swap.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(swap.requested_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    
                    {swap.requester_message && (
                      <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">{swap.requester_message}</p>
                      </div>
                    )}
                    
                    {swap.response_message && (
                      <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Response:</span> {swap.response_message}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Original Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.requester_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.requester_shift_id.date)} • ${formatShiftTime(swap.requester_shift_id.start_time, swap.requester_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-700 mb-1">Target Shift</div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span>
                            {typeof swap.target_shift_id === 'string' 
                              ? 'Loading...'
                              : `${formatShiftDate(swap.target_shift_id.date)} • ${formatShiftTime(swap.target_shift_id.start_time, swap.target_shift_id.end_time)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Swaps Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <PlusIcon className="h-5 w-5 text-primary-600" />
                <span>Available Swaps</span>
              </CardTitle>
              <CardDescription>
                Shifts you can request to swap with other staff members
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
              >
                ← Previous Week
              </Button>
              <div className="text-center text-sm">
                <div className="font-medium">
                  Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
              >
                Next Week →
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {availableLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : availableSwaps.length === 0 ? (
            <div className="text-center py-8">
              <PlusIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Swaps</h3>
              <p className="text-gray-600">
                There are no shifts available for swapping this week.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableSwaps.map((availableSwap, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">Your Current Shift</div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        <span>
                          {formatShiftDate(availableSwap.user_shift.date)} • {formatShiftTime(availableSwap.user_shift.start_time, availableSwap.user_shift.end_time)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-700 mb-1">Available Shift</div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-500" />
                        <span>
                          {formatShiftDate(availableSwap.target_shift.date)} • {formatShiftTime(availableSwap.target_shift.start_time, availableSwap.target_shift.end_time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="font-medium text-gray-700 mb-2">Available Swappers:</div>
                    <div className="flex flex-wrap gap-2">
                      {availableSwap.potential_swappers.map((swapper) => (
                        <Badge key={swapper.user_id} variant="secondary" className="text-xs">
                          {swapper.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openRequestModal(availableSwap)}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Request Swap
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ShiftSwapRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSwapRequested={handleSwapRequested}
        availableSwap={selectedAvailableSwap!}
        currentUser={user}
        isLoading={false}
      />

      <ShiftSwapResponseModal
        isOpen={isResponseModalOpen}
        onClose={() => setIsResponseModalOpen(false)}
        onSwapResponded={handleSwapResponded}
        swapRequest={selectedSwapRequest!}
        isLoading={false}
      />
    </div>
  )
}

export default ShiftSwaps
