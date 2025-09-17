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
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { rotasApi, shiftsApi, usersApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { extractUserDefaultHomeId } from '@/types'
import AvailableShiftsNotification from '@/components/AvailableShiftsNotification'
import HoursSummary from '@/components/HoursSummary'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  const [activeTab, setActiveTab] = useState<'overview' | 'hours'>('overview')

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
    enabled: !!user && (!!userHomeId || ['admin', 'home_manager', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'current', weekStart.toISOString()],
    queryFn: () => shiftsApi.getAll({
      start_date: weekStart.toISOString(),
      end_date: weekEnd.toISOString()
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'home_manager', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', userHomeId],
    queryFn: () => usersApi.getAll({ 
      home_id: userHomeId // Only filter by home if user has one
    }),
    enabled: !!user && (!!userHomeId || ['admin', 'home_manager', 'senior_staff'].includes(user.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  const isLoading = rotaLoading || shiftsLoading || staffLoading

  // Calculate statistics (data should now be guaranteed arrays from select option)
  const totalShifts = staff.length || 0
  const totalHours = shifts.reduce((sum, shift) => sum + (shift.duration_hours || 0), 0) || 0
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

  // Check if user can view hours summary (admin, home_manager, senior_staff)
  const canViewHoursSummary = ['admin', 'home_manager', 'senior_staff'].includes(user.role)

  return (
    <div className="space-y-6">
      {/* Available Shifts Notification */}
      <AvailableShiftsNotification />

      {/* Welcome Section */}
      <div className="card">
        <div className="card-content">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100 font-display mb-2">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base lg:text-lg">
            Here's what's happening this week at {userHomeId ? 'your care home' : 'MyRotaPro'}
          </p>
        </div>
      </div>

      {/* Tabs - Only show for users who can view hours summary */}
      {canViewHoursSummary && (
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`py-2 sm:py-3 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === 'hours'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              <ChartBarIcon className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
              Hours Summary
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                      <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">Total Shifts</p>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalShifts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-success-100 flex items-center justify-center group-hover:bg-success-200 transition-colors">
                      <ClockIcon className="h-5 w-5 sm:h-6 sm:w-6 text-success-600" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">Total Hours</p>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{totalHours}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary-100 flex items-center justify-center group-hover:bg-secondary-200 transition-colors">
                      <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-600" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">Active Staff</p>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{activeStaff}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-warning-100 flex items-center justify-center group-hover:bg-warning-200 transition-colors">
                      <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-warning-600" />
                    </div>
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-neutral-600">Pending Requests</p>
                    <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">{pendingRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Week Rota - Only show for non-regular users */}
          {!permissions.isSupportWorker && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Week Rota</CardTitle>
                    <CardDescription>
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
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">{weekRota.total_shifts}</p>
                        <p className="text-sm text-gray-600">Total Shifts</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-success-600">{weekRota.total_hours}</p>
                        <p className="text-sm text-gray-600">Total Hours</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-secondary-600">
                          {format(new Date(weekRota.created_at), 'MMM d')}
                        </p>
                        <p className="text-sm text-gray-600">Created</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                      <CalendarIcon className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">No rota for this week</h3>
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
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.canManageRotas && (
                  <Link to="/rota">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-24 flex-col justify-center group hover:bg-primary-50 hover:border-primary-200 transition-all duration-200"
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
                    className="h-24 flex-col justify-center group hover:bg-secondary-50 hover:border-secondary-200 transition-all duration-200"
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
                    className="h-24 flex-col justify-center group hover:bg-accent-50 hover:border-accent-200 transition-all duration-200"
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
                      className="h-24 flex-col justify-center group hover:bg-success-50 hover:border-success-200 transition-all duration-200"
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
                    className="h-24 flex-col justify-center group hover:bg-warning-50 hover:border-warning-200 transition-all duration-200"
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
                      className="h-24 flex-col justify-center group hover:bg-primary-50 hover:border-primary-200 transition-all duration-200"
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
                    className="h-24 flex-col justify-center group hover:bg-accent-50 hover:border-accent-200 transition-all duration-200"
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

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Weekly rota published
                    </p>
                    <p className="text-sm text-neutral-600">
                      {format(now, 'MMM d, yyyy')} at {format(now, 'h:mm a')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-success-100 rounded-full flex items-center justify-center">
                      <UsersIcon className="h-5 w-5 text-success-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      New staff member added
                    </p>
                    <p className="text-sm text-neutral-600">
                      {format(now, 'MMM d, yyyy')} at {format(now, 'h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        // Hours Summary Tab
        <HoursSummary 
          homeId={userHomeId}
          isAdminView={true}
          userRole={user.role}
        />
      )}
    </div>
  )
}

export default Dashboard
