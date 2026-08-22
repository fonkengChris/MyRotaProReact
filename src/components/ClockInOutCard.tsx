import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { shiftsApi, overtimeApi } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { ClockIcon } from '@heroicons/react/24/outline'
import type { Shift, StaffAssignment, ClockOutResponse } from '@/types'

// How early (minutes) staff may clock in — mirrors server EARLY_CLOCK_IN_MINUTES.
const EARLY_CLOCK_IN_MINUTES = 15

/** Build a Date from a shift's YYYY-MM-DD date + HH:MM time in the browser's local zone. */
function shiftDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function shiftStart(shift: Shift): Date {
  return shiftDateTime(shift.date, shift.start_time)
}

function shiftEnd(shift: Shift): Date {
  const start = shiftStart(shift)
  const end = shiftDateTime(shift.date, shift.end_time)
  if (end <= start) end.setDate(end.getDate() + 1) // overnight shift
  return end
}

function myAssignment(shift: Shift, userId?: string): StaffAssignment | undefined {
  return shift.assigned_staff?.find(
    (a) => a.user_id === userId && a.status !== 'declined'
  )
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

const ClockInOutCard: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const [overtimeMinutes, setOvertimeMinutes] = useState('')
  const [overtimeReason, setOvertimeReason] = useState('')
  const [overtimeInfo, setOvertimeInfo] = useState<ClockOutResponse | null>(null)

  // Tick every second for the live elapsed timer / late badge.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Today + yesterday covers overnight shifts still in progress.
  const today = format(now, 'yyyy-MM-dd')
  const yesterday = format(new Date(now.getTime() - 86_400_000), 'yyyy-MM-dd')

  const { data: shifts = [] } = useQuery({
    queryKey: ['attendanceShifts', yesterday, today, user?.id],
    queryFn: () =>
      shiftsApi.getAll({ user_id: user?.id, start_date: yesterday, end_date: today }),
    enabled: !!user?.id,
    refetchInterval: 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  // Pick the most relevant shift: one within [start - grace, end], preferring not-yet-clocked-out.
  const activeShift = useMemo(() => {
    const candidates = shifts
      .map((shift) => ({ shift, assignment: myAssignment(shift, user?.id) }))
      .filter((c) => !!c.assignment)
      .filter((c) => {
        const windowOpen = new Date(shiftStart(c.shift).getTime() - EARLY_CLOCK_IN_MINUTES * 60000)
        // Keep clocked-out shifts visible for a short while so staff can request overtime.
        const cutoff = new Date(shiftEnd(c.shift).getTime() + 60 * 60000)
        return now >= windowOpen && now <= cutoff
      })
      .sort((a, b) => shiftStart(a.shift).getTime() - shiftStart(b.shift).getTime())

    // Prefer a shift that is clocked in but not out, else the earliest candidate.
    return (
      candidates.find((c) => c.assignment?.attendance_status === 'clocked_in') ||
      candidates.find((c) => c.assignment?.attendance_status !== 'clocked_out') ||
      candidates[0] ||
      null
    )
  }, [shifts, user?.id, now])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['attendanceShifts'] })
    queryClient.invalidateQueries({ queryKey: ['myShifts'] })
  }

  const clockInMutation = useMutation({
    mutationFn: (shiftId: string) => shiftsApi.clockIn(shiftId),
    onSuccess: () => {
      toast.success('Clocked in')
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to clock in'),
  })

  const clockOutMutation = useMutation({
    mutationFn: (shiftId: string) => shiftsApi.clockOut(shiftId),
    onSuccess: (res) => {
      toast.success('Clocked out')
      if (res.overtime_eligible) {
        setOvertimeInfo(res)
        setOvertimeMinutes(String(res.extra_minutes))
      }
      invalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to clock out'),
  })

  const overtimeMutation = useMutation({
    mutationFn: (vars: { shiftId: string; minutes: number; reason: string }) =>
      overtimeApi.create({
        shift_id: vars.shiftId,
        requested_minutes: vars.minutes,
        reason: vars.reason,
      }),
    onSuccess: () => {
      toast.success('Overtime request submitted for approval')
      setOvertimeInfo(null)
      setOvertimeMinutes('')
      setOvertimeReason('')
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Failed to submit overtime request'),
  })

  if (!activeShift) return null

  const { shift, assignment } = activeShift
  const status = assignment?.attendance_status || 'not_started'
  const start = shiftStart(shift)
  const end = shiftEnd(shift)
  const windowOpen = new Date(start.getTime() - EARLY_CLOCK_IN_MINUTES * 60000)
  const minutesLate = Math.floor((now.getTime() - start.getTime()) / 60000)

  const homeName =
    typeof shift.home_id === 'object' && shift.home_id?.name ? shift.home_id.name : 'your shift'

  const submitOvertime = () => {
    const minutes = Number(overtimeMinutes)
    if (!Number.isFinite(minutes) || minutes < 1) {
      toast.error('Enter the number of extra minutes worked')
      return
    }
    overtimeMutation.mutate({ shiftId: shift.id, minutes, reason: overtimeReason })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Current shift
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{homeName}</p>
            <p className="text-sm text-muted-foreground">
              {shift.start_time}–{shift.end_time} · {format(start, 'EEE d MMM')}
            </p>
          </div>
          {status === 'not_started' && minutesLate >= 5 && now <= end && (
            <Badge variant="danger">{minutesLate} min late</Badge>
          )}
          {status === 'clocked_in' && <Badge variant="success">On shift</Badge>}
          {status === 'clocked_out' && <Badge variant="secondary">Completed</Badge>}
        </div>

        {/* Not yet clocked in */}
        {status === 'not_started' && (
          <>
            {now < windowOpen ? (
              <Button disabled className="w-full">
                Clock-in opens at {format(windowOpen, 'HH:mm')}
              </Button>
            ) : now > end ? (
              <p className="text-sm text-muted-foreground">This shift has ended.</p>
            ) : (
              <Button
                className="w-full"
                loading={clockInMutation.isPending}
                onClick={() => clockInMutation.mutate(shift.id)}
              >
                Clock in
              </Button>
            )}
          </>
        )}

        {/* Clocked in — show timer + clock out */}
        {status === 'clocked_in' && assignment?.clock_in_time && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Time on shift</p>
              <p className="text-3xl font-semibold tabular-nums">
                {formatElapsed(now.getTime() - new Date(assignment.clock_in_time).getTime())}
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full"
              loading={clockOutMutation.isPending}
              onClick={() => clockOutMutation.mutate(shift.id)}
            >
              Clock out
            </Button>
          </div>
        )}

        {/* Clocked out summary */}
        {status === 'clocked_out' && assignment?.clock_in_time && assignment?.clock_out_time && (
          <p className="text-sm text-muted-foreground">
            Clocked {format(new Date(assignment.clock_in_time), 'HH:mm')}–
            {format(new Date(assignment.clock_out_time), 'HH:mm')}.
          </p>
        )}

        {/* Overtime request (offered after an eligible clock-out) */}
        {overtimeInfo && overtimeInfo.overtime_eligible && (
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-sm font-medium">
              You clocked out {overtimeInfo.extra_minutes} min past the scheduled end.
            </p>
            <p className="text-xs text-muted-foreground">
              Request overtime for a manager to approve before it counts toward paid hours.
            </p>
            <input
              type="number"
              min={1}
              value={overtimeMinutes}
              onChange={(e) => setOvertimeMinutes(e.target.value)}
              placeholder="Extra minutes"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={overtimeMutation.isPending}
                onClick={submitOvertime}
              >
                Request overtime
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOvertimeInfo(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClockInOutCard
