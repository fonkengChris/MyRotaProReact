import type { Shift } from '@/types'

/**
 * Hours treated as sleep-in on a sleeping-night shift (matches server `utils/shiftHours.js`).
 * `night-wake`, `special`, and legacy `night` are not split — full rostered time counts as paid work (before breaks).
 */
export const NIGHT_SLEEP_IN_HOURS = 8

function durationFromTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startTotal = sh * 60 + sm
  let endTotal = eh * 60 + em
  if (endTotal < startTotal) endTotal += 24 * 60
  return (endTotal - startTotal) / 60
}

export function getShiftHourBreakdown(shift: {
  shift_type?: string
  duration_hours?: number
  start_time?: string
  end_time?: string
}): {
  duration_hours: number
  sleep_in_hours: number
  paid_work_hours: number
} {
  const duration =
    typeof shift.duration_hours === 'number' && !Number.isNaN(shift.duration_hours)
      ? shift.duration_hours
      : durationFromTimes(shift.start_time ?? '00:00', shift.end_time ?? '00:00')

  if (shift.shift_type === 'night-sleep') {
    const sleep_in_hours = Math.min(NIGHT_SLEEP_IN_HOURS, duration)
    const paid_work_hours = Math.max(0, duration - NIGHT_SLEEP_IN_HOURS)
    return { duration_hours: duration, sleep_in_hours, paid_work_hours }
  }

  // night-wake, special, night (legacy), and everything else: 100% of duration is paid work
  return {
    duration_hours: duration,
    sleep_in_hours: 0,
    paid_work_hours: duration,
  }
}

/** Break rules apply to paid working hours (after sleep-in is removed). */
export function computeShiftPaidWithBreaks(shift: Shift): {
  rosteredHours: number
  sleepInHours: number
  paidWorkBeforeBreak: number
  breakDeduction: number
  deductionReason: string
  paidHours: number
} {
  const br = getShiftHourBreakdown(shift)
  const work = br.paid_work_hours
  let breakDeduction = 0
  let deductionReason = ''

  if (work >= 12) {
    breakDeduction = 1
    deductionReason = '12+ hour paid work — break'
  } else if (work >= 8 && work < 12) {
    breakDeduction = 0.5
    deductionReason = '8–12 hour paid work — break'
  } else {
    deductionReason = 'No break deduction (< 8 hours paid work)'
  }

  return {
    rosteredHours: br.duration_hours,
    sleepInHours: br.sleep_in_hours,
    paidWorkBeforeBreak: work,
    breakDeduction,
    deductionReason,
    paidHours: Math.max(0, work - breakDeduction),
  }
}
