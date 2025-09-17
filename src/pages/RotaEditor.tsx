import React, { useState, useEffect } from 'react'
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
import { rotasApi, aiSolverApi, shiftsApi, usersApi, servicesApi, homesApi, weeklySchedulesApi } from '@/lib/api'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import RotaGrid from '@/components/RotaGrid'
import ShiftModal from '@/components/ShiftModal'
import ConflictAlert from '@/components/ConflictAlert'
import MultiHomeSelector from '@/components/MultiHomeSelector'
import { Shift, extractUserDefaultHomeId } from '@/types'

const RotaEditor: React.FC = () => {
  const { weekStart: weekStartParam } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  
  // Helper function to ensure home ID is always a string
  const ensureStringHomeId = (homeId: any): string => {
    if (typeof homeId === 'string') return homeId
    if (homeId && typeof homeId === 'object' && homeId.id) return String(homeId.id)
    return String(homeId || '')
  }
  
  // Parse week start date from URL or use current week
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    if (weekStartParam) {
      return new Date(weekStartParam)
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
  })

  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  // Home selection state
  const [selectedHomeId, setSelectedHomeId] = useState<string>('')
  const [selectedHomesForAI, setSelectedHomesForAI] = useState<string[]>([])
  const [showMultiHomeSelector, setShowMultiHomeSelector] = useState(false)

  // Auto-select user's home if they have one assigned
  useEffect(() => {
    if (user && !selectedHomeId) {
      const homeId = extractUserDefaultHomeId(user)
      if (homeId) {
        // Ensure homeId is always a string
        const stringHomeId = typeof homeId === 'string' ? homeId : String(homeId)
        setSelectedHomeId(stringHomeId)
      }
    }
  }, [user, selectedHomeId])

  // Modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>('09:00')

  // Fetch all homes for selector
  const { data: homes = [], isLoading: homesLoading } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    enabled: !!user && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch rota data for current week
  const { data: rota = [], isLoading: rotaLoading } = useQuery({
    queryKey: ['rota', 'week', format(currentWeekStart, 'yyyy-MM-dd'), selectedHomeId],
    queryFn: () => {
      const homeId = ensureStringHomeId(selectedHomeId)
      return rotasApi.getAll({
        home_id: homeId,
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end_date: format(currentWeekEnd, 'yyyy-MM-dd')
      })
    },
    enabled: !!user && !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch shifts for the week
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', 'week', format(currentWeekStart, 'yyyy-MM-dd'), selectedHomeId],
    queryFn: () => shiftsApi.getAll({
      home_id: ensureStringHomeId(selectedHomeId),
      start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user && !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch staff members
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', selectedHomeId],
    queryFn: () => usersApi.getAll({ 
      home_id: ensureStringHomeId(selectedHomeId)
    }),
    enabled: !!user && !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', selectedHomeId],
    queryFn: () => servicesApi.getAll(ensureStringHomeId(selectedHomeId)), // Fetch services for selected home
    enabled: !!user && !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch scheduling conflicts
  const { data: conflicts = { totalConflicts: 0, conflicts: [] }, isLoading: conflictsLoading } = useQuery({
    queryKey: ['conflicts', selectedHomeId, format(currentWeekStart, 'yyyy-MM-dd'), format(currentWeekEnd, 'yyyy-MM-dd')],
    queryFn: () => shiftsApi.checkConflicts({
      home_id: ensureStringHomeId(selectedHomeId),
      start_date: format(currentWeekStart, 'yyyy-MM-dd'),
      end_date: format(currentWeekEnd, 'yyyy-MM-dd')
    }),
    enabled: !!user && !!selectedHomeId && ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const weekRota = rota?.[0]
  // Only show loading spinner when we have a selected home and are loading its data
  const isPageLoading = selectedHomeId && (rotaLoading || shiftsLoading || staffLoading || servicesLoading || conflictsLoading)



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

  // AI Generation for single home
  const handleAIGenerate = async () => {
    try {
      if (!selectedHomeId) {
        toast.error('Please select a care home first')
        return
      }
      
      if (services.length === 0) {
        toast.error('No services available for this care home')
        return
      }
      
      // Check if we need to create shifts from weekly schedule
      if (shifts.length === 0) {
        const shouldCreateShifts = window.confirm(
          'No shifts found for this week. Would you like to create shifts from the weekly schedule first?'
        )
        
        if (shouldCreateShifts) {
          await createShiftsFromWeeklySchedule()
        } else {
          toast.error('Please create shifts first before using AI generation.')
          return
        }
      }
      
      // Use the first available service for AI generation
      const selectedService = services[0]
      
      // Use the component's current week state (the week the user is viewing)
      // const now = new Date()
      // const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
      // const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
      
      toast.loading(`Generating rota with AI for ${selectedHomeId}...`)
      
      const result = await aiSolverApi.generateRota({
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end_date: format(currentWeekEnd, 'yyyy-MM-dd'),
        home_ids: ensureStringHomeId(selectedHomeId),
        service_id: selectedService.id,
        existing_shifts: shifts // Pass existing shifts from rota grid
      })

      toast.dismiss()
      
      if (result.data?.success) {
        // Show success message with employment type distribution if available
        let successMessage = 'AI rota generated successfully!'
        
        if (result.summary) {
          successMessage += ` ${result.summary}`
        }
        
        // Add note about automatic shift creation
        if (shifts.length === 0) {
          successMessage += ' Shifts were automatically created from weekly schedules where needed.'
        }
        
        // Add information about double booking prevention
        if (result.data.total_homes_considered && result.data.total_homes_considered > 1) {
          successMessage += ` Considered ${result.data.total_homes_considered} total homes to prevent double booking.`
        }
        
        toast.success(successMessage, { duration: 8000 })
        
        // Refresh the shifts data to show new assignments
        queryClient.invalidateQueries({ queryKey: ['shifts'] })
        queryClient.invalidateQueries({ queryKey: ['rota'] })
        queryClient.invalidateQueries({ queryKey: ['shifts', 'week'] })
        
        // Force immediate refetch of current week's shifts
        queryClient.refetchQueries({ 
          queryKey: ['shifts', 'week', format(currentWeekStart, 'yyyy-MM-dd'), selectedHomeId] 
        })
      } else {
        toast.error(result.data?.error || 'Failed to generate rota')
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to generate rota')
    }
  }

  // Multi-home AI Generation
  const handleMultiHomeAIGenerate = async () => {
    try {
      if (selectedHomesForAI.length === 0) {
        toast.error('Please select at least one home for multi-home generation')
        return
      }
      
      if (services.length === 0) {
        toast.error('No services available for the selected homes')
        return
      }
      
      // Use the first available service for AI generation
      const selectedService = services[0]
      
      // Use the component's current week state (the week the user is viewing)
      // const now = new Date()
      // const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
      // const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
      
      toast.loading(`Generating rota with AI for ${selectedHomesForAI.length} home(s)...`)
      
      const result = await aiSolverApi.generateRota({
        week_start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end_date: format(currentWeekEnd, 'yyyy-MM-dd'),
        home_ids: selectedHomesForAI,
        service_id: selectedService.id,
        existing_shifts: [] // Don't pass existing shifts for multi-home generation
      })

      toast.dismiss()
      
      if (result.data?.success) {
        // Show success message with employment type distribution if available
        let successMessage = `AI rota generated successfully for ${selectedHomesForAI.length} home(s)!`
        
        if (result.summary) {
          successMessage += ` ${result.summary}`
        }
        
        // Add information about double booking prevention
        if (result.data.total_homes_considered && result.data.total_homes_considered > selectedHomesForAI.length) {
          successMessage += ` Considered ${result.data.total_homes_considered} total homes to prevent double booking.`
        }
        
        toast.success(successMessage, { duration: 8000 })
        
        // Refresh the shifts data to show new assignments
        queryClient.invalidateQueries({ queryKey: ['shifts'] })
        queryClient.invalidateQueries({ queryKey: ['rota'] })
        queryClient.invalidateQueries({ queryKey: ['shifts', 'week'] })
        
        // Force immediate refetch of current week's shifts for all selected homes
        selectedHomesForAI.forEach(homeId => {
          queryClient.refetchQueries({ 
            queryKey: ['shifts', 'week', format(currentWeekStart, 'yyyy-MM-dd'), homeId] 
          })
        })
        
        // Also refetch for the currently selected home if it's different
        if (selectedHomeId && !selectedHomesForAI.includes(selectedHomeId)) {
          queryClient.refetchQueries({ 
            queryKey: ['shifts', 'week', format(currentWeekStart, 'yyyy-MM-dd'), selectedHomeId] 
          })
        }
      } else {
        toast.error(result.data?.error || 'Failed to generate rota')
      }
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to generate rota')
    }
  }

  // Create shifts from weekly schedule
  const createShiftsFromWeeklySchedule = async () => {
    try {
      toast.loading('Creating shifts from weekly schedule...')
      
      // Get weekly schedule for the home
      const weeklySchedule = await weeklySchedulesApi.getByHome(ensureStringHomeId(selectedHomeId))
      
      if (!weeklySchedule || !weeklySchedule.schedule) {
        toast.error('No weekly schedule found for this home')
        return
      }
      
      // Use the current week dates from the RotaEditor
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const createdShifts = []
      
      // Create shifts for each day of the week
      for (let i = 0; i < 7; i++) {
        const currentDate = addDays(currentWeekStart, i)
        const dayName = dayNames[currentDate.getDay()]
        const daySchedule = weeklySchedule.schedule[dayName as keyof typeof weeklySchedule.schedule]
        
        if (daySchedule && daySchedule.is_active && daySchedule.shifts) {
          for (const shiftPattern of daySchedule.shifts) {
            const shiftData = {
              home_id: ensureStringHomeId(selectedHomeId),
              service_id: shiftPattern.service_id,
              date: format(currentDate, 'yyyy-MM-dd'),
              start_time: shiftPattern.start_time,
              end_time: shiftPattern.end_time,
              shift_type: shiftPattern.shift_type,
              required_staff_count: shiftPattern.required_staff_count,
              notes: shiftPattern.notes || '',
              is_active: true,
              assigned_staff: [],
              is_urgent: false,
              status: 'unassigned' as const,
              duration_hours: 0
            }
            
            try {
              const newShift = await shiftsApi.create(shiftData)
              createdShifts.push(newShift)
            } catch (error: any) {
              console.error('Failed to create shift:', error)
              // Continue with other shifts even if one fails
            }
          }
        }
      }
      
      toast.dismiss()
      
      if (createdShifts.length > 0) {
        toast.success(`Created ${createdShifts.length} shifts from weekly schedule`)
        // Refresh shifts data
        queryClient.invalidateQueries({ queryKey: ['shifts'] })
      } else {
        toast.error('No shifts were created from weekly schedule')
      }
      
    } catch (error: any) {
      toast.dismiss()
      toast.error('Failed to create shifts from weekly schedule')
      console.error('Error creating shifts:', error)
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
        await shiftsApi.create({
          ...data,
          home_id: ensureStringHomeId(selectedHomeId),
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
      return { success: true }
    } catch (error: any) {
      console.error('Failed to assign staff:', error)
      
      // Handle different types of errors with specific messages
      if (error.response?.status === 409) {
        // Conflict error - show detailed conflict information
        const conflictData = error.response.data
        if (conflictData.conflict) {
          const conflict = conflictData.conflict
          let errorMessage = 'Scheduling conflict detected: '
          
          switch (conflict.conflictType) {
            case 'time_off':
              errorMessage += `This staff member has approved time off on ${conflict.conflicts[0]?.start_date || 'the requested date'}. Please reassign to another staff member or cancel the time-off request.`
              break
            case 'overlapping_shift':
              errorMessage += `This staff member already has overlapping shifts on the same date. Please check the schedule for time conflicts.`
              break
            case 'max_hours_exceeded':
              errorMessage += `Assigning this shift would exceed the maximum daily hours (${conflict.message}). Please reduce shift duration or assign to different staff.`
              break
            default:
              errorMessage += conflict.message || 'Unknown conflict type'
          }
          
          toast.error(errorMessage, { duration: 8000 })
        } else {
          toast.error(conflictData.message || 'Scheduling conflict detected')
        }
      } else if (error.response?.status === 400) {
        // Bad request - show validation error
        const errorData = error.response.data
        if (errorData.details && Array.isArray(errorData.details)) {
          toast.error(`Validation failed: ${errorData.details.join(', ')}`)
        } else if (errorData.message) {
          toast.error(errorData.message)
        } else {
          toast.error(errorData.error || 'Invalid request data')
        }
      } else if (error.response?.status === 404) {
        // Not found
        toast.error('Shift or staff member not found')
      } else if (error.response?.status === 403) {
        // Forbidden
        toast.error('You do not have permission to assign staff to this shift')
      } else {
        // Generic error
        toast.error(error.response?.data?.error || 'Failed to assign staff. Please try again.')
      }
      
      return { success: false, error: error.response?.data?.error || 'Unknown error' }
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
      
      if (error.response?.status === 404) {
        toast.error('Shift or staff assignment not found')
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to unassign staff from this shift')
      } else {
        toast.error(error.response?.data?.error || 'Failed to unassign staff. Please try again.')
      }
    }
  }

  // Reset all assignments for the week
  const handleResetWeek = async () => {
    try {
      toast.loading('Resetting all assignments for the week...')
      
      // Get all shifts for the current week
      const weekShifts = await shiftsApi.getAll({
        home_id: ensureStringHomeId(selectedHomeId),
        start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        end_date: format(currentWeekEnd, 'yyyy-MM-dd')
      })
      
      // Unassign all staff from all shifts
      const unassignPromises = weekShifts.flatMap(shift => 
        (shift.assigned_staff || []).map(assignment => 
          shiftsApi.removeStaff(shift.id, assignment.user_id)
        )
      )
      
      await Promise.all(unassignPromises)
      
      toast.dismiss()
      toast.success('All assignments reset successfully')
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (error: any) {
      toast.dismiss()
      console.error('Failed to reset week:', error)
      toast.error('Failed to reset assignments. Please try again.')
    }
  }

  // Delete all shifts for the week
  const handleDeleteWeek = async () => {
    try {
      toast.loading('Deleting all shifts for the week...')
      
      // Get all shifts for the current week
      const weekShifts = await shiftsApi.getAll({
        home_id: ensureStringHomeId(selectedHomeId),
        start_date: format(currentWeekStart, 'yyyy-MM-dd'),
        end_date: format(currentWeekEnd, 'yyyy-MM-dd')
      })
      
      // Delete all shifts
      const deletePromises = weekShifts.map(shift => 
        shiftsApi.delete(shift.id)
      )
      
      await Promise.all(deletePromises)
      
      toast.dismiss()
      toast.success('All shifts deleted successfully')
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    } catch (error: any) {
      toast.dismiss()
      console.error('Failed to delete week:', error)
      toast.error('Failed to delete shifts. Please try again.')
    }
  }

  // Check if user has permissions to access rota editor
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to access the rota editor.
        </p>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Rota Editor</h1>
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
              variant="outline"
              size="sm"
              onClick={() => navigate('/weekly-schedules')}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Weekly Schedules
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
            {user?.role === 'admin' && homes.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMultiHomeSelector(!showMultiHomeSelector)}
              >
                Multi-Home AI
              </Button>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Generates rota for current week
            </p>
          </div>
        )}
      </div>

      {/* Home Selector - Only show when homes are loaded */}
      {!homesLoading && homes && (
        <Card>
          <CardHeader>
            <CardTitle>Select Care Home</CardTitle>
            <CardDescription>
              Choose a care home to view and manage its weekly schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <select
                  value={selectedHomeId}
                  onChange={(e) => setSelectedHomeId(e.target.value)}
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
      {!selectedHomeId && !homesLoading && homes.length > 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Care Home</h3>
            <p className="text-gray-500">
              Choose a care home from the dropdown above to view and manage its weekly schedule.
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Homes Available Message */}
      {!homesLoading && homes.length === 0 && (
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
                Manage Homes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-Home Selector for AI Generation - Only show for admin users */}
      {showMultiHomeSelector && user?.role === 'admin' && homes.length > 1 && (
        <MultiHomeSelector
          homes={homes}
          selectedHomes={selectedHomesForAI}
          onHomesChange={setSelectedHomesForAI}
          onGenerate={handleMultiHomeAIGenerate}
          isLoading={false}
        />
      )}

      {/* Week Navigation - Only show when home is selected */}
      {selectedHomeId && (
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
      )}

      {/* Scheduling Conflicts Alert - Only show when home is selected */}
      {selectedHomeId && conflicts && conflicts.totalConflicts > 0 && (
        <ConflictAlert
          conflicts={conflicts.conflicts}
          onResolveConflict={(conflict) => {
            // Navigate to the specific shift or show modal to resolve
            toast.success('Use the shift editor to resolve this conflict')
          }}
          onDismiss={() => {
            // Invalidate conflicts query to refresh
            queryClient.invalidateQueries({ queryKey: ['conflicts'] })
          }}
        />
      )}

      {/* Rota Status and Actions - Only show when home is selected */}
      {selectedHomeId && weekRota && (
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

      {/* Rota Editor Interface - Only show when home is selected */}
      {selectedHomeId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Weekly Schedule - {homes?.find(h => h.id === selectedHomeId)?.name}
                </CardTitle>
                <CardDescription>
                  {homes?.find(h => h.id === selectedHomeId)?.location?.city && (
                    <>
                      {homes.find(h => h.id === selectedHomeId)?.location.address}, 
                      {homes.find(h => h.id === selectedHomeId)?.location.city}
                      <br />
                    </>
                  )}
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
            {shifts.length > 0 && staff.length > 0 && services.length > 0 && user ? (
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
                onResetWeek={handleResetWeek}
                onDeleteWeek={handleDeleteWeek}
                canEdit={permissions.canManageRotas || false}
                conflicts={conflicts?.conflicts || []}
                homeId={selectedHomeId}
                onCreateShiftsFromSchedule={createShiftsFromWeeklySchedule}
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
                      ? 'Create shifts from your weekly schedule or add them manually to get started'
                      : 'Contact your manager to create a rota for this week'
                  }
                </p>
                {permissions.canManageRotas && !weekRota && (
                  <div className="space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={createShiftsFromWeeklySchedule}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create from Weekly Schedule
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDate(new Date())
                        setSelectedTime('09:00')
                        setSelectedShift(null)
                        setIsShiftModalOpen(true)
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Shift Manually
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
      )}

      {/* Quick Stats - Only show when home is selected */}
      {selectedHomeId && (
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
      )}

      {/* Shift Modal - Only show when home is selected */}
      {selectedHomeId && (
        <ShiftModal
          isOpen={isShiftModalOpen}
          onClose={() => setIsShiftModalOpen(false)}
          onSubmit={handleShiftSubmit}
          shift={selectedShift}
          date={selectedDate}
          services={services || []}
          homeId={selectedHomeId}
          existingShifts={shifts || []}
          isLoading={false}
        />
      )}
    </div>
  )
}

export default RotaEditor
