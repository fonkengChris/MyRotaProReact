import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { 
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { TimeOffRequest, User } from '@/types'

interface TimeOffRequestListProps {
  requests: TimeOffRequest[]
  staff: User[]
  onApprove: (requestId: string) => Promise<void>
  onDeny: (requestId: string, reason: string) => Promise<void>
  onViewDetails: (request: TimeOffRequest) => void
  canManage: boolean
}

const TimeOffRequestList: React.FC<TimeOffRequestListProps> = ({
  requests,
  staff,
  onApprove,
  onDeny,
  onViewDetails,
  canManage
}) => {
  const [denyReason, setDenyReason] = useState('')
  const [denyingRequest, setDenyingRequest] = useState<string | null>(null)

  // Get staff member by ID
  const getStaffMember = (userId: string) => {
    return staff.find(member => member.id === userId)
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'approved': return 'success'
      case 'denied': return 'danger'
      default: return 'secondary'
    }
  }

  // Get request type display name
  const getRequestTypeDisplay = (type: string) => {
    switch (type) {
      case 'vacation': return 'Vacation'
      case 'sick_leave': return 'Sick Leave'
      case 'personal_time': return 'Personal Time'
      case 'bereavement': return 'Bereavement'
      case 'jury_duty': return 'Jury Duty'
      case 'other': return 'Other'
      default: return type.replace('_', ' ')
    }
  }

  // Calculate duration
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Include both start and end dates
  }

  // Handle approve request
  const handleApprove = async (requestId: string) => {
    if (window.confirm('Are you sure you want to approve this request?')) {
      try {
        await onApprove(requestId)
      } catch (error) {
        console.error('Error approving request:', error)
      }
    }
  }

  // Handle deny request
  const handleDeny = async (requestId: string) => {
    if (!denyReason.trim()) {
      alert('Please provide a reason for denying the request')
      return
    }

    try {
      await onDeny(requestId, denyReason)
      setDenyingRequest(null)
      setDenyReason('')
    } catch (error) {
      console.error('Error denying request:', error)
    }
  }

  // Filter requests by status
  const pendingRequests = requests.filter(req => req.status === 'pending')
  const approvedRequests = requests.filter(req => req.status === 'approved')
  const deniedRequests = requests.filter(req => req.status === 'denied')

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning-600" />
                <span>Pending Requests</span>
              </CardTitle>
              <p className="text-sm text-gray-500">
                {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8">
              <CheckIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                All time-off requests have been processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const staffMember = typeof request.user_id === 'string' ? getStaffMember(request.user_id) : request.user_id
                const duration = calculateDuration(request.start_date, request.end_date)
                
                return (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {staffMember?.name || 'Unknown Staff'}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {staffMember?.role?.replace('_', ' ') || 'Staff Member'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {format(parseISO(request.start_date), 'MMM d, yyyy')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {duration} day{duration > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div>
                            <Badge variant="secondary">
                              {getRequestTypeDisplay(request.request_type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-900 font-medium">Reason:</p>
                          <p className="text-sm text-gray-600">{request.reason}</p>
                        </div>

                        {request.notes && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-900 font-medium">Notes:</p>
                            <p className="text-sm text-gray-600">{request.notes}</p>
                          </div>
                        )}

                        {request.is_urgent && (
                          <div className="flex items-center space-x-2 text-warning-600">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Urgent Request</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(request)}
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        
                        {canManage && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckIcon className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setDenyingRequest(request.id)}
                            >
                              <XMarkIcon className="h-4 w-4 mr-2" />
                              Deny
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Deny Reason Modal */}
                    {denyingRequest === request.id && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-red-800 mb-1">
                              Reason for Denial
                            </label>
                            <textarea
                              value={denyReason}
                              onChange={(e) => setDenyReason(e.target.value)}
                              rows={3}
                              className="input w-full border-red-300 focus:ring-red-500"
                              placeholder="Please provide a reason for denying this request..."
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDenyingRequest(null)
                                setDenyReason('')
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeny(request.id)}
                            >
                              Confirm Denial
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approved Requests */}
      {approvedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckIcon className="h-5 w-5 text-success-600" />
              <span>Approved Requests</span>
            </CardTitle>
            <p className="text-sm text-gray-500">
              {approvedRequests.length} approved request{approvedRequests.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedRequests.slice(0, 5).map((request) => {
                const staffMember = typeof request.user_id === 'string' ? getStaffMember(request.user_id) : request.user_id
                const approver = typeof request.approved_by === 'string' ? getStaffMember(request.approved_by) : request.approved_by
                const duration = calculateDuration(request.start_date, request.end_date)
                
                return (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          {staffMember?.name || 'Unknown Staff'}
                        </p>
                        <p className="text-xs text-green-700">
                          {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d')} ({duration} days)
                        </p>
                        {approver && (
                          <p className="text-xs text-green-600">
                            Approved by: {approver.name}
                            {request.approved_at && (
                              <span className="ml-2">
                                on {format(parseISO(request.approved_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="success">Approved</Badge>
                  </div>
                )
              })}
              {approvedRequests.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{approvedRequests.length - 5} more approved requests
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Denied Requests */}
      {deniedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XMarkIcon className="h-5 w-5 text-danger-600" />
              <span>Denied Requests</span>
            </CardTitle>
            <p className="text-sm text-gray-500">
              {deniedRequests.length} denied request{deniedRequests.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deniedRequests.slice(0, 5).map((request) => {
                const staffMember = typeof request.user_id === 'string' ? getStaffMember(request.user_id) : request.user_id
                const denier = typeof request.approved_by === 'string' ? getStaffMember(request.approved_by) : request.approved_by
                const duration = calculateDuration(request.start_date, request.end_date)
                
                return (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          {staffMember?.name || 'Unknown Staff'}
                        </p>
                        <p className="text-xs text-red-700">
                          {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d')} ({duration} days)
                        </p>
                        {denier && (
                          <p className="text-xs text-red-600">
                            Denied by: {denier.name}
                            {request.approved_at && (
                              <span className="ml-2">
                                on {format(parseISO(request.approved_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                        )}
                        {request.denial_reason && (
                          <p className="text-xs text-red-500 mt-1">
                            Reason: {request.denial_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="danger">Denied</Badge>
                  </div>
                )
              })}
              {deniedRequests.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{deniedRequests.length - 5} more denied requests
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TimeOffRequestList
