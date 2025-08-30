import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import WeeklyScheduleEditor from '@/components/WeeklyScheduleEditor'
import { homesApi, servicesApi } from '@/lib/api'
import { 
  PlusIcon,
  ArrowLeftIcon,
  HomeIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const WeeklySchedules: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const permissions = usePermissions()
  
  const [selectedHomeId, setSelectedHomeId] = useState<string>('')

  // Auto-select user's home if they have one assigned
  useEffect(() => {
    if (user && !selectedHomeId) {
      const userHomes = user.homes || []
      if (userHomes.length > 0) {
        setSelectedHomeId(userHomes[0].home_id)
      }
    }
  }, [user, selectedHomeId])

  // Fetch all homes for selector
  const { data: homes, isLoading: homesLoading } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    enabled: !!user && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch services for the selected home
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', selectedHomeId],
    queryFn: () => servicesApi.getAll(selectedHomeId),
    enabled: !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user?.role || ''),
    select: (data) => Array.isArray(data) ? data : []
  })

  const handleScheduleChange = () => {
    // Refresh data when schedule changes

  }

  const handleHomeChange = (homeId: string) => {
    setSelectedHomeId(homeId)
  }



  // Check if user has permissions to access weekly schedules
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!['admin', 'home_manager', 'senior_staff'].includes(user.role)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to access weekly schedule management.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Weekly Schedules</h1>
            <p className="text-gray-600 mt-1">
              Configure standard shift patterns for each care home
            </p>
          </div>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rota')}
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Rota Editor
          </Button>
          {permissions.canManageHomes && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/homes')}
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Manage Homes
            </Button>
          )}
        </div>
      </div>

      {/* Home Selector */}
      {!homesLoading && homes && (
        <Card>
          <CardHeader>
            <CardTitle>Select Care Home</CardTitle>
            <CardDescription>
              Choose a care home to configure its weekly schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <select
                  value={selectedHomeId}
                  onChange={(e) => handleHomeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  disabled={homes.length === 0}
                >
                  <option value="">Select a care home...</option>
                  {homes.map((home) => (
                    <option key={home.id} value={home.id}>
                      {home.name} - {home.location.city}
                    </option>
                  ))}
                </select>
              </div>
              {selectedHomeId && (
                <div className="text-sm text-gray-600">
                  {homes.find(h => h.id === selectedHomeId)?.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Homes Loading State */}
      {homesLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Care Homes</h3>
            <p className="text-gray-500">
              Please wait while we fetch the available care homes...
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Home Selected Message */}
      {!selectedHomeId && !homesLoading && homes && homes.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Care Home</h3>
            <p className="text-gray-500">
              Choose a care home from the dropdown above to configure its weekly schedule.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Homes Available Message */}
      {!homesLoading && homes && homes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Care Homes Available</h3>
            <p className="text-gray-500 mb-4">
              There are no care homes set up in the system yet.
            </p>
            {permissions.canManageHomes && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/homes')}
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Manage Homes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Schedule Editor */}
      {selectedHomeId && services && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Weekly Schedule - {homes?.find(h => h.id === selectedHomeId)?.name}
                </CardTitle>
                <CardDescription>
                  Configure the standard shift patterns for each day of the week. 
                  These patterns will be used by the AI solver to generate rotas.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeeklyScheduleEditor
              homeId={selectedHomeId}
              services={services}
              onScheduleChange={handleScheduleChange}
              canEdit={permissions.canManageRotas}
            />
          </CardContent>
        </Card>
      )}

      {/* Services Loading State */}
      {selectedHomeId && servicesLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner size="lg" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Services</h3>
            <p className="text-gray-500">
              Please wait while we fetch the services for this care home...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How Weekly Schedules Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📅 Daily Patterns</h4>
              <p className="text-sm text-gray-600">
                Configure shift patterns for each day of the week. You can set different patterns 
                for weekdays vs weekends, or customize each day individually.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🤖 AI Solver Integration</h4>
              <p className="text-sm text-gray-600">
                The AI solver uses these patterns to automatically generate weekly rotas with 
                proper staff assignments based on your configured constraints.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">👥 Staff Requirements</h4>
              <p className="text-sm text-gray-600">
                Set how many staff members are required for each shift type. The system will 
                ensure these requirements are met when generating rotas.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">⏰ Flexible Timing</h4>
              <p className="text-sm text-gray-600">
                Support for overnight shifts, split shifts, and custom time ranges. 
                Each shift can have different start/end times and durations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WeeklySchedules
