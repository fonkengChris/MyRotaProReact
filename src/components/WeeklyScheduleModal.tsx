import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon, ClockIcon, UsersIcon, TagIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WeeklySchedule, WeeklyScheduleShift, Service, extractServiceId } from '@/types'
import { weeklySchedulesApi, servicesApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface WeeklyScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  homeId: string
  homeName: string
  onSuccess: () => void
}

const WeeklyScheduleModal: React.FC<WeeklyScheduleModalProps> = ({
  isOpen,
  onClose,
  homeId,
  homeName,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [schedule, setSchedule] = useState<WeeklySchedule | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, homeId])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [servicesData, existingSchedule] = await Promise.all([
        servicesApi.getAll({ home_id: homeId }),
        weeklySchedulesApi.getByHome(homeId).catch(() => null)
      ])
      
      setServices(servicesData)
      
      if (existingSchedule) {
        setSchedule(existingSchedule)
        setIsCreating(false)
      } else {
        // Create empty schedule structure
        const emptySchedule: Partial<WeeklySchedule> = {
          home_id: homeId,
          schedule: {
            monday: { is_active: true, shifts: [] },
            tuesday: { is_active: true, shifts: [] },
            wednesday: { is_active: true, shifts: [] },
            thursday: { is_active: true, shifts: [] },
            friday: { is_active: true, shifts: [] },
            saturday: { is_active: true, shifts: [] },
            sunday: { is_active: true, shifts: [] }
          },
          is_active: true
        }
        setSchedule(emptySchedule as WeeklySchedule)
        setIsCreating(true)
      }
    } catch (error: any) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleDay = async (dayName: string) => {
    if (!schedule) return
    
    try {
      if (isCreating) {
        // Update local state for new schedules
        setSchedule(prev => prev ? {
          ...prev,
          schedule: {
            ...prev.schedule,
            [dayName]: {
              ...prev.schedule[dayName as keyof typeof prev.schedule],
              is_active: !prev.schedule[dayName as keyof typeof prev.schedule].is_active
            }
          }
        } : null)
      } else {
        // Update existing schedule
        const updatedSchedule = await weeklySchedulesApi.toggleDayStatus(schedule.id, dayName)
        setSchedule(updatedSchedule)
        toast.success(`${dayName.charAt(0).toUpperCase() + dayName.slice(1)} status updated`)
      }
    } catch (error: any) {
      toast.error('Failed to update day status')
    }
  }

  const handleAddShift = (dayName: string) => {
    if (!schedule) return
    
    const newShift: WeeklyScheduleShift = {
      service_id: '',
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'morning',
      required_staff_count: 1,
      notes: ''
    }

    setSchedule(prev => prev ? {
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayName]: {
          ...prev.schedule[dayName as keyof typeof prev.schedule],
          shifts: [...prev.schedule[dayName as keyof typeof prev.schedule].shifts, newShift]
        }
      }
    } : null)
  }

  const handleRemoveShift = (dayName: string, shiftIndex: number) => {
    if (!schedule) return
    
    if (isCreating) {
      // Remove from local state for new schedules
      setSchedule(prev => prev ? {
        ...prev,
        schedule: {
          ...prev.schedule,
          [dayName]: {
            ...prev.schedule[dayName as keyof typeof prev.schedule],
            shifts: prev.schedule[dayName as keyof typeof prev.schedule].shifts.filter((_, index) => index !== shiftIndex)
          }
        }
      } : null)
    } else {
      // Remove from existing schedule
      weeklySchedulesApi.removeShiftFromDay(schedule.id, dayName, shiftIndex)
        .then(updatedSchedule => {
          setSchedule(updatedSchedule)
          toast.success('Shift removed')
        })
        .catch(() => toast.error('Failed to remove shift'))
    }
  }

  const handleShiftChange = (dayName: string, shiftIndex: number, field: keyof WeeklyScheduleShift, value: any) => {
    if (!schedule) return
    
    setSchedule(prev => prev ? {
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayName]: {
          ...prev.schedule[dayName as keyof typeof prev.schedule],
          shifts: prev.schedule[dayName as keyof typeof prev.schedule].shifts.map((shift, index) => 
            index === shiftIndex ? { ...shift, [field]: value } : shift
          )
        }
      }
    } : null)
  }

  const handleSave = async () => {
    if (!schedule) return
    
    try {
      setIsLoading(true)
      
      if (isCreating) {
        await weeklySchedulesApi.create(schedule)
        toast.success('Weekly schedule created successfully')
      } else {
        await weeklySchedulesApi.update(schedule.id, schedule)
        toast.success('Weekly schedule updated successfully')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Failed to save schedule:', error)
      toast.error('Failed to save weekly schedule')
    } finally {
      setIsLoading(false)
    }
  }

  const getServiceName = (serviceId: string) => {
    if (typeof serviceId === 'object' && serviceId.name) {
      return serviceId.name
    }
    const service = services.find(s => s.id === serviceId)
    return service ? service.name : 'Unknown Service'
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl">
          <div className="bg-white dark:bg-neutral-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-neutral-100">
                Weekly Schedule - {homeName}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-neutral-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {days.map((dayName) => {
                  const day = schedule?.schedule[dayName as keyof typeof schedule.schedule]
                  if (!day) return null

                  return (
                    <div key={dayName} className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-md font-medium text-gray-900 dark:text-neutral-100 capitalize">
                            {dayName}
                          </h4>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={day.is_active}
                              onChange={() => handleToggleDay(dayName)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-neutral-300">Active</span>
                          </label>
                        </div>
                        <Button
                          onClick={() => handleAddShift(dayName)}
                          disabled={!day.is_active}
                          size="sm"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add Shift
                        </Button>
                      </div>

                      {day.is_active && (
                        <div className="space-y-3">
                          {day.shifts.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-neutral-400 italic">No shifts scheduled</p>
                          ) : (
                            day.shifts.map((shift, shiftIndex) => (
                              <div key={shiftIndex} className="bg-gray-50 dark:bg-neutral-700 rounded-md p-3">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                  {/* Service */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                      Service
                                    </label>
                                    <select
                                      value={extractServiceId(shift.service_id) || ''}
                                      onChange={(e) => handleShiftChange(dayName, shiftIndex, 'service_id', e.target.value)}
                                      className="w-full rounded-md border border-gray-300 dark:border-neutral-600 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                                    >
                                      <option value="">Select Service</option>
                                      {services.map((service) => (
                                        <option key={service.id} value={service.id}>
                                          {service.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Start Time */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                      Start Time
                                    </label>
                                    <Input
                                      type="time"
                                      value={shift.start_time}
                                      onChange={(e) => handleShiftChange(dayName, shiftIndex, 'start_time', e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>

                                  {/* End Time */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                      End Time
                                    </label>
                                    <Input
                                      type="time"
                                      value={shift.end_time}
                                      onChange={(e) => handleShiftChange(dayName, shiftIndex, 'end_time', e.target.value)}
                                      className="text-sm"
                                    />
                                  </div>

                                  {/* Shift Type */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={shift.shift_type}
                                      onChange={(e) => handleShiftChange(dayName, shiftIndex, 'shift_type', e.target.value)}
                                      className="w-full rounded-md border border-gray-300 dark:border-neutral-600 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100"
                                    >
                                      <option value="morning">Morning</option>
                                      <option value="afternoon">Afternoon</option>
                                      <option value="evening">Evening</option>
                                      <option value="night">Night</option>
                                      <option value="overtime">Overtime</option>
                                      <option value="long_day">Long Day</option>
                                      <option value="split">Split</option>
                                    </select>
                                  </div>

                                  {/* Staff Count */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                      Staff Count
                                    </label>
                                    <Input
                                      type="number"
                                      value={shift.required_staff_count}
                                      onChange={(e) => handleShiftChange(dayName, shiftIndex, 'required_staff_count', parseInt(e.target.value))}
                                      min="1"
                                      max="50"
                                      className="text-sm"
                                    />
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-end">
                                    <Button
                                      onClick={() => handleRemoveShift(dayName, shiftIndex)}
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Notes */}
                                <div className="mt-3">
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Notes
                                  </label>
                                  <Input
                                    type="text"
                                    value={shift.notes || ''}
                                    onChange={(e) => handleShiftChange(dayName, shiftIndex, 'notes', e.target.value)}
                                    placeholder="Optional notes..."
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : (isCreating ? 'Create Schedule' : 'Update Schedule')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyScheduleModal
