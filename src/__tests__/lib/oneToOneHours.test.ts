import { describe, it, expect } from 'vitest'
import type { Shift } from '@/types'
import {
  computeShiftPaidWithBreaks,
  extraOneToOneHours,
  isCoveredByBackground,
} from '@/lib/shiftHours'

const shift = (id: string, start_time: string, end_time: string, shift_type = 'day', date = '2026-01-13') =>
  ({ id, date, start_time, end_time, shift_type, assigned_staff: [] }) as unknown as Shift

describe('1-to-1 hours', () => {
  const background = shift('bg', '08:00', '14:00')

  it('is covered and adds nothing inside a background shift', () => {
    const oneToOne = shift('a', '09:00', '11:00', 'one_to_one')
    expect(isCoveredByBackground(oneToOne, [background])).toBe(true)
    expect(extraOneToOneHours(oneToOne, [background])).toBe(0)
    const c = computeShiftPaidWithBreaks(oneToOne, undefined, undefined, [background, oneToOne])
    expect(c.paidHours).toBe(0)
    expect(c.coveredByBackground).toBe(true)
  })

  it('pays only the time outside the background shift', () => {
    const oneToOne = shift('b', '12:00', '16:00', 'one_to_one')
    expect(isCoveredByBackground(oneToOne, [background])).toBe(false)
    expect(computeShiftPaidWithBreaks(oneToOne, undefined, undefined, [background, oneToOne]).paidHours).toBe(2)
  })

  it('pays a 1-to-1 in full when the staff member is not otherwise rostered', () => {
    const oneToOne = shift('c', '18:00', '21:00', 'one_to_one')
    expect(computeShiftPaidWithBreaks(oneToOne, undefined, undefined, [background, oneToOne]).paidHours).toBe(3)
  })

  it('treats the sleep-in part of a sleeping night as unpaid, so a 1-to-1 then is extra', () => {
    const sleep = shift('s', '22:00', '07:00', 'night-sleep', '2026-01-12')
    const oneToOne = shift('d', '02:00', '04:00', 'one_to_one')
    expect(isCoveredByBackground(oneToOne, [sleep])).toBe(false)
    expect(extraOneToOneHours(oneToOne, [sleep])).toBe(2)
  })
})
