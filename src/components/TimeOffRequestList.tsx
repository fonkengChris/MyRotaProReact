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
  EyeIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon
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

  const getStaffMember = (userId: string) => {
    return staff.find(member => member.id === userId)
  }

  const getRequestTypeDisplay = (type: string) => {
    switch (type) {
      case 'annual_leave': return 'Annual Leave'
      case 'sick_leave': return 'Sick Leave'
      case 'personal_leave': return 'Personal Leave'
      case 'bereavement': return 'Bereavement'
      case 'other': return 'Other'
      default: return type.replace('_', ' ')
    }
  }

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1
  }

  const handleApprove = async (requestId: string) => {
    if (window.confirm('Are you sure you want to approve this request?')) {
      try {
        await onApprove(requestId)
      } catch (error) {
        console.error('Error approving request:', error)
      }
    }
  }

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

  const pendingRequests = requests.filter(req => req.status === 'pending')
  const approvedRequests = requests.filter(req => req.status === 'approved')
  const deniedRequests = requests.filter(req => req.status === 'denied')

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-warning-50 to-amber-50/80 dark:from-warning-950/40 dark:to-amber-950/20 border-b border-warning-200/80 dark:border-warning-800/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-100 ring-1 ring-warning-300/60 dark:bg-warning-900/50 dark:ring-warning-600/40">
                <ClockIcon className="h-6 w-6 text-warning-700 dark:text-warning-300" />
              </div>
              <div>
                <CardTitle className="!text-warning-900 dark:!text-warning-100">
                  Pending Requests
                </CardTitle>
                <p className="text-sm text-warning-800/90 dark:text-warning-200/90 mt-0.5">
                  {pendingRequests.length} request{pendingRequests.length !== 1 ? 's' : ''} awaiting approval
                </p>
              </div>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="warning" className="shrink-0 text-sm px-3 py-1">
                {pendingRequests.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/40">
                <CheckCircleIcon className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">No pending requests</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                All time-off requests have been processed
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const staffMember = typeof request.user_id === 'string' ? getStaffMember(request.user_id) : request.user_id
                const duration = calculateDuration(request.start_date, request.end_date)

                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-warning-200/90 bg-warning-50/30 p-4 shadow-sm dark:border-warning-800/50 dark:bg-warning-950/15 dark:shadow-none"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 ring-2 ring-primary-200/80 dark:bg-primary-900/50 dark:ring-primary-700/50">
                            <UserIcon className="h-5 w-5 text-primary-700 dark:text-primary-300" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-50">
                              {staffMember?.name || 'Unknown Staff'}
                            </h4>
                            <p className="text-sm capitalize text-neutral-600 dark:text-neutral-300">
                              {staffMember?.role?.replace('_', ' ') || 'Staff Member'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-neutral-800/60">
                            <CalendarIcon className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" />
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {format(parseISO(request.start_date), 'MMM d, yyyy')} – {format(parseISO(request.end_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-neutral-800/60">
                            <ClockIcon className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" />
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {duration} day{duration > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 dark:bg-neutral-800/60">
                            <DocumentTextIcon className="h-4 w-4 shrink-0 text-warning-600 dark:text-warning-400" />
                            <Badge variant="warning" className="truncate">
                              {getRequestTypeDisplay(request.request_type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mb-3 rounded-lg border border-warning-100 bg-white/60 px-3 py-2.5 dark:border-warning-900/40 dark:bg-neutral-800/50">
                          <div className="flex items-center gap-1.5 mb-1">
                            <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Reason</p>
                          </div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{request.reason}</p>
                        </div>

                        {request.notes && (
                          <div className="mb-3 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2.5 dark:border-neutral-600 dark:bg-neutral-800/50">
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">Notes</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{request.notes}</p>
                          </div>
                        )}

                        {request.is_urgent && (
                          <div className="inline-flex items-center gap-2 rounded-full bg-warning-100 px-3 py-1 text-warning-800 ring-1 ring-warning-300/60 dark:bg-warning-900/50 dark:text-warning-200 dark:ring-warning-600/40">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                            <span className="text-sm font-semibold">Urgent request</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:shrink-0">
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

                    {denyingRequest === request.id && (
                      <div className="mt-4 rounded-lg border border-danger-200 bg-danger-50 p-4 dark:border-danger-800/50 dark:bg-danger-950/30">
                        <div className="space-y-3">
                          <div>
                            <label className="form-label text-danger-800 dark:text-danger-200">
                              Reason for Denial
                            </label>
                            <textarea
                              value={denyReason}
                              onChange={(e) => setDenyReason(e.target.value)}
                              rows={3}
                              className="input w-full border-danger-300 focus:ring-danger-500 dark:border-danger-700"
                              placeholder="Please provide a reason for denying this request..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
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
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-success-50 to-emerald-50/80 dark:from-success-950/40 dark:to-emerald-950/20 border-b border-success-200/80 dark:border-success-800/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-100 ring-1 ring-success-300/60 dark:bg-success-900/50 dark:ring-success-600/40">
                <CheckCircleIcon className="h-6 w-6 text-success-700 dark:text-success-300" />
              </div>
              <div>
                <CardTitle className="!text-success-900 dark:!text-success-100">
                  Approved Requests
                </CardTitle>
                <p className="text-sm text-success-800/90 dark:text-success-200/90 mt-0.5">
                  {approvedRequests.length} approved request{approvedRequests.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {approvedRequests.length > 0 && (
              <Badge variant="success" className="shrink-0 text-sm px-3 py-1">
                {approvedRequests.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {approvedRequests.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <CheckCircleIcon className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">No approved requests yet</h3>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Approved time-off will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedRequests.slice(0, 5).map((request) => {
                const staffMember = typeof request.user_id === 'string' ? getStaffMember(request.user_id) : request.user_id
                const approver = typeof request.approved_by === 'string' ? getStaffMember(request.approved_by) : request.approved_by
                const duration = calculateDuration(request.start_date, request.end_date)

                return (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 rounded-xl border border-success-200/90 bg-success-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-success-800/50 dark:bg-success-950/20"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100 ring-2 ring-success-200/80 dark:bg-success-900/50 dark:ring-success-700/50">
                        <UserIcon className="h-5 w-5 text-success-700 dark:text-success-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-success-950 dark:text-success-50">
                          {staffMember?.name || 'Unknown Staff'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-800 dark:text-success-200">
                            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                            {format(parseISO(request.start_date), 'MMM d')} – {format(parseISO(request.end_date), 'MMM d')}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-800 dark:text-success-200">
                            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                            {duration} day{duration > 1 ? 's' : ''}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-800 dark:text-success-200">
                            <DocumentTextIcon className="h-3.5 w-3.5 shrink-0" />
                            {getRequestTypeDisplay(request.request_type)}
                          </span>
                        </div>
                        {approver && (
                          <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-success-700 dark:text-success-300">
                            <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                            Approved by {approver.name}
                            {request.approved_at && (
                              <span className="text-success-600/90 dark:text-success-400/90">
                                · {format(parseISO(request.approved_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="success" className="shrink-0 self-start sm:self-center">
                      <CheckIcon className="h-3 w-3 mr-1 inline" />
                      Approved
                    </Badge>
                  </div>
                )
              })}
              {approvedRequests.length > 5 && (
                <p className="text-sm font-medium text-success-800 dark:text-success-300 text-center pt-1">
                  +{approvedRequests.length - 5} more approved request{approvedRequests.length - 5 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Denied Requests */}
      {deniedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XMarkIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              <span>Denied Requests</span>
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
                  <div key={request.id} className="flex items-center justify-between rounded-lg border border-danger-200 bg-danger-50/50 p-3 dark:border-danger-800/50 dark:bg-danger-950/20">
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/50">
                        <UserIcon className="h-4 w-4 text-danger-700 dark:text-danger-300" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-danger-900 dark:text-danger-100">
                          {staffMember?.name || 'Unknown Staff'}
                        </p>
                        <p className="text-xs text-danger-800 dark:text-danger-300">
                          {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d')} ({duration} days)
                        </p>
                        {denier && (
                          <p className="text-xs text-danger-700 dark:text-danger-400">
                            Denied by: {denier.name}
                            {request.approved_at && (
                              <span className="ml-2">
                                on {format(parseISO(request.approved_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                        )}
                        {request.denial_reason && (
                          <p className="text-xs text-danger-600 dark:text-danger-400 mt-1">
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center">
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
