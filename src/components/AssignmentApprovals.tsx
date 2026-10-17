import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { shiftsApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { HoursCapException, RestException } from '@/types'

type FlaggedRow = RestException | HoursCapException

function staffName(row: FlaggedRow): string {
  if (typeof row.user === 'object' && row.user?.name) return row.user.name
  return 'Staff member'
}

function userId(row: FlaggedRow): string {
  if (typeof row.user === 'object') return row.user.id || row.user._id || ''
  return row.user
}

function shiftLabel(row: FlaggedRow): string {
  const day = format(new Date(`${row.date}T00:00:00`), 'EEE d MMM')
  return `${day} · ${row.start_time.substring(0, 5)}–${row.end_time.substring(0, 5)}`
}

// Shifts staff self-selected that broke a rule they may go ahead with pending review:
//   rest      - less than the minimum rest gap
//   hours_cap - takes a full-timer over the weekly paid-hours cap
const KINDS = {
  rest: {
    title: 'Rest-exception approvals',
    queryKey: 'restExceptions',
    list: () => shiftsApi.listRestExceptions({ status: 'pending' }),
    confirm: shiftsApi.confirmRestException,
    remove: shiftsApi.removeRestException,
    confirmed: 'Rest exception confirmed',
    reason: (_row: FlaggedRow) => 'Less than the minimum rest before/after an adjacent shift',
  },
  hours_cap: {
    title: 'Weekly hours approvals',
    queryKey: 'hoursCapExceptions',
    list: () => shiftsApi.listHoursCapExceptions({ status: 'pending' }),
    confirm: shiftsApi.confirmHoursCapException,
    remove: shiftsApi.removeHoursCapException,
    confirmed: 'Extra hours approved',
    reason: (row: FlaggedRow) => {
      const hours = (row as HoursCapException).projected_weekly_hours
      return typeof hours === 'number'
        ? `Takes their week to ${hours}h paid (after breaks), over the full-time limit`
        : 'Over the full-time weekly hours limit'
    },
  },
} as const

/** Pending flagged assignments of one kind for an admin to confirm or remove. */
const AssignmentApprovals: React.FC<{ kind: keyof typeof KINDS }> = ({ kind }) => {
  const config = KINDS[kind]
  const queryClient = useQueryClient()

  const { data: rows = [] } = useQuery<FlaggedRow[]>({
    queryKey: [config.queryKey, 'pending'],
    queryFn: config.list,
    refetchInterval: 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [config.queryKey] })
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
  }

  const confirmMutation = useMutation({
    mutationFn: ({ shiftId, uid }: { shiftId: string; uid: string }) => config.confirm(shiftId, uid),
    onSuccess: () => {
      toast.success(config.confirmed)
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to confirm'),
  })

  const removeMutation = useMutation({
    mutationFn: ({ shiftId, uid }: { shiftId: string; uid: string }) => config.remove(shiftId, uid),
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
        <CardTitle>{config.title} ({rows.length})</CardTitle>
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
                <p className="text-xs text-muted-foreground">{config.reason(row)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  loading={pending}
                  onClick={() => confirmMutation.mutate({ shiftId: row.shift_id, uid })}
                >
                  {kind === 'hours_cap' ? 'Approve' : 'Confirm'}
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

export default AssignmentApprovals
