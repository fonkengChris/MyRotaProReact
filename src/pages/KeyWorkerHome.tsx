import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  SunIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ClipboardDocumentCheckIcon,
  HeartIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PhoneIcon,
  UserGroupIcon,
  LifebuoyIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageHeader from '@/components/common/PageHeader'
import ContactList from '@/components/common/ContactList'
import ChecklistSection from '@/components/common/ChecklistSection'
import { organizationSettingsApi, serviceUsersApi } from '@/lib/api'

type TaskPeriod = 'daily' | 'weekly' | 'monthly'

const QUICK_LINKS = [
  { label: 'Rota', href: '/rota', icon: TableCellsIcon },
  { label: 'Staff', href: '/staff', icon: UsersIcon },
  { label: 'My Service Users', href: '/service-users', icon: HeartIcon },
  { label: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
]

const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h/week`

// Landing page for key workers: recurring task prompts, their caseload's allocated
// 1:1 hours, the homes they support people in, and help/emergency numbers.
const KeyWorkerHome: React.FC = () => {
  const { user } = useAuth()

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['organizationSettings'],
    queryFn: () => organizationSettingsApi.get(),
  })
  const { data: caseload = [], isLoading: caseloadLoading } = useQuery({
    queryKey: ['serviceUsers', 'my-caseload'],
    queryFn: () => serviceUsersApi.getMyCaseload(),
  })

  const [openSections, setOpenSections] = useState<Record<TaskPeriod, boolean>>({
    daily: true,
    weekly: false,
    monthly: false,
  })
  const toggleSection = (period: TaskPeriod) =>
    setOpenSections(prev => ({ ...prev, [period]: !prev[period] }))

  // Each service user once, with the home they live in, for the allocation card.
  const serviceUsers = useMemo(
    () => caseload.flatMap(entry => entry.service_users.map(su => ({ ...su, homeName: entry.home.name }))),
    [caseload]
  )
  const totalHours = serviceUsers.reduce((sum, su) => sum + (su.one_to_one_hours_per_week || 0), 0)

  if (settingsLoading || caseloadLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const today = new Date()
  const tasks = settings?.key_worker_tasks
  const taskSections: Array<{ key: TaskPeriod; title: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { key: 'daily', title: 'Every day', icon: SunIcon, badge: 'Today' },
    { key: 'weekly', title: 'Every week', icon: CalendarDaysIcon, badge: today.getDay() === 1 ? 'New week' : undefined },
    { key: 'monthly', title: 'Every month', icon: CalendarIcon, badge: today.getDate() <= 7 ? 'New month' : undefined },
  ]

  const subtitle = serviceUsers.length === 0
    ? 'Your key-worker tasks, the people you support and key contacts, all in one place.'
    : `You support ${serviceUsers.length} ${serviceUsers.length === 1 ? 'person' : 'people'} across ${caseload.length} ${caseload.length === 1 ? 'home' : 'homes'}.`

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.name?.split(' ')[0] || 'there'}`} subtitle={subtitle} />

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
          >
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Task prompts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Your key-worker tasks
            </CardTitle>
            <CardDescription>Reminders of the things that come round every day, week and month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taskSections.map(section => (
                <ChecklistSection
                  key={section.key}
                  title={section.title}
                  icon={section.icon}
                  items={tasks?.[section.key] || []}
                  open={openSections[section.key]}
                  onToggle={() => toggleSection(section.key)}
                  highlighted={!!section.badge}
                  badge={section.badge}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Allocated 1:1 hours */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              1:1 support allocation
            </CardTitle>
            <CardDescription>Each person's allocated 1:1 hours, to plan your sessions around.</CardDescription>
          </CardHeader>
          <CardContent>
            {serviceUsers.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                You have no service users yet. An admin can assign you as key worker for the people you support.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {serviceUsers.map(su => (
                    <li key={su.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{su.name}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{su.homeName}</p>
                      </div>
                      {su.one_to_one_hours_per_week != null ? (
                        <span className="whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {formatHours(su.one_to_one_hours_per_week)}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-xs text-neutral-400">Not set</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-700 pt-3 text-sm">
                  <span className="text-neutral-600 dark:text-neutral-300">Total</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{formatHours(totalHours)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Homes */}
      {caseload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Your homes
            </CardTitle>
            <CardDescription>Where the people you support live</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caseload.map(({ home, staff, service_users }) => (
                <li key={home.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{home.name}</h4>
                  <div className="mt-2 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                    {home.location && (
                      <p className="flex items-start gap-1.5">
                        <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{[home.location.address, home.location.city, home.location.postcode].filter(Boolean).join(', ')}</span>
                      </p>
                    )}
                    {home.contact_info?.phone && (
                      <p className="flex items-center gap-1.5">
                        <PhoneIcon className="h-4 w-4 flex-shrink-0" />
                        <a href={`tel:${home.contact_info.phone}`} className="text-primary-600 dark:text-primary-400 hover:underline">
                          {home.contact_info.phone}
                        </a>
                      </p>
                    )}
                    <p className="flex items-center gap-1.5">
                      <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
                      {staff.length} staff · {service_users.length} of your service user{service_users.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link
                    to="/service-users"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    View home and staff
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

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
            <ContactList contacts={settings?.company_contacts || []} emptyText="No company numbers have been added yet." />
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
            <ContactList contacts={settings?.emergency_contacts || []} emptyText="No emergency numbers have been added yet." danger />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default KeyWorkerHome
