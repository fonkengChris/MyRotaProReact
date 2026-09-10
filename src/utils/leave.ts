import { TimeOffRequest, User } from '@/types'

/**
 * Leave year runs 6 April – 5 April (UK tax-year convention). Returns the window
 * (inclusive, YYYY-MM-DD) containing `ref`.
 */
export function getLeaveYear(ref: Date = new Date()): { start: string; end: string } {
  const year = ref.getFullYear()
  // Anything before 6 April belongs to the leave year that started the previous 6 April.
  const beforeApril6 =
    ref.getMonth() < 3 || (ref.getMonth() === 3 && ref.getDate() < 6)
  const startYear = beforeApril6 ? year - 1 : year
  return {
    start: `${startYear}-04-06`,
    end: `${startYear + 1}-04-05`,
  }
}

/** Human-readable label for a leave-year window, e.g. "6 Apr 2026 – 5 Apr 2027". */
export function formatLeaveYearLabel(range: { start: string; end: string }): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return `${fmt(range.start)} – ${fmt(range.end)}`
}

/**
 * Statutory annual leave default derived from employment type when no explicit
 * entitlement is stored. Full-time 28 days; part-time pro-rated against a 40h week
 * (capped at 28); bank staff accrue rather than hold a fixed entitlement (0).
 */
export function computeEntitlement(user?: Pick<User, 'type' | 'min_hours_per_week' | 'annual_leave_entitlement_days'> | null): number {
  if (!user) return 0
  if (typeof user.annual_leave_entitlement_days === 'number') {
    return user.annual_leave_entitlement_days
  }
  switch (user.type) {
    case 'fulltime':
      return 28
    case 'parttime':
      return Math.min(28, Math.round(28 * ((user.min_hours_per_week || 0) / 40)))
    case 'bank':
      return 0
    default:
      return 28
  }
}

/** Inclusive calendar-day count between two YYYY-MM-DD strings. */
function inclusiveDays(startIso: string, endIso: string): number {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff) + 1
}

/**
 * Days of a request that fall inside the leave-year window, counted as inclusive
 * calendar days. Returns 0 when the request lies entirely outside the window.
 */
export function countLeaveDaysInYear(
  request: Pick<TimeOffRequest, 'start_date' | 'end_date'>,
  year: { start: string; end: string }
): number {
  const clampedStart = request.start_date > year.start ? request.start_date : year.start
  const clampedEnd = request.end_date < year.end ? request.end_date : year.end
  if (clampedStart > clampedEnd) return 0
  return inclusiveDays(clampedStart, clampedEnd)
}

export interface LeaveSummary {
  entitlement: number
  taken: number
  booked: number
  pending: number
  remaining: number
  leaveYear: { start: string; end: string }
}

/**
 * Summarise a user's annual-leave position for the leave year containing `refDate`.
 * Only `annual_leave` requests count against the entitlement (sick/bereavement/etc.
 * are tracked elsewhere but never deducted here).
 *  - taken:   approved leave whose range has already ended (end_date < today)
 *  - booked:  approved leave still upcoming/ongoing (end_date >= today)
 *  - pending: pending requests (shown for visibility, not deducted)
 *  - remaining: entitlement − taken − booked
 */
export function summariseLeave(
  requests: TimeOffRequest[],
  user?: Pick<User, 'type' | 'min_hours_per_week' | 'annual_leave_entitlement_days'> | null,
  refDate: Date = new Date()
): LeaveSummary {
  const leaveYear = getLeaveYear(refDate)
  const entitlement = computeEntitlement(user)
  const today = refDate.toISOString().split('T')[0]

  const annualLeave = requests.filter((r) => r.request_type === 'annual_leave')

  let taken = 0
  let booked = 0
  let pending = 0

  for (const req of annualLeave) {
    const days = countLeaveDaysInYear(req, leaveYear)
    if (days === 0) continue
    if (req.status === 'approved') {
      if (req.end_date < today) taken += days
      else booked += days
    } else if (req.status === 'pending') {
      pending += days
    }
  }

  const remaining = entitlement - taken - booked

  return { entitlement, taken, booked, pending, remaining, leaveYear }
}
