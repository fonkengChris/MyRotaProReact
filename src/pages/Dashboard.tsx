import React from 'react'
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
  EyeIcon
} from '@heroicons/react/24/outline'
import { rotasApi, shiftsApi, usersApi } from '@/lib/api'
import { format, startOfWeek, endOfWeek } from 'date-fns'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const permissions = usePermissions()
  
  // Get current week dates
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  // Fetch dashboard data
  const { data: currentRota, isLoading: rotaLoading } = useQuery({
    queryKey: ['rota', 'current', weekStart.toISOString()],
    queryFn: () => rotasApi.getAll({
      home_id: user?.home_id,
      week_start_date: weekStart.toISOString(),
      week_end_date: weekEnd.toISOString()
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'current', weekStart.toISOString()],
    queryFn: () => shiftsApi.getAll({
      start_date: weekStart.toISOString(),
      end_date: weekEnd.toISOString()
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff', user?.home_id],
    queryFn: () => usersApi.getAll({ 
      home_id: user?.home_id // Only filter by home if user has one
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  const isLoading = rotaLoading || shiftsLoading || staffLoading

  // Calculate statistics
  const totalShifts = shifts?.length || 0
  const totalHours = shifts?.reduce((sum, shift) => sum + (shift.duration_hours || 0), 0) || 0
  const activeStaff = staff?.filter(s => s.is_active).length || 0
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening this week at {user?.home_id ? 'your care home' : 'MyRotaPro'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Shifts</p>
                <p className="text-2xl font-semibold text-gray-900">{totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Hours</p>
                <p className="text-2xl font-semibold text-gray-900">{totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Staff</p>
                <p className="text-2xl font-semibold text-gray-900">{activeStaff}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Week Rota */}
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
            <div className="text-center py-8">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No rota for this week</h3>
              <p className="mt-1 text-sm text-gray-500">
                {permissions.canManageRotas 
                  ? 'Create a new rota to get started'
                  : 'Contact your manager to create a rota'
                }
              </p>
              {permissions.canManageRotas && (
                <div className="mt-6">
                                <Link to="/rota">
                <Button
                  variant="primary"
                  size="sm"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Rota
                </Button>
              </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {permissions.canManageRotas && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link to="/rota">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 flex-col justify-center"
                >
                  <CalendarIcon className="h-6 w-6 mb-2" />
                  Create New Rota
                </Button>
              </Link>

              <Link to="/staff">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 flex-col justify-center"
                >
                  <UsersIcon className="h-6 w-6 mb-2" />
                  Manage Staff
                </Button>
              </Link>

              <Link to="/availability">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-20 flex-col justify-center"
                >
                  <ClockIcon className="h-6 w-6 mb-2" />
                  Availability
                </Button>
              </Link>

              {permissions.canUseAISolver && (
                <Link to="/rota">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col justify-center"
                  >
                    <PlusIcon className="h-6 w-6 mb-2" />
                    AI Generate Rota
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-primary-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  Weekly rota published
                </p>
                <p className="text-sm text-gray-500">
                  {format(now, 'MMM d, yyyy')} at {format(now, 'h:mm a')}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-success-100 rounded-full flex items-center justify-center">
                  <UsersIcon className="h-4 w-4 text-success-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  New staff member added
                </p>
                <p className="text-sm text-gray-500">
                  {format(now, 'MMM d, yyyy')} at {format(now, 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
