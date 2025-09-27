import React, { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ShiftConfigModal from './ShiftConfigModal'
import ShiftTemplateLibrary from './ShiftTemplateLibrary'
import { Service, WeeklySchedule, WeeklyScheduleShift, extractServiceId } from '@/types'
import { weeklySchedulesApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface WeeklyScheduleEditorProps {
  homeId: string
  services: Service[]
  onScheduleChange?: () => void
  canEdit?: boolean
}

interface Shift extends WeeklyScheduleShift {
  _id?: string
}

const WeeklyScheduleEditor: React.FC<WeeklyScheduleEditorProps> = ({
  homeId,
  services,
  onScheduleChange,
  canEdit = true
}) => {
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [selectedDay, setSelectedDay] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const dayNames = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  // Load existing schedule
  useEffect(() => {
    if (homeId) {
      loadSchedule()
    }
  }, [homeId])

  const loadSchedule = async () => {
    setIsLoading(true)
    try {
      const data = await weeklySchedulesApi.getByHome(homeId)
      setSchedule(data)
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No schedule exists yet, create a default one
        createDefaultSchedule()
      } else {
        console.error('Failed to load schedule:', error)
        toast.error('Failed to load weekly schedule')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const createDefaultSchedule = async () => {
    const defaultSchedule: Partial<WeeklySchedule> = {
      home_id: homeId,
      schedule: {
        monday: { is_active: true, shifts: [] },
        tuesday: { is_active: true, shifts: [] },
        wednesday: { is_active: true, shifts: [] },
        thursday: { is_active: true, shifts: [] },
        friday: { is_active: true, shifts: [] },
        saturday: { is_active: true, shifts: [] },
        sunday: { is_active: true, shifts: [] }
      }
    }

    try {
      const data = await weeklySchedulesApi.create(defaultSchedule as any)
      setSchedule(data)
      onScheduleChange?.()
      toast.success('Default weekly schedule created')
    } catch (error: any) {
      console.error('Error creating default schedule:', error)
      toast.error('Failed to create default schedule')
    }
  }

  const handleAddShift = (dayKey: string) => {
    setSelectedDay(dayKey)
    setSelectedShift(null)
    setIsCreating(true)
    setIsShiftModalOpen(true)
  }

  const handleEditShift = (dayKey: string, shift: Shift, shiftIndex: number) => {
    setSelectedDay(dayKey)
    setSelectedShift({ ...shift, _id: shiftIndex.toString() })
    setIsCreating(false)
    setIsShiftModalOpen(true)
  }

  const handleDeleteShift = async (dayKey: string, shiftIndex: number) => {
    if (!schedule?._id) return

    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await weeklySchedulesApi.removeShiftFromDay(schedule._id, dayKey, shiftIndex)
        await loadSchedule()
        onScheduleChange?.()
        toast.success('Shift deleted successfully')
      } catch (error: any) {
        console.error('Error deleting shift:', error)
        toast.error('Failed to delete shift')
      }
    }
  }

  const handleShiftSubmit = async (shiftData: any) => {
    if (!schedule?._id) return

    try {
      if (isCreating) {
        // Add new shift
        await weeklySchedulesApi.addShiftToDay(schedule._id, selectedDay, shiftData)
        await loadSchedule()
        onScheduleChange?.()
        setIsShiftModalOpen(false)
        toast.success('Shift added successfully')
      } else {
        // Update existing shift - remove old and add new
        const shiftIndex = parseInt(selectedShift?._id || '0')
        
        // Remove old shift
        await weeklySchedulesApi.removeShiftFromDay(schedule._id, selectedDay, shiftIndex)

        // Add updated shift
        await weeklySchedulesApi.addShiftToDay(schedule._id, selectedDay, shiftData)

        await loadSchedule()
        onScheduleChange?.()
        setIsShiftModalOpen(false)
        toast.success('Shift updated successfully')
      }
    } catch (error: any) {
      console.error('Error saving shift:', error)
      toast.error('Failed to save shift')
    }
  }

  const handleApplyTemplate = async (template: any) => {
    if (!schedule?._id) return

    try {
      // Clear all existing shifts from all days
      for (const dayKey of dayNames.map(d => d.key)) {
        const daySchedule = schedule.schedule[dayKey as keyof typeof schedule.schedule]
        if (daySchedule && daySchedule.shifts.length > 0) {
          // Remove shifts in reverse order to avoid index issues
          for (let i = daySchedule.shifts.length - 1; i >= 0; i--) {
            await weeklySchedulesApi.removeShiftFromDay(schedule._id, dayKey, i)
          }
        }
      }

      // Apply template to all active days
      for (const dayKey of dayNames.map(d => d.key)) {
        const daySchedule = schedule.schedule[dayKey as keyof typeof schedule.schedule]
        if (daySchedule && daySchedule.is_active) {
          for (const shift of template.shifts) {
            // Add service_id from first available service if not provided
            const shiftData = {
              ...shift,
              service_id: shift.service_id || (services.length > 0 ? services[0].id : '')
            }
            
            await weeklySchedulesApi.addShiftToDay(schedule._id, dayKey, shiftData)
          }
        }
      }

      // Reload schedule and close template modal
      await loadSchedule()
      onScheduleChange?.()
      setShowTemplates(false)
      toast.success('Template applied successfully')
    } catch (error: any) {
      console.error('Error applying template:', error)
      toast.error('Failed to apply template')
    }
  }

  const toggleDayActive = async (dayKey: string) => {
    if (!schedule?._id) return

    try {
      await weeklySchedulesApi.toggleDayStatus(schedule._id, dayKey)
      await loadSchedule()
      onScheduleChange?.()
      toast.success('Day status updated')
    } catch (error: any) {
      console.error('Error toggling day:', error)
      toast.error('Failed to update day status')
    }
  }

  const getServiceName = (serviceId: string) => {
    const serviceIdStr = extractServiceId(serviceId)
    const service = services.find(s => s.id === serviceIdStr)
    return service?.name || 'Unknown Service'
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
          <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Weekly Schedule Found</h3>
        <p className="text-gray-500 dark:text-neutral-400 mb-6">
          This care home doesn't have a weekly schedule configured yet.
        </p>
        {canEdit && (
          <Button
            variant="primary"
            onClick={createDefaultSchedule}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Weekly Schedule
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Weekly Schedule</h2>
          <p className="text-gray-600 dark:text-neutral-400 mt-1">
            Configure the standard shift patterns for each day of the week
          </p>
        </div>
        {canEdit && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              Templates
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSchedule}
            >
              Refresh
            </Button>
          </div>
        )}
      </div>

      {/* Schedule Grid */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
            <thead className="bg-gray-50 dark:bg-neutral-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                  Day
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                  Shifts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
              {dayNames.map(({ key, label }) => {
                const daySchedule = schedule.schedule[key as keyof typeof schedule.schedule]
                const isActive = daySchedule?.is_active || false
                const shifts = daySchedule?.shifts || []

                return (
                  <tr key={key} className={!isActive ? 'bg-gray-50 dark:bg-neutral-700' : ''}>
                    {/* Day Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${!isActive ? 'text-gray-400 dark:text-neutral-500' : 'text-gray-900 dark:text-neutral-100'}`}>
                          {label}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Badge
                          variant={isActive ? 'success' : 'secondary'}
                          className="text-xs"
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 p-1"
                            onClick={() => toggleDayActive(key)}
                          >
                            {isActive ? (
                              <EyeSlashIcon className="h-4 w-4 text-gray-500 dark:text-neutral-400" />
                            ) : (
                              <EyeIcon className="h-4 w-4 text-gray-500 dark:text-neutral-400" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>

                    {/* Shifts */}
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {shifts.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-neutral-400 italic">No shifts configured</p>
                        ) : (
                          shifts.map((shift, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between bg-gray-50 dark:bg-neutral-700 rounded-lg p-3 border border-gray-200 dark:border-neutral-600"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <ClockIcon className="h-4 w-4 text-gray-400 dark:text-neutral-500" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {shift.shift_type}
                                  </Badge>
                                  <div className="flex items-center space-x-1">
                                    <UserGroupIcon className="h-3 w-3 text-gray-400 dark:text-neutral-500" />
                                    <span className="text-xs text-gray-600 dark:text-neutral-400">
                                      {shift.required_staff_count}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-gray-600 dark:text-neutral-400">
                                  {typeof shift.service_id === 'string' ? getServiceName(shift.service_id) : shift.service_id.name}
                                  {shift.notes && (
                                    <span className="ml-2 text-gray-500 dark:text-neutral-500">• {shift.notes}</span>
                                  )}
                                </div>
                              </div>
                              {canEdit && (
                                <div className="flex space-x-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleEditShift(key, shift, index)}
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDeleteShift(key, index)}
                                  >
                                    <TrashIcon className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddShift(key)}
                          disabled={!isActive}
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Add Shift
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Configuration Modal */}
      <ShiftConfigModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSubmit={handleShiftSubmit}
        shift={selectedShift}
        services={services}
        isLoading={false}
      />

      {/* Template Library Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowTemplates(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl transform rounded-lg bg-white dark:bg-neutral-800 p-6 shadow-xl transition-all">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                  Shift Templates
                </h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Template Library */}
              <ShiftTemplateLibrary
                onApplyTemplate={handleApplyTemplate}
                disabled={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyScheduleEditor
