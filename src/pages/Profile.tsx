import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageHeader from '@/components/common/PageHeader'
import { homesApi, organizationSettingsApi, shiftsApi } from '@/lib/api'
import { extractHomeId, Home, OrgContact, Shift } from '@/types'
import { format, addDays } from 'date-fns'
import {
  UserCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  LifebuoyIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

type TipSection = 'core' | 'day' | 'night' | 'escalation'

// Build a Date from a shift's date (YYYY-MM-DD) and time (HH:MM).
const shiftDate = (date: string, time: string) => new Date(`${date}T${time}`)

// Classify a shift as day or night so we can highlight the relevant checklist.
const classifyShift = (shift: Shift): 'day' | 'night' => {
  const type = (shift.shift_type || '').toLowerCase()
  if (type.includes('night')) return 'night'
  if (['morning', 'day', 'afternoon', 'long_day'].includes(type)) return 'day'
  const hour = parseInt((shift.start_time || '').slice(0, 2), 10)
  if (!Number.isNaN(hour)) return hour >= 20 || hour < 6 ? 'night' : 'day'
  return 'day'
}

const roleLabel = (role?: string) => (role ? role.replace(/_/g, ' ') : '')

const Profile: React.FC = () => {
  const { user } = useAuth()

  // The homes this user works at (getAll returns only the user's homes for
  // non-admins, so we filter by their assigned home ids to be safe for all roles).
  const userHomeIds = useMemo(
    () => (user?.homes || []).map(h => extractHomeId(h.home_id as any)).filter(Boolean) as string[],
    [user]
  )

  const { data: allHomes = [], isLoading: homesLoading } = useQuery({
    queryKey: ['profileHomes', user?.id],
    queryFn: () => homesApi.getAll(),
    enabled: !!user?.id,
    select: (data) => (Array.isArray(data) ? data : []),
  })
  const myHomes: Home[] = allHomes.filter(h => userHomeIds.includes(h.id))

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['organizationSettings'],
    queryFn: () => organizationSettingsApi.get(),
  })

  // Fetch the next two weeks of shifts to work out whether the user's current or
  // next shift is a day or a night shift.
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: shifts = [] } = useQuery({
    queryKey: ['profileShifts', user?.id],
    queryFn: () => shiftsApi.getAll({ start_date: today, end_date: format(addDays(new Date(), 14), 'yyyy-MM-dd') }),
    enabled: !!user?.id,
    select: (data) => (Array.isArray(data) ? data : []),
  })

  const nextShift = useMemo(() => {
    const now = new Date()
    const mine = shifts
      .filter(s => s.assigned_staff?.some(a => a.user_id === user?.id))
      .filter(s => shiftDate(s.date, s.end_time) >= now)
      .sort((a, b) => shiftDate(a.date, a.start_time).getTime() - shiftDate(b.date, b.start_time).getTime())
    return mine[0]
  }, [shifts, user])

  const activeSection: 'day' | 'night' = nextShift ? classifyShift(nextShift) : 'day'

  // Collapsible state — core + escalation open by default, plus the relevant
  // day/night section for the user's next shift.
  const [openSections, setOpenSections] = useState<Record<TipSection, boolean>>(() => ({
    core: true,
    day: true,
    night: true,
    escalation: true,
  }))
  const toggleSection = (s: TipSection) =>
    setOpenSections(prev => ({ ...prev, [s]: !prev[s] }))

  if (homesLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const companyContacts = settings?.company_contacts || []
  const emergencyContacts = settings?.emergency_contacts || []
  const tips = settings?.shift_tips

  const tipSections: Array<{ key: TipSection; title: string; icon: React.ComponentType<any>; items: string[] }> = [
    { key: 'core', title: 'Core checks (every shift)', icon: ClipboardDocumentCheckIcon, items: tips?.core || [] },
    { key: 'day', title: 'Day shift checks', icon: SunIcon, items: tips?.day || [] },
    { key: 'night', title: 'Night shift checks', icon: MoonIcon, items: tips?.night || [] },
    { key: 'escalation', title: 'Escalation reminders', icon: ExclamationTriangleIcon, items: tips?.escalation || [] },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`}
        subtitle="Your details, your houses, key contacts and useful shift tips — all in one place."
      />

      {/* My details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            My details
          </CardTitle>
          <CardDescription>Your personal and employment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 flex-shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-sm">
              <span className="text-xl font-semibold text-white">{user?.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{user?.name}</h3>
                <Badge variant="primary" className="capitalize">{roleLabel(user?.role)}</Badge>
                <Badge variant="neutral" className="capitalize">{user?.type}</Badge>
              </div>

              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Email</dt>
                  <dd>
                    <a href={`mailto:${user?.email}`} className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:underline break-all">
                      <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                      {user?.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Phone</dt>
                  <dd>
                    <a href={`tel:${user?.phone}`} className="inline-flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:underline">
                      <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                      {user?.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Contracted hours</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">
                    {user?.min_hours_per_week}{user?.max_hours_per_week ? `–${user.max_hours_per_week}` : ''} hrs/week
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-neutral-400">Annual leave</dt>
                  <dd className="text-neutral-900 dark:text-neutral-100">
                    {user?.annual_leave_entitlement_days ?? '—'} days
                  </dd>
                </div>
              </dl>

              {user?.skills && user.skills.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.skills.map(skill => (
                      <Badge key={skill} variant="secondary" className="capitalize">{skill.replace(/_/g, ' ')}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My houses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            My house{myHomes.length === 1 ? '' : 's'}
          </CardTitle>
          <CardDescription>The house(s) you are assigned to work at</CardDescription>
        </CardHeader>
        <CardContent>
          {myHomes.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              You are not assigned to any house yet. Please contact your manager.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myHomes.map(home => {
                const isDefault = (user?.homes || []).some(
                  h => extractHomeId(h.home_id as any) === home.id && h.is_default
                )
                return (
                  <div key={home.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{home.name}</h4>
                      {isDefault && <Badge variant="success">Default</Badge>}
                    </div>
                    <div className="mt-2 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                      <p className="flex items-start gap-1.5">
                        <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          {home.location?.address}, {home.location?.city}, {home.location?.postcode}
                        </span>
                      </p>
                      {home.contact_info?.phone && (
                        <p className="flex items-center gap-1.5">
                          <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                          <a href={`tel:${home.contact_info.phone}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                            {home.contact_info.phone}
                          </a>
                        </p>
                      )}
                      {home.contact_info?.email && (
                        <p className="flex items-center gap-1.5">
                          <EnvelopeIcon className="h-4 w-4 flex-shrink-0" />
                          <a href={`mailto:${home.contact_info.email}`} className="text-primary-600 dark:text-primary-400 hover:underline break-all">
                            {home.contact_info.email}
                          </a>
                        </p>
                      )}
                      {home.operating_hours && (
                        <p className="flex items-center gap-1.5">
                          <ClockIcon className="h-4 w-4 flex-shrink-0" />
                          {home.operating_hours.start} – {home.operating_hours.end}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help & emergency contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifebuoyIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Company & help numbers
            </CardTitle>
            <CardDescription>Who to call when you need support</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactList contacts={companyContacts} emptyText="No company numbers have been added yet." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400" />
              Emergency numbers
            </CardTitle>
            <CardDescription>Use in an emergency or urgent situation</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactList contacts={emergencyContacts} emptyText="No emergency numbers have been added yet." danger />
          </CardContent>
        </Card>
      </div>

      {/* Useful tips on shift */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Useful tips on shift
          </CardTitle>
          <CardDescription>
            Shift-start checklist.{' '}
            {nextShift
              ? `Your next shift looks like a ${activeSection} shift — that section is highlighted.`
              : 'Review the core checks plus the section for your shift type.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tipSections.map(section => {
              const isOpen = openSections[section.key]
              const highlighted = section.key === activeSection
              const Icon = section.icon
              return (
                <div
                  key={section.key}
                  className={`rounded-xl border ${
                    highlighted
                      ? 'border-primary-400 dark:border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                      <Icon className={`h-5 w-5 ${highlighted ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                      {section.title}
                      {highlighted && <Badge variant="primary">Your shift</Badge>}
                    </span>
                    <ChevronDownIcon className={`h-5 w-5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <ul className="px-4 pb-4 space-y-2">
                      {section.items.length === 0 ? (
                        <li className="text-sm text-neutral-500 dark:text-neutral-400">No items.</li>
                      ) : (
                        section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
                            {item}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const ContactList: React.FC<{ contacts: OrgContact[]; emptyText: string; danger?: boolean }> = ({
  contacts,
  emptyText,
  danger,
}) => {
  if (!contacts || contacts.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyText}</p>
  }
  return (
    <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
      {contacts.map((c, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{c.label}</p>
            {c.notes && <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.notes}</p>}
          </div>
          {c.number ? (
            <a
              href={`tel:${c.number}`}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${
                danger
                  ? 'bg-danger-50 text-danger-700 hover:bg-danger-100 dark:bg-danger-900/20 dark:text-danger-300'
                  : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-300'
              }`}
            >
              <PhoneIcon className="h-4 w-4" />
              {c.number}
            </a>
          ) : (
            <span className="text-xs text-neutral-400">Not set</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default Profile
