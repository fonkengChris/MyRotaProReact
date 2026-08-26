import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { shiftsApi, homesApi } from '@/lib/api'
import { usePermissions } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import PageHeader from '@/components/common/PageHeader'
import KpiTile from '@/components/common/KpiTile'
import type { AttendanceLog, AttendanceStatus } from '@/types'

type StatusFilter = 'all' | AttendanceStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'clocked_in', label: 'On shift' },
  { value: 'clocked_out', label: 'Completed' },
  { value: 'not_started', label: 'Not started' },
  { value: 'missed', label: 'Missed' },
]

/** Human-friendly minutes, e.g. 95 -> "1h 35m". */
function formatMinutes(mins: number | null): string {
  if (mins == null) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function statusBadge(log: AttendanceLog) {
  switch (log.attendance_status) {
    case 'clocked_in':
      return <Badge variant="success">On shift</Badge>
    case 'clocked_out':
      return <Badge variant="secondary">Completed</Badge>
    case 'missed':
      return <Badge variant="danger">Missed</Badge>
    default:
      return <Badge variant="warning">Not started</Badge>
  }
}

/** Admin analysis of clock-in / clock-out logs across all staff. */
const ClockInAnalysis: React.FC = () => {
  const { canViewAllHomes } = usePermissions()

  // Default to the current week (Mon–Sun).
  const [startDate, setStartDate] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const [endDate, setEndDate] = useState(() =>
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  )
  const [homeId, setHomeId] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')

  const { data: homes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    enabled: canViewAllHomes,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['attendanceLogs', startDate, endDate, homeId, status],
    queryFn: () =>
      shiftsApi.attendanceLogs({
        start_date: startDate,
        end_date: endDate,
        home_id: homeId || undefined,
        status: status === 'all' ? undefined : status,
      }),
    refetchInterval: 60_000,
  })

  const summary = data?.summary
  const logs = data?.logs ?? []

  // Client-side name/email search over the returned rows.
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter(
      (l) =>
        l.user_name.toLowerCase().includes(q) ||
        (l.user_email ?? '').toLowerCase().includes(q) ||
        (l.home_name ?? '').toLowerCase().includes(q)
    )
  }, [logs, search])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clock-In Analysis"
        subtitle="Clock-in / clock-out logs across all staff"
      />

      {/* Filters */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">From</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">To</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          {canViewAllHomes && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Home</span>
              <select
                value={homeId}
                onChange={(e) => setHomeId(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All homes</option>
                {homes.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or home"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile icon={UserGroupIcon} tone="primary" label="Total logs" value={summary.total} />
          <KpiTile icon={ClockIcon} tone="success" label="On shift" value={summary.clocked_in} />
          <KpiTile
            icon={CheckCircleIcon}
            tone="secondary"
            label="Completed"
            value={summary.clocked_out}
          />
          <KpiTile
            icon={ExclamationTriangleIcon}
            tone="warning"
            label="Late arrivals"
            value={summary.late}
          />
          <KpiTile icon={NoSymbolIcon} tone="danger" label="Missed" value={summary.missed} />
        </div>
      )}

      {/* Logs table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <p className="py-12 text-center text-sm text-danger-600">
              Failed to load clock-in logs.
            </p>
          ) : filteredLogs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No clock-in records for the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Home</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Scheduled</th>
                    <th className="px-4 py-3 font-medium">Clock in</th>
                    <th className="px-4 py-3 font-medium">Clock out</th>
                    <th className="px-4 py-3 font-medium">Worked</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={`${log.shift_id}-${log.user_id}`}
                      className="border-b border-border last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {log.user_name}
                        </p>
                        {log.user_role && (
                          <p className="text-xs capitalize text-muted-foreground">
                            {log.user_role.replace('_', ' ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.home_name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {format(new Date(`${log.date}T00:00:00`), 'EEE d MMM')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                        {log.start_time}–{log.end_time}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {log.clock_in_time ? (
                          <span className="inline-flex items-center gap-2">
                            {format(new Date(log.clock_in_time), 'HH:mm')}
                            {log.is_late && (
                              <Badge variant="danger">{log.minutes_late}m late</Badge>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {log.clock_out_time ? (
                          <span className="inline-flex items-center gap-2">
                            {format(new Date(log.clock_out_time), 'HH:mm')}
                            {log.minutes_over > 0 && (
                              <Badge variant="warning">+{log.minutes_over}m</Badge>
                            )}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatMinutes(log.worked_minutes)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(log)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClockInAnalysis
