import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  CogIcon,
  EyeIcon,
  DocumentArrowUpIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { rotasApi, aiSolverApi, shiftsApi, usersApi, servicesApi } from '@/lib/api'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, } from 'date-fns'
import toast from 'react-hot-toast'
import RotaGrid from '@/components/RotaGrid'
import ShiftModal from '@/components/ShiftModal'
import { Shift } from '@/types'

const RotaEditor: React.FC = () => {
  const { weekStart: weekStartParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  
  // Parse week start date from URL or use current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (weekStartParam) {
      return new Date(weekStartParam)
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  })

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('09:00')

  // Fetch rota data for current week
  const { data: rota, isLoading: rotaLoading } = useQuery({
    queryKey: ['rota', 'week', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: () => rotasApi.getAll({
      home_id: user?.home_id,
      week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      week_end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  // Fetch shifts for the week
  const { data: shifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'week', format(currentWeekStart, 'yyyy-MM-dd')],
    queryFn: () => shiftsApi.getAll({
      start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  // Fetch staff members
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ['staff', user?.home_id],
    queryFn: () => usersApi.getAll({ 
      home_id: user?.home_id // Only filter by home if user has one
    }),
    enabled: !!user && (!!user.home_id || ['admin', 'home_manager', 'senior_staff'].includes(user.role))
  })

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll(), // Fetch all services for home filtering
    enabled: !!user && ['admin', 'home_manager', 'senior_staff'].includes(user.role)
  })

  const weekRota = rota?.[0]
  const isPageLoading = rotaLoading || shiftsLoading || staffLoading || servicesLoading

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    navigate(`/rota/${format(newWeekStart, 'yyyy-MM-dd')}`)
  }

  const goToNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1)
    setCurrentWeekStart(newWeekStart)
    navigate(`/rota/${format(newWeekStart, 'yyyy-MM-dd')}`)
  }

  const goToCurrentWeek = () => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    setCurrentWeekStart(weekStart)
    navigate(`/rota/${format(weekStart, 'yyyy-MM-dd')}`)
  }

  // AI Generation
  const handleAIGenerate = async () => {
    try {
      if (!user?.home_id) {
        toast.error('Home ID is required to generate rota')
        return
      }
      
      toast.loading('Generating rota with AI...')
      
      const result = await aiSolverApi.generateRota({
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end_date: format(currentWeekEnd, 'yyyy-MM-dd'),
        home_id: user.home_id,
        service_id: 'default' // TODO: Get from selected service
      })

      toast.dismiss()
      
      if (result.success) {
        toast.success('AI rota generated successfully!')
        // TODO: Apply the generated rota
      } else {
        toast.error(result.error || 'Failed to generate rota')
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to generate rota')
    }
  }

  // Shift management handlers
  const handleAddShift = (date: Date, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    setSelectedShift(null)
    setIsShiftModalOpen(true)
  }

  const handleEditShift = (shift: Shift) => {
    setSelectedShift(shift)
            setSelectedDate(new Date(shift.date + 'T00:00:00'))
    setSelectedTime(shift.start_time.substring(0, 5))
    setIsShiftModalOpen(true)
  }

  const handleDeleteShift = async (shiftId: string) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await shiftsApi.delete(shiftId)
        toast.success('Shift deleted successfully')
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['shifts'] })
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to delete shift')
      }
    }
  }

  const handleShiftSubmit = async (data: any) => {
    try {
      if (selectedShift) {
        // Update existing shift
        await shiftsApi.update(selectedShift.id, {
          ...data,
          date: format(selectedDate, 'yyyy-MM-dd')
        })
        toast.success('Shift updated successfully')
      } else {
        // Create new shift
        if (!data.home_id) {
          toast.error('Home selection is required to create a shift')
          return
        }
        
        await shiftsApi.create({
          ...data,
          date: format(selectedDate, 'yyyy-MM-dd')
        })
        toast.success('Shift created successfully')
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      setIsShiftModalOpen(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save shift')
    }
  }

  const handleAssignStaff = async (shiftId: string, userId: string) => {
    try {
      await shiftsApi.assignStaff(shiftId, userId)
      toast.success('Staff assigned successfully')
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (error: any) {
      console.error('Failed to assign staff:', error)
      toast.error('Failed to assign staff')
    }
  }

  const handleUnassignStaff = async (shiftId: string, userId: string) => {
    try {
      await shiftsApi.removeStaff(shiftId, userId)
      toast.success('Staff unassigned successfully')
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (error: any) {
      console.error('Failed to unassign staff:', error)
      toast.error('Failed to unassign staff')
    }
  }

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Week Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rota Editor</h1>
          <p className="text-gray-600 mt-1">
            Manage weekly staff schedules and assignments
          </p>
        </div>
        
        {permissions.canManageRotas && (
          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentWeek}
            >
              Current Week
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAIGenerate}
              disabled={!permissions.canUseAISolver}
            >
              <CogIcon className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          </div>
        )}
      </div>

      {/* Week Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous Week
            </Button>

            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Week of {format(currentWeekStart, 'MMM d')} - {format(currentWeekEnd, 'MMM d, yyyy')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(currentWeekStart, 'EEEE, MMMM d')} to {format(currentWeekEnd, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
            >
              Next Week
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rota Status and Actions */}
      {weekRota && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Rota</CardTitle>
                <CardDescription>
                  Rota status and management options
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={weekRota.status === 'published' ? 'success' : 'warning'}
                >
                  {weekRota.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                {weekRota.status === 'draft' && (
                  <Button
                    variant="primary"
                    size="sm"
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

              {/* Rota Editor Interface */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>
                  {weekRota ? 'Edit staff assignments and shifts' : 'Create new weekly rota'}
                </CardDescription>
              </div>
              {permissions.canManageRotas && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedDate(new Date())
                    setSelectedTime('09:00')
                    setSelectedShift(null)
                    setIsShiftModalOpen(true)
                  }}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {shifts && staff && services && user ? (
              <RotaGrid
                weekStart={currentWeekStart}
                shifts={shifts}
                staff={staff}
                currentUser={user}
                onAddShift={handleAddShift}
                onEditShift={handleEditShift}
                onDeleteShift={handleDeleteShift}
                onAssignStaff={handleAssignStaff}
                onUnassignStaff={handleUnassignStaff}
                canEdit={permissions.canManageRotas || false}
              />
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <CalendarIcon className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {weekRota ? 'Loading schedule...' : 'No rota for this week'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {weekRota 
                    ? 'Please wait while we load the schedule data'
                    : permissions.canManageRotas 
                      ? 'Create a new rota to get started with staff scheduling'
                      : 'Contact your manager to create a rota for this week'
                  }
                </p>
                {permissions.canManageRotas && !weekRota && (
                  <div className="space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedDate(new Date())
                        setSelectedTime('09:00')
                        setSelectedShift(null)
                        setIsShiftModalOpen(true)
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Rota
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAIGenerate}
                      disabled={!permissions.canUseAISolver}
                    >
                      <CogIcon className="h-4 w-4 mr-2" />
                      AI Generate
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">0</p>
              <p className="text-sm text-gray-600">Shifts Today</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">0</p>
              <p className="text-sm text-gray-600">Staff Available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning-600">0</p>
              <p className="text-sm text-gray-600">Pending Requests</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-600">0</p>
              <p className="text-sm text-gray-600">Total Hours</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSubmit={handleShiftSubmit}
        shift={selectedShift}
        date={selectedDate}
        services={services || []}
        isLoading={false}
      />
    </div>
  )
}

export default RotaEditor
