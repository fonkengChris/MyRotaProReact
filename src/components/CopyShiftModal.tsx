import React, { useEffect, useMemo, useState } from 'react'
import { format, addDays, addWeeks } from 'date-fns'
import Button from '@/components/ui/Button'
import { Shift, extractServiceName, isOneToOneShift, shiftServiceUserName } from '@/types'

interface CopyShiftModalProps {
  shift: Shift | null
  weekStart: Date
  onClose: () => void
  /** Creates copies of the shift on the given yyyy-MM-dd dates. */
  onCopy: (shift: Shift, dates: string[]) => Promise<void>
}

const MAX_EXTRA_WEEKS = 12

const CopyShiftModal: React.FC<CopyShiftModalProps> = ({ shift, weekStart, onClose, onCopy }) => {
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [extraWeeks, setExtraWeeks] = useState(0)
  const [isCopying, setIsCopying] = useState(false)

  useEffect(() => {
    setSelectedDays([])
    setExtraWeeks(0)
  }, [shift?.id])

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  // Every target date: the ticked weekdays in this week, then the same weekdays in each following week.
  // The source shift's own date is never a target.
  const targetDates = useMemo(() => {
    if (!shift) return []
    const dates: string[] = []
    for (let w = 0; w <= extraWeeks; w++) {
      for (const i of [...selectedDays].sort()) {
        const date = format(addWeeks(weekDays[i], w), 'yyyy-MM-dd')
        if (date !== shift.date) dates.push(date)
      }
    }
    return dates
  }, [shift, selectedDays, extraWeeks, weekDays])

  if (!shift) return null

  const toggleDay = (i: number) =>
    setSelectedDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]))

  const allDays = weekDays.map((_, i) => i)
  const allSelected = allDays.every((i) => selectedDays.includes(i))

  const handleCopy = async () => {
    setIsCopying(true)
    try {
      await onCopy(shift, targetDates)
      onClose()
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4 border border-neutral-200 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-neutral-300 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-950 dark:text-neutral-100">Copy shift</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {format(new Date(`${shift.date}T00:00:00`), 'EEE d MMM')}, {shift.start_time.substring(0, 5)}–{shift.end_time.substring(0, 5)}
            {' · '}
            {isOneToOneShift(shift)
              ? `1-to-1 for ${shiftServiceUserName(shift) || 'service user'}`
              : extractServiceName(shift.service_id) || 'Unknown Service'}
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Copy to</span>
              <button
                type="button"
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                onClick={() => setSelectedDays(allSelected ? [] : allDays)}
              >
                {allSelected ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const isSource = format(day, 'yyyy-MM-dd') === shift.date
                const checked = selectedDays.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`rounded-md border px-1 py-2 text-center text-xs transition-colors ${
                      isSource ? 'border-dashed' : ''
                    } ${
                      checked
                        ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200'
                        : 'border-neutral-300 text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300'
                    }`}
                    title={isSource ? 'Original shift — ticking this copies it to the same day in following weeks' : undefined}
                  >
                    <div className="font-medium">{format(day, 'EEE')}</div>
                    <div>{format(day, 'd')}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
              Repeat for following weeks
            </label>
            <select
              value={extraWeeks}
              onChange={(e) => setExtraWeeks(Number(e.target.value))}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100"
            >
              <option value={0}>This week only</option>
              {Array.from({ length: MAX_EXTRA_WEEKS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  This week + next {n} week{n !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Copies keep the service, times, type, staff needed and notes. Staff aren't copied, and days that already have
            an identical shift are skipped.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-neutral-300 dark:border-neutral-700 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isCopying}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCopy} disabled={isCopying || targetDates.length === 0}>
            {isCopying ? 'Copying...' : `Copy to ${targetDates.length} day${targetDates.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CopyShiftModal
