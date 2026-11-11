import { Availability, AvailabilityStatus, BadgeVariant } from '@/types'

export const AVAILABILITY_STATUS_OPTIONS: { value: AvailabilityStatus; label: string; hint: string }[] = [
  { value: 'available', label: 'Available', hint: 'Any time this day' },
  { value: 'partial', label: 'Partial', hint: 'Only between set times' },
  { value: 'unavailable', label: 'Unavailable', hint: 'Not this day' },
]

export const availabilityBadgeVariant: Record<AvailabilityStatus, BadgeVariant> = {
  available: 'success',
  partial: 'warning',
  unavailable: 'danger',
}

/** Status of a record; ones saved before `status` existed only carry is_available. */
export const availabilityStatusOf = (a: Pick<Availability, 'status' | 'is_available'>): AvailabilityStatus =>
  a.status || (a.is_available === false ? 'unavailable' : 'available')

/** Whether a partial window ends on the following day (end at or before start). */
export const windowRunsPastMidnight = (start?: string, end?: string) =>
  !!start && !!end && end <= start && end !== '00:00'

/** "09:00–17:00", with "(+1)" when the window runs past midnight. */
export const formatAvailabilityWindow = (start?: string, end?: string) =>
  start && end ? `${start}–${end}${windowRunsPastMidnight(start, end) ? ' (+1)' : ''}` : ''

/** Hours in a partial window (overnight windows wrap; 23:59 counts as midnight). */
export const availabilityWindowHours = (start: string, end: string) => {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const s = toMin(start)
  let e = toMin(end)
  if (e === 24 * 60 - 1) e = 24 * 60
  if (e <= s) e += 24 * 60
  return (e - s) / 60
}

export const availabilityLabel = (a: Pick<Availability, 'status' | 'is_available' | 'start_time' | 'end_time'>) => {
  const status = availabilityStatusOf(a)
  if (status === 'partial') return `Partial · ${formatAvailabilityWindow(a.start_time, a.end_time)}`
  return status === 'available' ? 'Available' : 'Unavailable'
}
