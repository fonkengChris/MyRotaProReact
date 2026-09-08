import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { shiftsApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { RestException } from '@/types'

function staffName(row: RestException): string {
  if (typeof row.user === 'object' && row.user?.name) return row.user.name
  return 'Staff member'
}

function userId(row: RestException): string {
  if (typeof row.user === 'object') return row.user.id || row.user._id || ''
  return row.user
}

function shiftLabel(row: RestException): string {
  const day = format(new Date(`${row.date}T00:00:00`), 'EEE d MMM')
  return `${day} · ${row.start_time.substring(0, 5)}–${row.end_time.substring(0, 5)}`
}

/**
 * Pending rest-exception assignments for admins to confirm or remove. These are shifts a
 * support worker self-selected that break only the <8h rest rule (assign-now, flag-for-review).
 */
const RestExceptionApprovals: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: rows = [] } = useQuery({
    queryKey: ['restExceptions', 'pending'],
    queryFn: () => shiftsApi.listRestExceptions({ status: 'pending' }),
    refetchInterval: 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['restExceptions'] })
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
  }

  const confirmMutation = useMutation({
    mutationFn: ({ shiftId, uid }: { shiftId: string; uid: string }) =>
      shiftsApi.confirmRestException(shiftId, uid),
    onSuccess: () => {
      toast.success('Rest exception confirmed')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to confirm'),
  })

  const removeMutation = useMutation({
    mutationFn: ({ shiftId, uid }: { shiftId: string; uid: string }) =>
      shiftsApi.removeRestException(shiftId, uid),
    onSuccess: () => {
      toast.success('Assignment removed')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to remove'),
  })

  if (rows.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rest-exception approvals ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const uid = userId(row)
          const key = `${row.shift_id}:${uid}`
          const pending = confirmMutation.isPending || removeMutation.isPending
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{staffName(row)}</p>
                <p className="text-sm text-muted-foreground">{shiftLabel(row)}</p>
                <p className="text-xs text-muted-foreground">Less than 8h rest before/after an adjacent shift</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() => confirmMutation.mutate({ shiftId: row.shift_id, uid })}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  loading={pending}
                  onClick={() => removeMutation.mutate({ shiftId: row.shift_id, uid })}
                >
                  Remove
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

export default RestExceptionApprovals
