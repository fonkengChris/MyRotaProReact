import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { XMarkIcon, TrashIcon, UserMinusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { servicesApi, shiftsApi, usersApi } from '@/lib/api'
import { getShiftHourBreakdown, isCoveredByBackground } from '@/lib/shiftHours'
import { ServiceUser, Shift, User, extractHomeId } from '@/types'

interface OneToOneShiftsModalProps {
  isOpen: boolean
  onClose: () => void
  serviceUser: ServiceUser | null
}

const fieldClass =
  'w-full rounded-md border border-neutral-400 dark:border-neutral-600 px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

const labelClass = 'block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1'

const UPCOMING_DAYS = 28

/** Error message from an API failure, preferring the friendliest field the backend sends. */
function apiMessage(error: any, fallback: string): string {
  const data = error?.response?.data
  return data?.userFriendlyMessage || data?.message || data?.details?.join?.(' ') || data?.error || fallback
}

/**
 * Admin tool to schedule and staff 1-to-1 shifts for one service user.
 *
 * A 1-to-1 is assigned to a single staff member. If that person is on a background shift
 * at the same time it is "covered": no extra paid hours and no separate clock-in. Only
 * time outside their background shifts is paid.
 */
const OneToOneShiftsModal: React.FC<OneToOneShiftsModalProps> = ({ isOpen, onClose, serviceUser }) => {
  const queryClient = useQueryClient()
  const homeId = serviceUser ? extractHomeId(serviceUser.home_id as any) || '' : ''

  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('12:00')
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  // Which upcoming shift has its "assign staff" picker open.
  const [assigningShiftId, setAssigningShiftId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setDate(today)
    setStartTime('09:00')
    setEndTime('12:00')
    setStaffId('')
    setNotes('')
    setAssigningShiftId(null)
  }, [isOpen, serviceUser?.id, today])

  const { data: services = [] } = useQuery({
    queryKey: ['services', homeId],
    queryFn: () => servicesApi.getAll(homeId),
    enabled: isOpen && !!homeId,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  useEffect(() => {
    if (services.length && !services.some((s) => s.id === serviceId)) setServiceId(services[0].id)
  }, [services, serviceId])

  const { data: staff = [] } = useQuery({
    queryKey: ['users', 'home', homeId, 'active'],
    queryFn: () => usersApi.getAll({ home_id: homeId, is_active: true }),
    enabled: isOpen && !!homeId,
    select: (data) => (Array.isArray(data) ? data.filter((u) => u.role !== 'admin') : []),
  })

  // This service user's upcoming 1-to-1s.
  const upcomingEnd = format(addDays(new Date(), UPCOMING_DAYS), 'yyyy-MM-dd')
  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['shifts', 'one_to_one', 'service_user', serviceUser?.id, today, upcomingEnd],
    queryFn: () =>
      shiftsApi.getAll({ service_user_id: serviceUser!.id, start_date: today, end_date: upcomingEnd }),
    enabled: isOpen && !!serviceUser,
    select: (data) =>
      (Array.isArray(data) ? data : [])
        .filter((s) => s.is_active !== false)
        .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`)),
  })

  // The home's shifts around the chosen/listed dates, to show who would be covered.
  const homeShiftsEnd = upcoming.length && upcoming[upcoming.length - 1].date > date
    ? upcoming[upcoming.length - 1].date
    : date
  const homeShiftsStart = format(addDays(new Date(`${date < today ? date : today}T00:00:00`), -1), 'yyyy-MM-dd')
  const { data: homeShifts = [] } = useQuery({
    queryKey: ['shifts', 'home', homeId, homeShiftsStart, homeShiftsEnd],
    queryFn: () =>
      shiftsApi.getAll({
        home_id: homeId,
        start_date: homeShiftsStart,
        end_date: format(addDays(new Date(`${homeShiftsEnd}T00:00:00`), 1), 'yyyy-MM-dd'),
      }),
    enabled: isOpen && !!homeId,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const shiftsOf = (userId: string) =>
    homeShifts.filter((s) => s.assigned_staff?.some((a) => a.user_id === userId))

  const draft = useMemo(
    () => ({ id: 'draft', date, start_time: startTime, end_time: endTime, shift_type: 'one_to_one' }),
    [date, startTime, endTime]
  )
  const draftHours = getShiftHourBreakdown(draft).duration_hours

  const staffName = (id: string) => staff.find((s) => s.id === id)?.name || 'Unknown staff'

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['shifts'] })
  }

  /** Assign staff, offering an admin override for rule (not overlap) conflicts. */
  const assign = async (shiftId: string, userId: string): Promise<boolean> => {
    try {
      const res = await shiftsApi.assignStaff(shiftId, userId)
      toast.success(
        res.covered_by_background
          ? `${staffName(userId)} assigned — covered by their background shift (no extra hours)`
          : `${staffName(userId)} assigned`
      )
      return true
    } catch (error: any) {
      const data = error?.response?.data
      if (error?.response?.status === 409 && data?.overridable) {
        const reasons = (data.overridableConflicts || []).map((c: any) => `• ${c.message}`).join('\n')
        if (window.confirm(`${apiMessage(error, 'Scheduling rules conflict')}\n\n${reasons}\n\nAssign anyway?`)) {
          try {
            await shiftsApi.assignStaff(shiftId, userId, undefined, true)
            toast.success(`${staffName(userId)} assigned (rules overridden)`)
            return true
          } catch (err) {
            toast.error(apiMessage(err, 'Failed to assign staff'))
          }
        }
        return false
      }
      toast.error(apiMessage(error, 'Failed to assign staff'))
      return false
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceUser) return
    if (!serviceId) {
      toast.error('This home has no service to attach the shift to')
      return
    }
    if (startTime === endTime) {
      toast.error('Start and end time cannot be the same')
      return
    }
    setIsSaving(true)
    try {
      const created = await shiftsApi.create({
        home_id: homeId,
        service_id: serviceId,
        service_user_id: serviceUser.id,
        date,
        start_time: startTime,
        end_time: endTime,
        shift_type: 'one_to_one',
        required_staff_count: 1,
        notes,
      } as any)
      const createdId = (created as any).id || (created as any)._id
      if (staffId && createdId) {
        const ok = await assign(createdId, staffId)
        if (!ok) toast('1-to-1 created without staff — assign someone from the list below', { icon: 'ℹ️' })
      } else {
        toast.success('1-to-1 created')
      }
      setStaffId('')
      setNotes('')
      refresh()
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to create 1-to-1'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAssignExisting = async (shift: Shift, userId: string) => {
    if (await assign(shift.id, userId)) {
      setAssigningShiftId(null)
      refresh()
    }
  }

  const handleUnassign = async (shift: Shift, userId: string) => {
    try {
      await shiftsApi.removeStaff(shift.id, userId)
      toast.success('Staff removed')
      refresh()
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to remove staff'))
    }
  }

  const handleDelete = async (shift: Shift) => {
    if (!window.confirm(`Delete the 1-to-1 on ${format(new Date(`${shift.date}T00:00:00`), 'EEE d MMM')} ${shift.start_time}–${shift.end_time}?`)) return
    try {
      await shiftsApi.delete(shift.id)
      toast.success('1-to-1 deleted')
      refresh()
    } catch (error) {
      toast.error(apiMessage(error, 'Failed to delete 1-to-1'))
    }
  }

  const staffOption = (member: User, shift: { id: string; date: string; start_time: string; end_time: string; shift_type: string }) => {
    const covered = isCoveredByBackground(shift, shiftsOf(member.id))
    return (
      <option key={member.id} value={member.id}>
        {member.name}
        {covered ? ' — on shift, no extra hours' : ''}
      </option>
    )
  }

  if (!isOpen || !serviceUser) return null

  const homeName = typeof serviceUser.home_id === 'object' ? serviceUser.home_id?.name : ''

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-neutral-1000 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl border border-neutral-200 dark:border-neutral-700 transition-all sm:my-8 w-full sm:max-w-2xl">
          <div className="px-4 pb-4 pt-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-100">
                  1-to-1 shifts — {serviceUser.name}
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {homeName}
                  {serviceUser.one_to_one_hours_per_week != null &&
                    ` · ${serviceUser.one_to_one_hours_per_week}h allocated per week`}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md text-neutral-500 hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Schedule a new 1-to-1 */}
            <form
              onSubmit={handleCreate}
              className="space-y-4 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4"
            >
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Schedule a 1-to-1</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="oto-date" className={labelClass}>Date</label>
                  <input id="oto-date" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className={fieldClass} required />
                </div>
                <div>
                  <label htmlFor="oto-start" className={labelClass}>Start</label>
                  <input id="oto-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={fieldClass} required />
                </div>
                <div>
                  <label htmlFor="oto-end" className={labelClass}>End</label>
                  <input id="oto-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={fieldClass} required />
                </div>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {draftHours.toFixed(1)}h{endTime < startTime ? ' (ends the next day)' : ''}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="oto-staff" className={labelClass}>Staff member</label>
                  <select id="oto-staff" value={staffId} onChange={(e) => setStaffId(e.target.value)} className={fieldClass}>
                    <option value="">Assign later</option>
                    {staff.map((member) => staffOption(member, draft))}
                  </select>
                </div>
                {services.length > 1 && (
                  <div>
                    <label htmlFor="oto-service" className={labelClass}>Service</label>
                    <select id="oto-service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={fieldClass}>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {staffId && isCoveredByBackground(draft, shiftsOf(staffId)) && (
                <p className="text-xs text-neutral-700 dark:text-neutral-300">
                  {staffName(staffId)} is on a background shift then — this adds no extra paid hours and needs no separate clock-in.
                </p>
              )}

              <div>
                <label htmlFor="oto-notes" className={labelClass}>Notes (optional)</label>
                <input id="oto-notes" type="text" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} placeholder="e.g. community outing, appointment" />
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={isSaving} disabled={isSaving || !serviceId}>
                  {staffId ? 'Create & assign' : 'Create 1-to-1'}
                </Button>
              </div>
            </form>

            {/* Upcoming 1-to-1s */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Upcoming (next {UPCOMING_DAYS} days)
              </h4>
              {upcomingLoading ? (
                <div className="flex justify-center py-6"><LoadingSpinner /></div>
              ) : upcoming.length === 0 ? (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No 1-to-1s scheduled.</p>
              ) : (
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  {upcoming.map((shift) => {
                    const assignment = shift.assigned_staff?.[0]
                    const covered = assignment ? isCoveredByBackground(shift, shiftsOf(assignment.user_id)) : false
                    return (
                      <li key={shift.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {format(new Date(`${shift.date}T00:00:00`), 'EEE d MMM')}{' '}
                            <span className="font-mono tabular-nums">{shift.start_time}–{shift.end_time}</span>
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {assignment ? staffName(assignment.user_id) : 'Unassigned'}
                            {covered && ' · covered by background shift'}
                            {shift.notes ? ` · ${shift.notes}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!assignment && (
                            assigningShiftId === shift.id ? (
                              <select
                                autoFocus
                                aria-label="Assign staff"
                                className={`${fieldClass} py-1 text-sm`}
                                defaultValue=""
                                onChange={(e) => e.target.value && handleAssignExisting(shift, e.target.value)}
                                onBlur={() => setAssigningShiftId(null)}
                              >
                                <option value="">Choose staff…</option>
                                {staff.map((member) => staffOption(member, shift))}
                              </select>
                            ) : (
                              <>
                                <Badge variant="warning" className="text-xs">Unassigned</Badge>
                                <Button size="sm" variant="outline" onClick={() => setAssigningShiftId(shift.id)}>
                                  Assign
                                </Button>
                              </>
                            )
                          )}
                          {assignment && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnassign(shift, assignment.user_id)}
                              aria-label="Remove staff"
                              title="Remove staff"
                            >
                              <UserMinusIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="danger" onClick={() => handleDelete(shift)} aria-label="Delete 1-to-1" title="Delete 1-to-1">
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OneToOneShiftsModal
