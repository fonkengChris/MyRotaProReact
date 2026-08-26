import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon,
  MoonIcon,
  BoltIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import PageHeader from '@/components/common/PageHeader'
import KpiTile from '@/components/common/KpiTile'

// Small brand-tinted icon tile used on section headers (studio signature).
const TitleIcon: React.FC<{ icon: React.ComponentType<{ className?: string }> }> = ({ icon: Icon }) => (
  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
    <Icon className="h-4 w-4" />
  </span>
)
import { rotasApi, shiftsApi, usersApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { extractUserDefaultHomeId } from '@/types'
import { computeShiftPaidWithBreaks, getShiftHourBreakdown } from '@/lib/shiftHours'
import AvailableShiftsNotification from '@/components/AvailableShiftsNotification'
import HoursSummary from '@/components/HoursSummary'
import PayrollManagement from '@/components/PayrollManagement'
import OvertimeApprovals from '@/components/OvertimeApprovals'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const [activeTab, setActiveTab] = useState<'overview' | 'hours' | 'payroll'>('overview')

  // Safety check - don't render if user is not loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Get current week dates
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Get user's home ID
  const userHomeId = extractUserDefaultHomeId(user)

  // Fetch dashboard data
  const { data: currentRota = [], isLoading: rotaLoading } = useQuery({
    queryKey: ['rota', 'current', weekStart.toISOString()],
    queryFn: () => rotasApi.getAll({
      home_id: userHomeId,
      week_start_date: weekStart.toISOString(),
      week_end_date: weekEnd.toISOString()
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'key_worker', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'current', weekStart.toISOString()],
    queryFn: () => shiftsApi.getAll({
      start_date: weekStart.toISOString(),
      end_date: weekEnd.toISOString()
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'key_worker', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', userHomeId],
    queryFn: () => usersApi.getAll({
      home_id: userHomeId // Only filter by home if user has one
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'key_worker', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const isLoading = rotaLoading || shiftsLoading || staffLoading

  // Calculate statistics (data should now be guaranteed arrays from select option)
  const totalShifts = staff.length || 0
  const totalPaidHours =
    shifts.reduce((sum, shift) => sum + computeShiftPaidWithBreaks(shift).paidHours, 0) || 0
  const totalSleepInHours =
    shifts.reduce((sum, shift) => sum + getShiftHourBreakdown(shift).sleep_in_hours, 0) || 0
  const activeStaff = staff.filter(s => s.is_active).length || 0
  const pendingRequests = 0 // TODO: Implement time off requests

  // Get current week rota
  const weekRota = currentRota?.[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check if user can view hours summary (admin, key_worker, senior_staff)
  const canViewHoursSummary = ['admin', 'key_worker', 'senior_staff'].includes(user.role)
  const canManagePayroll = user.role === 'admin'

  // Build the "Needs attention" rail items from real state (no fabricated data).
  const attentionItems: Array<{ label: string; to: string; cta: string; count?: number }> = []
  if (pendingRequests > 0) {
    attentionItems.push({ label: 'Time-off requests to review', to: '/availability', cta: 'Review', count: pendingRequests })
  }
  if (!permissions.isSupportWorker && weekRota && weekRota.status !== 'published') {
    attentionItems.push({ label: "This week's rota is still a draft", to: `/rota/${weekStart.toISOString()}`, cta: 'Open' })
  }
  if (!permissions.isSupportWorker && !weekRota && permissions.canManageRotas) {
    attentionItems.push({ label: 'No rota created for this week', to: '/rota', cta: 'Create' })
  }

  return (
    <div className="space-y-6">
      {/* Available Shifts Notification */}
      <AvailableShiftsNotification />

      {/* Welcome Section */}
      <PageHeader
        title={<>Welcome back, {user?.name}! 👋</>}
        subtitle={`Here's what's happening this week at ${userHomeId ? 'your care home' : 'MyRotaPro'}`}
      />

      {/* Overtime approvals — admin only (only admins may approve/deny overtime) */}
      {permissions.isAdmin && <OvertimeApprovals />}

      {/* Tabs - Only show for users who can view hours summary */}
      {canViewHoursSummary && (
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary-700 text-primary-900 dark:border-primary-400 dark:text-primary-300'
                  : 'border-transparent text-neutral-600 hover:text-primary-800 hover:border-primary-500 dark:text-neutral-500 dark:hover:text-primary-300 dark:hover:border-primary-400'
              }`}
            >
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'hours'
                  ? 'border-primary-700 text-primary-900 dark:border-primary-400 dark:text-primary-300'
                  : 'border-transparent text-neutral-600 hover:text-primary-800 hover:border-primary-500 dark:text-neutral-500 dark:hover:text-primary-300 dark:hover:border-primary-400'
              }`}
            >
              <ChartBarIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              Hours Summary
            </button>
            {canManagePayroll && (
              <button
                onClick={() => setActiveTab('payroll')}
                className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'payroll'
                    ? 'border-primary-700 text-primary-900 dark:border-primary-400 dark:text-primary-300'
                    : 'border-transparent text-neutral-600 hover:text-primary-800 hover:border-primary-500 dark:text-neutral-500 dark:hover:text-primary-300 dark:hover:border-primary-400'
                }`}
              >
                <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Payroll Management
              </button>
            )}
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <KpiTile icon={CalendarIcon} tone="primary" label="Total Shifts" value={totalShifts} />
            <KpiTile
              icon={ClockIcon}
              tone="success"
              label="Paid hours"
              value={totalPaidHours.toFixed(1)}
              caption="After sleep-in & breaks (this week)"
            />
            <KpiTile
              icon={MoonIcon}
              tone="secondary"
              label="Sleep-in hours"
              value={totalSleepInHours.toFixed(1)}
              caption="Sleeping-night shifts (not paid as work)"
            />
            <KpiTile icon={UsersIcon} tone="accent" label="Active Staff" value={activeStaff} />
          </div>

          {/* Two-column: primary content + attention rail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Current Week Rota - Only show for non-regular users */}
              {!permissions.isSupportWorker && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2.5"><TitleIcon icon={CalendarIcon} />Current Week Rota</CardTitle>
                        <CardDescription className="dark:text-white">
                          Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        {weekRota && (
                          <Badge
                            variant={weekRota.status === 'published' ? 'success' : 'warning'}
                          >
                            {weekRota.status}
                          </Badge>
                        )}
                        <Link to={`/rota/${weekStart.toISOString()}`}>
                          <Button
                            variant="primary"
                            size="sm"
                          >
                            <EyeIcon className="h-4 w-4 mr-2" />
                            View Rota
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {weekRota ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border-l-4 border-l-primary-500">
                            <p className="text-2xl font-bold font-mono tabular-nums text-primary-600 dark:text-primary-400">{weekRota.total_shifts}</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-400">Total Shifts</p>
                          </div>
                          <div className="p-4 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border-l-4 border-l-success-500">
                            <p className="text-2xl font-bold font-mono tabular-nums text-success-600 dark:text-success-400">{(Number(weekRota.total_hours) || 0).toFixed(1)}</p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-400">Total Hours</p>
                          </div>
                          <div className="p-4 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl border-l-4 border-l-secondary-400">
                            <p className="text-2xl font-bold font-mono tabular-nums text-secondary-600 dark:text-secondary-300">
                              {format(new Date(weekRota.created_at), 'MMM d')}
                            </p>
                            <p className="text-sm text-neutral-700 dark:text-neutral-400">Created</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mx-auto h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                          <CalendarIcon className="h-8 w-8 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-heading-accent mb-2">No rota for this week</h3>
                        <p className="text-sm text-neutral-600 mb-6">
                          {permissions.canManageRotas
                            ? 'Create a new rota to get started'
                            : 'Contact your manager to create a rota'
                          }
                        </p>
                        {permissions.canManageRotas && (
                          <Link to="/rota">
                            <Button
                              variant="primary"
                              size="md"
                            >
                              <PlusIcon className="h-4 w-4 mr-2" />
                              Create Rota
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5"><TitleIcon icon={BoltIcon} />Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissions.canManageRotas && (
                      <Link to="/rota">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-24 w-full flex-col justify-center group hover:bg-primary-50 hover:border-primary-200 transition-all duration-200"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center mb-2 group-hover:bg-primary-200 transition-colors">
                            <CalendarIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <span className="font-medium">Create New Rota</span>
                        </Button>
                      </Link>
                    )}

                    <Link to="/my-schedule">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-24 w-full flex-col justify-center group hover:bg-secondary-50 hover:border-secondary-200 transition-all duration-200"
                      >
                        <div className="h-8 w-8 rounded-lg bg-secondary-100 flex items-center justify-center mb-2 group-hover:bg-secondary-200 transition-colors">
                          <CalendarIcon className="h-5 w-5 text-secondary-600" />
                        </div>
                        <span className="font-medium">View My Schedule</span>
                      </Button>
                    </Link>

                    <Link to="/my-hours">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-24 w-full flex-col justify-center group hover:bg-accent-50 hover:border-accent-200 transition-all duration-200"
                      >
                        <div className="h-8 w-8 rounded-lg bg-accent-100 flex items-center justify-center mb-2 group-hover:bg-accent-200 transition-colors">
                          <ChartBarIcon className="h-5 w-5 text-accent-600" />
                        </div>
                        <span className="font-medium">My Hours</span>
                      </Button>
                    </Link>

                    {permissions.canManageUsers && (
                      <Link to="/staff">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-24 w-full flex-col justify-center group hover:bg-success-50 hover:border-success-200 transition-all duration-200"
                        >
                          <div className="h-8 w-8 rounded-lg bg-success-100 flex items-center justify-center mb-2 group-hover:bg-success-200 transition-colors">
                            <UsersIcon className="h-5 w-5 text-success-600" />
                          </div>
                          <span className="font-medium">Manage Staff</span>
                        </Button>
                      </Link>
                    )}

                    <Link to="/availability">
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-24 w-full flex-col justify-center group hover:bg-warning-50 hover:border-warning-200 transition-all duration-200"
                      >
                        <div className="h-8 w-8 rounded-lg bg-warning-100 flex items-center justify-center mb-2 group-hover:bg-warning-200 transition-colors">
                          <ClockIcon className="h-5 w-5 text-warning-600" />
                        </div>
                        <span className="font-medium">Availability</span>
                      </Button>
                    </Link>

                    {permissions.canUseAISolver && (
                      <Link to="/rota">
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-24 w-full flex-col justify-center group hover:bg-primary-50 hover:border-primary-200 transition-all duration-200"
                        >
                          <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center mb-2 group-hover:bg-primary-200 transition-colors">
                            <PlusIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <span className="font-medium">AI Generate Rota</span>
                        </Button>
                      </Link>
                    )}

                    {/* Add Hours Summary quick action for admin/managers */}
                    {canViewHoursSummary && (
                      <Button
                        variant="outline"
                        size="lg"
                        className="h-24 w-full flex-col justify-center group hover:bg-accent-50 hover:border-accent-200 transition-all duration-200"
                        onClick={() => setActiveTab('hours')}
                      >
                        <div className="h-8 w-8 rounded-lg bg-accent-100 flex items-center justify-center mb-2 group-hover:bg-accent-200 transition-colors">
                          <ChartBarIcon className="h-5 w-5 text-accent-600" />
                        </div>
                        <span className="font-medium">Hours Summary</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Needs attention rail */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2.5"><TitleIcon icon={BellAlertIcon} />Needs attention</CardTitle>
                  <CardDescription>Items that may need a look this week</CardDescription>
                </CardHeader>
                <CardContent>
                  {attentionItems.length > 0 ? (
                    <ul className="space-y-3">
                      {attentionItems.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {typeof item.count === 'number' && (
                              <Badge variant="warning">{item.count}</Badge>
                            )}
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                              {item.label}
                            </span>
                          </div>
                          <Link to={item.to} className="shrink-0">
                            <Button variant="outline" size="sm">
                              {item.cta}
                              <ArrowRightIcon className="h-3.5 w-3.5 ml-1.5" />
                            </Button>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success-100">
                        <CheckCircleIcon className="h-6 w-6 text-success-600" />
                      </div>
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">You're all caught up</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Nothing needs your attention right now.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : activeTab === 'hours' ? (
        // Hours Summary Tab
        <HoursSummary
          homeId={userHomeId}
          isAdminView={true}
          userRole={user.role}
        />
      ) : canManagePayroll ? (
        <PayrollManagement homeId={userHomeId} userRole={user.role} />
      ) : null
      }
    </div>
  )
}

export default Dashboard
