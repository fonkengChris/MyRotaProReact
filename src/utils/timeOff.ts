import { TimeOffRequest, TimeOffType } from '@/types'

const REQUEST_TYPE_LABELS: Record<TimeOffType, string> = {
  annual_leave: 'Annual leave',
  sick_leave: 'Sick leave',
  personal_leave: 'Personal leave',
  bereavement: 'Bereavement',
  other: 'Other'
}

export function getTimeOffTypeLabel(type: string): string {
  return REQUEST_TYPE_LABELS[type as TimeOffType] || type.replace(/_/g, ' ')
}

export function isDateOnApprovedLeave(dateStr: string, requests: TimeOffRequest[]): boolean {
  return requests.some(
    (r) =>
      r.status === 'approved' &&
      dateStr >= r.start_date &&
      dateStr <= r.end_date
  )
}

export function getApprovedLeaveForDate(
  dateStr: string,
  requests: TimeOffRequest[]
): TimeOffRequest | undefined {
  return requests.find(
    (r) =>
      r.status === 'approved' &&
      dateStr >= r.start_date &&
      dateStr <= r.end_date
  )
}

export function filterApprovedLeave(requests: TimeOffRequest[]): TimeOffRequest[] {
  return requests.filter((r) => r.status === 'approved')
}
