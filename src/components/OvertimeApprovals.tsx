import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { overtimeApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { OvertimeRequest } from '@/types'

function staffName(req: OvertimeRequest): string {
  if (typeof req.user_id === 'object' && req.user_id?.name) return req.user_id.name
  return 'Staff member'
}

/** Pending overtime requests for managers/admins to approve or deny. */
const OvertimeApprovals: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: requests = [] } = useQuery({
    queryKey: ['overtimeRequests', 'pending'],
    queryFn: () => overtimeApi.list({ status: 'pending' }),
    refetchInterval: 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['overtimeRequests'] })

  const approveMutation = useMutation({
    mutationFn: (id: string) => overtimeApi.approve(id),
    onSuccess: () => {
      toast.success('Overtime approved')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to approve'),
  })

  const denyMutation = useMutation({
    mutationFn: (id: string) => overtimeApi.deny(id),
    onSuccess: () => {
      toast.success('Overtime denied')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to deny'),
  })

  if (requests.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overtime requests ({requests.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.map((req) => {
          const id = req.id || req._id || ''
          return (
            <div
              key={id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{staffName(req)}</p>
                <p className="text-sm text-muted-foreground">
                  {req.requested_minutes} min
                  {req.actual_clock_out
                    ? ` · out ${format(new Date(req.actual_clock_out), 'HH:mm, EEE d MMM')}`
                    : ''}
                </p>
                {req.reason && <p className="text-xs text-muted-foreground truncate">{req.reason}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={denyMutation.isPending}
                  onClick={() => denyMutation.mutate(id)}
                >
                  Deny
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default OvertimeApprovals
