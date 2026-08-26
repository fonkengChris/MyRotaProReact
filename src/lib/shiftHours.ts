import type { Shift } from '@/types'

/**
 * Sleeping-night sleep period is the fixed clock window 23:00–06:00 (7h), paid a flat
 * allowance in payroll. Hours outside it are paid as regular hourly work. Minutes from
 * midnight on the shift's start day; 06:00 is next-day so the band is [1380, 1800].
 * Mirrors the server `utils/shiftHours.js`. `night-wake`, `special`, and legacy `night`
 * are not split — full rostered time counts as paid work (before breaks).
 */
export const NIGHT_SLEEP_START_MIN = 23 * 60 // 1380
export const NIGHT_SLEEP_END_MIN = 6 * 60 // 360 (next day)

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
 * Hours of [startMin, endMin] inside the nightly 23:00–06:00 sleep window. Checks the
 * current-night band [1380, 1800] and the previous-night band [-60, 360], so it is correct
 * whether a shift starts in the evening or after midnight. Mirrors the server.
 */
export function sleepWindowOverlapHours(startMin: number, endMin: number): number {
  const bands: Array<[number, number]> = [
    [NIGHT_SLEEP_START_MIN, NIGHT_SLEEP_END_MIN + 24 * 60],
    [NIGHT_SLEEP_START_MIN - 24 * 60, NIGHT_SLEEP_END_MIN],
  ]
  let overlap = 0
  for (const [bStart, bEnd] of bands) {
    overlap += Math.max(0, Math.min(endMin, bEnd) - Math.max(startMin, bStart))
  }
  return overlap / 60
}

/**
 * Clocking in this many minutes (or more) after scheduled start deducts the late
 * time from worked/paid hours. Lateness below this is forgiven. Mirrors the server
 * `LATE_ARRIVAL_MINUTES` in `utils/shiftTime.js`.
 */
export const LATE_ARRIVAL_MINUTES = 30

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
 * - Late clock-out never counts — worked time ends no later than scheduled end
 *   (extra past-the-end time is only paid via a separately-approved overtime request).
 * - Late arrival below LATE_ARRIVAL_MINUTES is forgiven; at/beyond it the full late
 *   time is deducted.
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

  const effectiveEnd = Math.min(outMs, sched.end)
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
 * so the 23:00–06:00 sleep overlap reflects the hours actually worked. Mirrors the server
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
  const startMin = baseStartMin + (w.start - schedStartMs) / 60000
  const endMin = baseStartMin + (w.end - schedStartMs) / 60000
  const sleep_in_hours = sleepWindowOverlapHours(startMin, endMin)

  return {
    duration_hours: duration,
    sleep_in_hours,
    paid_work_hours: Math.max(0, duration - sleep_in_hours),
  }
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
    // Sleep-in is the overlap of the scheduled window with the fixed 23:00–06:00 band
    // (not the first N hours). Computed from wall-clock times; a numeric duration
    // override is not applied here (the clamped-actual path uses workedHourBreakdown).
    const range = wallClockRange(shift.start_time, shift.end_time)
    if (!range) {
      const sleep_in_hours = Math.min(7, duration)
      return { duration_hours: duration, sleep_in_hours, paid_work_hours: Math.max(0, duration - sleep_in_hours) }
    }
    const scheduledDuration = (range.endMin - range.startMin) / 60
    const sleep_in_hours = sleepWindowOverlapHours(range.startMin, range.endMin)
    return {
      duration_hours: scheduledDuration,
      sleep_in_hours,
      paid_work_hours: Math.max(0, scheduledDuration - sleep_in_hours),
    }
  }

  // night-wake, special, night (legacy), and everything else: 100% of duration is paid work
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
 */
export function computeShiftPaidWithBreaks(
  shift: Shift,
  assignment?: { clock_in_time?: string | null; clock_out_time?: string | null },
  nowMs?: number
): {
  rosteredHours: number
  sleepInHours: number
  paidWorkBeforeBreak: number
  breakDeduction: number
  deductionReason: string
  paidHours: number
} {
  const rosteredBr = getShiftHourBreakdown(shift)
  const wb = assignment ? workedHourBreakdown(shift, assignment, nowMs) : null
  const br = wb ?? rosteredBr
  const work = br.paid_work_hours
  const { breakDeduction, deductionReason } = breakDeductionFor(work)

  return {
    rosteredHours: rosteredBr.duration_hours,
    sleepInHours: rosteredBr.sleep_in_hours,
    paidWorkBeforeBreak: work,
    breakDeduction,
    deductionReason,
    paidHours: Math.max(0, work - breakDeduction),
  }
}
