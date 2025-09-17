import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { availabilityApi, timeOffApi, usersApi } from '@/lib/api'
import { Availability, TimeOffRequest, extractUserDefaultHomeId } from '@/types'
import AvailabilityCalendar from '@/components/AvailabilityCalendar'
import TimeOffRequestForm from '@/components/TimeOffRequestForm'
import TimeOffRequestList from '@/components/TimeOffRequestList'
import toast from 'react-hot-toast'

const AvailabilityPage: React.FC = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'requests' | 'submit'>('calendar')
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null)

  // Fetch availability data
  const { data: availabilities = [], isLoading: availabilitiesLoading, error: availabilitiesError } = useQuery({
    queryKey: ['availabilities', user?.id],
    queryFn: () => availabilityApi.getAll({ user_id: user?.id }),
    enabled: !!user?.id,
    retry: 1,
    retryDelay: 1000,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Get user's home ID
  const userHomeId = extractUserDefaultHomeId(user)

  // Fetch time-off requests
  const { data: timeOffRequests = [], isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['timeOffRequests', user?.id, userHomeId, user?.role],
    queryFn: async () => {
      // Different query based on user role
      if (user?.role === 'admin') {
        // Admins see all requests
        return await timeOffApi.getAll()
      } else if (['home_manager', 'senior_staff'].includes(user?.role || '')) {
        // Managers see all requests for their home (if they have one)
        return await timeOffApi.getAll(userHomeId ? { home_id: userHomeId } : {})
      } else {
        // Regular users see only their own requests
        return await timeOffApi.getAll({ user_id: user?.id })
      }
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 1000,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch staff members (for managers)
  const { data: staff = [], isLoading: staffLoading, error: staffError } = useQuery({
    queryKey: ['staff', userHomeId],
    queryFn: () => usersApi.getAll({ 
      home_id: userHomeId // Only filter by home if user has one
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'home_manager', 'senior_staff'].includes(user.role)) && permissions.canManageTimeOff,
    retry: 1,
    retryDelay: 1000,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Save availability mutation
  const saveAvailabilityMutation = useMutation({
    mutationFn: (data: Partial<Availability>) => {
      if (data.id) {
        return availabilityApi.update(data.id, data)
      } else {
        return availabilityApi.create(data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] })
      toast.success('Availability saved successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save availability')
    }
  })

  // Delete availability mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: (availabilityId: string) => availabilityApi.delete(availabilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] })
      toast.success('Availability deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete availability')
    }
  })

  // Submit time-off request mutation
  const submitTimeOffMutation = useMutation({
    mutationFn: (data: any) => timeOffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] })
      toast.success('Time-off request submitted successfully')
      setActiveTab('requests')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to submit time-off request')
    }
  })

  // Approve time-off request mutation
  const approveTimeOffMutation = useMutation({
    mutationFn: (requestId: string) => timeOffApi.approve(requestId),
    onSuccess: () => {
      // Invalidate all time-off request queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] })
      toast.success('Time-off request approved')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to approve request'
      
      // Handle specific error cases
      if (errorMessage.includes('Only pending requests can be approved')) {
        toast.error('This request has already been processed. Please refresh the page.')
        // Force refresh the data
        queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] })
      } else {
        toast.error(errorMessage)
      }
    }
  })

  // Deny time-off request mutation
  const denyTimeOffMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) => 
      timeOffApi.deny(requestId, reason),
    onSuccess: () => {
      // Invalidate all time-off request queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] })
      toast.success('Time-off request denied')
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to deny request'
      
      // Handle specific error cases
      if (errorMessage.includes('Request has already been processed')) {
        toast.error('This request has already been processed. Please refresh the page.')
        // Force refresh the data
        queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] })
      } else {
        toast.error(errorMessage)
      }
    }
  })

  // Handle saving availability
  const handleSaveAvailability = async (data: Partial<Availability>) => {
    await saveAvailabilityMutation.mutateAsync(data)
  }

  // Handle deleting availability
  const handleDeleteAvailability = async (availabilityId: string) => {
    await deleteAvailabilityMutation.mutateAsync(availabilityId)
  }

  // Handle submitting time-off request
  const handleSubmitTimeOff = async (data: any) => {
    await submitTimeOffMutation.mutateAsync({
      ...data,
      user_id: user?.id
    })
  }

  // Handle approving time-off request
  const handleApproveTimeOff = async (requestId: string) => {
    await approveTimeOffMutation.mutateAsync(requestId)
  }

  // Handle denying time-off request
  const handleDenyTimeOff = async (requestId: string, reason: string) => {
    await denyTimeOffMutation.mutateAsync({ requestId, reason })
  }

  // Handle viewing time-off request details
  const handleViewTimeOffDetails = (request: TimeOffRequest) => {
    setSelectedRequest(request)
    // TODO: Implement detailed view modal

  }

  // Only show loading for the first essential query (availabilities)
  const isInitialLoading = availabilitiesLoading && !availabilities && !availabilitiesError
  
  // Show error state if there are critical errors
  if (availabilitiesError && !availabilities) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">Failed to Load Availability</h3>
          <p className="text-gray-600 mb-4">
            {availabilitiesError?.message || 'There was an error loading your availability data.'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (isInitialLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Availability & Time Off</h1>
          <p className="text-gray-600 mt-1">
            Manage your availability and time-off requests
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className={activeTab === 'calendar' ? 'bg-primary-50 border-primary-200' : ''}
          >
            <CalendarIcon className="h-4 w-4 mr-2" />
            Availability
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('requests')}
            className={activeTab === 'requests' ? 'bg-primary-50 border-primary-200' : ''}
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Requests
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('submit')}
            className={activeTab === 'submit' ? 'bg-primary-600' : ''}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {availabilities.filter(a => a.is_available).length || 0}
              </p>
              <p className="text-sm text-gray-600">Available Slots</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              {requestsLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-warning-600">
                    {timeOffRequests.filter(r => r.status === 'pending').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              {requestsLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-success-600">
                    {timeOffRequests.filter(r => r.status === 'approved').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Approved Requests</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              {requestsLoading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <>
                  <p className="text-2xl font-bold text-danger-600">
                    {timeOffRequests.filter(r => r.status === 'denied').length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Denied Requests</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Content */}
      {activeTab === 'calendar' && (
        <AvailabilityCalendar
          userId={user?.id || ''}
          availabilities={availabilities || []}
          onSaveAvailability={handleSaveAvailability}
          onDeleteAvailability={handleDeleteAvailability}
          canEdit={true}
        />
      )}

      {activeTab === 'requests' && (
        <div>
          {staffLoading && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-cyan-900/20 border border-blue-200 dark:border-cyan-800 rounded-lg">
              <div className="flex items-center">
                <LoadingSpinner size="sm" />
                <span className="ml-2 text-sm text-blue-700 dark:text-cyan-400">Loading staff information...</span>
              </div>
            </div>
          )}
          <TimeOffRequestList
            requests={timeOffRequests}
            staff={staff || []}
            onApprove={handleApproveTimeOff}
            onDeny={handleDenyTimeOff}
            onViewDetails={handleViewTimeOffDetails}
            canManage={permissions.canManageTimeOff}
          />
        </div>
      )}

      {activeTab === 'submit' && (
        <TimeOffRequestForm
          onSubmit={handleSubmitTimeOff}
          isLoading={submitTimeOffMutation.isPending}
        />
      )}

      {/* Selected Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedRequest(null)} />
            
            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Request Details</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedRequest(null)}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Staff Member</p>
                      <p className="text-sm text-gray-900 dark:text-neutral-100">
                        {staff?.find(s => s.id === selectedRequest.user_id)?.name || 'Unknown'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Request Type</p>
                      <p className="text-sm text-gray-900 dark:text-neutral-100">
                        {selectedRequest.request_type.replace('_', ' ')}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Dates</p>
                      <p className="text-sm text-gray-900 dark:text-neutral-100">
                        {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason</p>
                      <p className="text-sm text-gray-900 dark:text-neutral-100">{selectedRequest.reason}</p>
                    </div>
                    
                    {selectedRequest.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Notes</p>
                        <p className="text-sm text-gray-900 dark:text-neutral-100">{selectedRequest.notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Status</p>
                      <Badge variant={selectedRequest.status === 'pending' ? 'warning' : selectedRequest.status === 'approved' ? 'success' : 'danger'}>
                        {selectedRequest.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AvailabilityPage
