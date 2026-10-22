import type { Shift } from '@/types'

/**
 * Sleeping-night sleep period is the LAST `getSleepInHours()` hours (default 9, admin-editable on
 * the solver settings page) of the rostered shift; any earlier hours are regular paid hours, and a
 * shift no longer than that is all sleep. Sleep is paid a flat allowance in payroll. Mirrors the
 * server `utils/shiftHours.js`. `night-wake`, `one_to_one`, and legacy `night` are not split —
 * full rostered time counts as paid work (before breaks).
 */

export const DEFAULT_SLEEP_IN_HOURS = 9
let sleepInHours = DEFAULT_SLEEP_IN_HOURS

/** Set the org's sleep-in length (loaded at sign-in from GET /ai-solver/sleep-in). */
export function setSleepInHours(hours: unknown): void {
  const n = Number(hours)
  sleepInHours = Number.isFinite(n) && n > 0 ? n : DEFAULT_SLEEP_IN_HOURS
}

export function getSleepInHours(): number {
  return sleepInHours
}

/** Wall-clock minute range on a start-day-midnight axis (overnight end > 1440), or null. */
function wallClockRange(startTime?: string, endTime?: string): { startMin: number; endMin: number } | null {
  if (!startTime || !endTime) return null
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  if ([sh, sm, eh, em].some(Number.isNaN)) return null
  const startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin < startMin) endMin += 24 * 60
  return { startMin, endMin }
}

/**
 * Sleep hours of a window [startMin, endMin]: its overlap with the rostered sleep period, the
 * last getSleepInHours() of [scheduledStartMin, scheduledEndMin]. Fixed on rota times, so late
 * arrival cuts regular hours and leaving early cuts sleep. Mirrors the server.
 */
export function nightSleepHours(
  startMin: number,
  endMin: number,
  scheduledStartMin: number,
  scheduledEndMin: number
): number {
  const sleepStart = Math.max(scheduledStartMin, scheduledEndMin - sleepInHours * 60)
  const from = Math.max(startMin, sleepStart)
  const to = Math.min(endMin, scheduledEndMin)
  return Math.max(0, to - from) / 60
}

/**
 * Clocking in this many minutes (or more) after scheduled start deducts the late
 * time from worked/paid hours. Lateness below this is forgiven. Mirrors the server
 * `LATE_ARRIVAL_MINUTES` in `utils/shiftTime.js`.
 */
export const LATE_ARRIVAL_MINUTES = 15

/**
 * A clock-out within this many minutes either side of the scheduled end rounds to the
 * scheduled end. Mirrors the server `CLOCK_OUT_GRACE_MINUTES` in `utils/shiftTime.js`.
 */
export const CLOCK_OUT_GRACE_MINUTES = 10

function durationFromTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startTotal = sh * 60 + sm
  let endTotal = eh * 60 + em
  if (endTotal < startTotal) endTotal += 24 * 60
  return (endTotal - startTotal) / 60
}

/** Scheduled start/end instants for a shift, from its date + wall-clock times. */
function scheduledInstants(shift: {
  date?: string
  start_time?: string
  end_time?: string
}): { start: number; end: number } | null {
  if (!shift.date || !shift.start_time || !shift.end_time) return null
  const [y, mo, d] = shift.date.split('-').map(Number)
  const [sh, sm] = shift.start_time.split(':').map(Number)
  const [eh, em] = shift.end_time.split(':').map(Number)
  if ([y, mo, d, sh, sm, eh, em].some(Number.isNaN)) return null
  const start = new Date(y, mo - 1, d, sh, sm)
  let end = new Date(y, mo - 1, d, eh, em)
  // Overnight shift: end wall-clock is at or before start, so it's the next day.
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 24 * 3_600_000)
  return { start: start.getTime(), end: end.getTime() }
}

/**
 * Worked hours clamped to the scheduled window (kept in sync with the server
 * `clampedWorkedDurationHours` in `utils/shiftHours.js`):
 * - Early clock-in never counts — worked time starts no earlier than scheduled start.
 * - Late arrival below LATE_ARRIVAL_MINUTES is forgiven; at/beyond it the full late
 *   time is deducted.
 * - Clock-out within CLOCK_OUT_GRACE_MINUTES either side of the scheduled end counts as
 *   ending exactly at the scheduled end. Beyond that: a late clock-out clamps to the
 *   scheduled end (extra time only paid via a separately-approved overtime request); an
 *   early clock-out counts the actual time worked.
 *
 * Returns null when there is no clock-in. Pass `nowMs` to value an in-progress shift
 * (clocked in, not yet out) up to the current time; without it, a missing clock-out
 * returns null.
 */
function effectiveWorkedWindow(
  shift: { date?: string; start_time?: string; end_time?: string },
  assignment?: { clock_in_time?: string | null; clock_out_time?: string | null },
  nowMs?: number
): { start: number; end: number } | null {
  if (!assignment?.clock_in_time) return null
  const inMs = new Date(assignment.clock_in_time).getTime()
  const outMs = assignment.clock_out_time
    ? new Date(assignment.clock_out_time).getTime()
    : nowMs
  if (outMs == null || Number.isNaN(inMs) || Number.isNaN(outMs) || outMs <= inMs) return null

  const sched = scheduledInstants(shift)
  if (!sched) return null

  let effectiveStart = sched.start
  const lateMinutes = (inMs - sched.start) / 60000
  if (lateMinutes >= LATE_ARRIVAL_MINUTES) effectiveStart = inMs

  // Within CLOCK_OUT_GRACE_MINUTES either side of the scheduled end → ends exactly at end.
  // Otherwise: late clock-out clamps to end (overtime handled separately); early clock-out
  // counts the actual time worked.
  const outDiffMin = (outMs - sched.end) / 60000
  const effectiveEnd =
    Math.abs(outDiffMin) <= CLOCK_OUT_GRACE_MINUTES ? sched.end : Math.min(outMs, sched.end)
  return { start: effectiveStart, end: effectiveEnd }
}

export function clampedWorkedDurationHours(
  shift: { date?: string; start_time?: string; end_time?: string },
  assignment?: { clock_in_time?: string | null; clock_out_time?: string | null },
  nowMs?: number
): number | null {
  const w = effectiveWorkedWindow(shift, assignment, nowMs)
  if (!w) return null
  return Math.max(0, (w.end - w.start) / 3_600_000)
}

/**
 * Hour breakdown ({ duration_hours, sleep_in_hours, paid_work_hours }) from the ACTUAL
 * clamped worked window, or null without a clock-in. Pass `nowMs` to value an in-progress
 * shift. For `night-sleep`, the effective window is mapped onto the wall-clock minute axis
 * and intersected with the rostered sleep period. Mirrors the server
 * `workedHourBreakdown`.
 */
export function workedHourBreakdown(
  shift: { date?: string; start_time?: string; end_time?: string; shift_type?: string },
  assignment?: { clock_in_time?: string | null; clock_out_time?: string | null },
  nowMs?: number
): { duration_hours: number; sleep_in_hours: number; paid_work_hours: number } | null {
  const w = effectiveWorkedWindow(shift, assignment, nowMs)
  if (!w) return null
  const duration = Math.max(0, (w.end - w.start) / 3_600_000)

  if (shift.shift_type !== 'night-sleep') {
    return { duration_hours: duration, sleep_in_hours: 0, paid_work_hours: duration }
  }

  const sched = scheduledInstants(shift)
  const range = wallClockRange(shift.start_time, shift.end_time)
  const baseStartMin = range ? range.startMin : 0
  const schedStartMs = sched ? sched.start : w.start
  const baseEndMin = range ? range.endMin : baseStartMin + ((sched ? sched.end : w.end) - schedStartMs) / 60000
  const startMin = baseStartMin + (w.start - schedStartMs) / 60000
  const endMin = baseStartMin + (w.end - schedStartMs) / 60000
  const sleep_in_hours = nightSleepHours(startMin, endMin, baseStartMin, baseEndMin)

  return {
    duration_hours: duration,
    sleep_in_hours,
    paid_work_hours: Math.max(0, duration - sleep_in_hours),
  }
}

type Interval = { start: number; end: number }
type TimedShift = { id?: string; date?: string; start_time?: string; end_time?: string; shift_type?: string }

/**
 * The part of a background shift that is paid work: for `night-sleep` the last
 * getSleepInHours() of the shift are sleep-in, not paid hours, so a 1-to-1 then is extra
 * time. Mirrors the server `paidPortion` in `utils/oneToOne.js`.
 */
function backgroundPaidWindow(shift: TimedShift): Interval | null {
  const w = scheduledInstants(shift)
  if (!w) return null
  if (shift.shift_type !== 'night-sleep') return w
  const cut = Math.max(w.start, w.end - sleepInHours * 3_600_000)
  return cut > w.start ? { start: w.start, end: cut } : null
}

/** `window` minus every interval in `cuts`, as total hours. */
export function subtractIntervalsHours(window: Interval | null, cuts: Interval[]): number {
  if (!window || window.end <= window.start) return 0
  let remaining: Interval[] = [window]
  for (const cut of cuts) {
    if (cut.end <= cut.start) continue
    remaining = remaining.flatMap((r) => {
      if (cut.end <= r.start || cut.start >= r.end) return [r]
      const parts: Interval[] = []
      if (cut.start > r.start) parts.push({ start: r.start, end: cut.start })
      if (cut.end < r.end) parts.push({ start: cut.end, end: r.end })
      return parts
    })
  }
  return remaining.reduce((sum, r) => sum + (r.end - r.start), 0) / 3_600_000
}

function backgroundCuts(oneToOne: TimedShift, userShifts: TimedShift[]): Interval[] {
  return userShifts
    .filter((s) => s.shift_type !== 'one_to_one' && s.id !== oneToOne.id)
    .map(backgroundPaidWindow)
    .filter((w): w is Interval => !!w)
}

/**
 * True when a 1-to-1 lies fully inside one of the staff member's background shifts:
 * it then adds no paid hours and needs no clock-in (attendance comes from the
 * background shift). Mirrors the server `isCoveredBy` in `utils/oneToOne.js`.
 */
export function isCoveredByBackground(oneToOne: TimedShift, userShifts: TimedShift[]): boolean {
  if (oneToOne.shift_type !== 'one_to_one') return false
  const w = scheduledInstants(oneToOne)
  if (!w) return false
  return backgroundCuts(oneToOne, userShifts).some((b) => b.start <= w.start && b.end >= w.end)
}

/** Rostered hours a 1-to-1 adds for a staff member beyond their background shifts. */
export function extraOneToOneHours(oneToOne: TimedShift, userShifts: TimedShift[]): number {
  return subtractIntervalsHours(scheduledInstants(oneToOne), backgroundCuts(oneToOne, userShifts))
}

function breakDeductionFor(work: number): { breakDeduction: number; deductionReason: string } {
  if (work >= 12) return { breakDeduction: 1, deductionReason: '12+ hour paid work — break' }
  if (work >= 8) return { breakDeduction: 0.5, deductionReason: '8–12 hour paid work — break' }
  return { breakDeduction: 0, deductionReason: 'No break deduction (< 8 hours paid work)' }
}

/** Actual worked hours from clock times, or null when the pair is incomplete/invalid. */
export function actualDurationHours(assignment?: {
  clock_in_time?: string | null
  clock_out_time?: string | null
}): number | null {
  if (!assignment?.clock_in_time || !assignment?.clock_out_time) return null
  const inMs = new Date(assignment.clock_in_time).getTime()
  const outMs = new Date(assignment.clock_out_time).getTime()
  if (Number.isNaN(inMs) || Number.isNaN(outMs) || outMs <= inMs) return null
  return (outMs - inMs) / 3_600_000
}

/** Number of sleeping nights (night-sleep shifts) among `shifts`; sleep-in is shown as nights, not hours. */
export function countSleepNights(shifts: Shift[]): number {
  return shifts.filter((s) => s.shift_type === 'night-sleep').length
}

export function getShiftHourBreakdown(
  shift: {
    shift_type?: string
    duration_hours?: number
    start_time?: string
    end_time?: string
  },
  overrideDurationHours?: number
): {
  duration_hours: number
  sleep_in_hours: number
  paid_work_hours: number
} {
  const hasOverride =
    typeof overrideDurationHours === 'number' && !Number.isNaN(overrideDurationHours)
  const duration = hasOverride
    ? (overrideDurationHours as number)
    : typeof shift.duration_hours === 'number' && !Number.isNaN(shift.duration_hours)
      ? shift.duration_hours
      : durationFromTimes(shift.start_time ?? '00:00', shift.end_time ?? '00:00')

  if (shift.shift_type === 'night-sleep') {
    // Sleep-in is the last getSleepInHours() of the scheduled window; anything before it is
    // regular paid work. Computed from wall-clock times; a numeric duration override is not
    // applied here (the clamped-actual path uses workedHourBreakdown).
    const range = wallClockRange(shift.start_time, shift.end_time)
    if (!range) {
      // No usable times: up to getSleepInHours() of the duration is sleep, the rest regular.
      const sleep = Math.min(duration, sleepInHours)
      return { duration_hours: duration, sleep_in_hours: sleep, paid_work_hours: Math.max(0, duration - sleep) }
    }
    const scheduledDuration = (range.endMin - range.startMin) / 60
    const sleep_in_hours = nightSleepHours(range.startMin, range.endMin, range.startMin, range.endMin)
    return {
      duration_hours: scheduledDuration,
      sleep_in_hours,
      paid_work_hours: Math.max(0, scheduledDuration - sleep_in_hours),
    }
  }

  // night-wake, one_to_one, night (legacy), and everything else: 100% of duration is paid work
  return {
    duration_hours: duration,
    sleep_in_hours: 0,
    paid_work_hours: duration,
  }
}

/**
 * Break rules apply to paid working hours (after sleep-in is removed).
 *
 * When `assignment` is supplied and the shift has a complete clock-in/clock-out
 * pair, paid work is based on the actual clamped clock time (so late arrival and
 * early leaving reduce pay, matching the payroll backend). Pass `nowMs` to also
 * value an in-progress shift (clocked in, not yet out) by its elapsed clamped
 * time. Otherwise — no assignment, or a shift not yet clocked — it falls back to
 * the rostered estimate. `rosteredHours`/`sleepInHours` always reflect the
 * rostered plan.
 *
 * For a `one_to_one` shift, pass `userShifts` (the staff member's other shifts) so only
 * the time outside their background shifts is paid, as payroll does. A 1-to-1 fully
 * inside a background shift is `coveredByBackground` and pays 0.
 */
export function computeShiftPaidWithBreaks(
  shift: Shift,
  assignment?: { clock_in_time?: string | null; clock_out_time?: string | null },
  nowMs?: number,
  userShifts?: Shift[]
): {
  rosteredHours: number
  sleepInHours: number
  paidWorkBeforeBreak: number
  breakDeduction: number
  deductionReason: string
  paidHours: number
  coveredByBackground: boolean
} {
  const rosteredBr = getShiftHourBreakdown(shift)
  const wb = assignment ? workedHourBreakdown(shift, assignment, nowMs) : null
  const br = wb ?? rosteredBr
  let work = br.paid_work_hours
  let coveredByBackground = false

  if (shift.shift_type === 'one_to_one' && userShifts) {
    coveredByBackground = isCoveredByBackground(shift, userShifts)
    const window =
      (assignment && effectiveWorkedWindow(shift, assignment, nowMs)) || scheduledInstants(shift)
    work = coveredByBackground ? 0 : subtractIntervalsHours(window, backgroundCuts(shift, userShifts))
  }
  const { breakDeduction, deductionReason } = breakDeductionFor(work)

  return {
    rosteredHours: rosteredBr.duration_hours,
    sleepInHours: rosteredBr.sleep_in_hours,
    paidWorkBeforeBreak: work,
    breakDeduction,
    deductionReason: coveredByBackground ? 'Covered by background shift — no extra hours' : deductionReason,
    paidHours: Math.max(0, work - breakDeduction),
    coveredByBackground,
  }
}
