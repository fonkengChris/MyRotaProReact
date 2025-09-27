import React, { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, MapPinIcon, UsersIcon, ClockIcon, PhoneIcon, EnvelopeIcon, CalendarIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import HomeModal from '@/components/HomeModal'
import WeeklyScheduleModal from '@/components/WeeklyScheduleModal'
import { Home, Service } from '@/types'
import { homesApi, servicesApi } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth, usePermissions } from '@/hooks/useAuth'

const Homes: React.FC = () => {
  const { user: currentUser } = useAuth()
  const permissions = usePermissions()
  const [homes, setHomes] = useState<Home[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedHome, setSelectedHome] = useState<Home | null>(null)
  const [isWeeklyScheduleModalOpen, setIsWeeklyScheduleModalOpen] = useState(false)
  const [selectedHomeForSchedule, setSelectedHomeForSchedule] = useState<Home | null>(null)

  useEffect(() => {
    if (currentUser) {
      fetchData()
    }
  }, [currentUser])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      const [homesData, servicesData] = await Promise.all([
        homesApi.getAll(),
        servicesApi.getAll()
      ])
      
      setHomes(homesData || [])
      setServices(servicesData || [])
    } catch (error: any) {
      toast.error('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateHome = () => {
    setSelectedHome(null)
    setIsModalOpen(true)
  }

  const handleEditHome = (home: Home) => {
    setSelectedHome(home)
    setIsModalOpen(true)
  }

  const handleDeleteHome = async (homeId: string) => {
    if (window.confirm('Are you sure you want to delete this home? This action cannot be undone.')) {
      try {
        await homesApi.delete(homeId)
        toast.success('Home deleted successfully')
        fetchData()
      } catch (error) {
        toast.error('Failed to delete home')
      }
    }
  }

  const handleModalSuccess = () => {
    fetchData()
  }

  const handleWeeklySchedule = (home: Home) => {
    setSelectedHomeForSchedule(home)
    setIsWeeklyScheduleModalOpen(true)
  }

  const handleWeeklyScheduleSuccess = () => {
    // Refresh data if needed
    fetchData()
  }

  const getManagerName = (managerId: string | any) => {
    // If manager_id is populated (has name property), use it directly
    if (managerId && typeof managerId === 'object' && managerId.name) {
      return managerId.name
    }
    
    return 'Unknown Manager'
  }

  const getServiceCount = (homeId: string) => {
    return services.filter(service => service.home_ids.includes(homeId)).length
  }

  const formatOperatingHours = (start: string, end: string) => {
    return `${start} - ${end}`
  }

  // Check if user is authenticated
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Check permissions
  if (!permissions.canManageHomes) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mb-4">Access Denied</h2>
        <p className="text-gray-600 dark:text-neutral-400">
          You don't have permission to manage homes.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Homes</h1>
          <p className="text-gray-600 dark:text-neutral-400">Manage care homes and their settings</p>
        </div>
        <Button onClick={handleCreateHome}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Home
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {homes.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-xl shadow-lg p-12 text-center border border-gray-200 dark:border-neutral-700">
              <div className="text-gray-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No homes found</p>
              <p className="text-gray-500 dark:text-neutral-400 mb-4">Get started by creating your first care home</p>
              <Button onClick={handleCreateHome}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Home
              </Button>
            </div>
          </div>
        ) : (
          homes.map((home) => (
            <div key={home.id} className="bg-gradient-to-br from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800 group">
              {/* Colored header bar */}
              <div className={`h-1 w-full ${home.is_active ? 'bg-gradient-to-r from-green-400 to-blue-500' : 'bg-gradient-to-r from-red-400 to-orange-500'}`}></div>
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-1 truncate">{home.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 dark:text-neutral-400 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0 text-gray-500 dark:text-neutral-500" />
                      <span className="truncate">
                        {home.location.address}, {home.location.city} {home.location.postcode}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start space-x-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-2 min-w-0 hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:border-blue-700 transition-colors"
                      onClick={() => handleWeeklySchedule(home)}
                      title="Weekly Schedule"
                    >
                      <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-2 min-w-0 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20 dark:hover:border-green-700 transition-colors"
                      onClick={() => handleEditHome(home)}
                      title="Edit Home"
                    >
                      <PencilIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-2 min-w-0 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-700 transition-colors"
                      onClick={() => handleDeleteHome(home.id)}
                      title="Delete Home"
                    >
                      <TrashIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600 dark:text-neutral-400">
                    <UsersIcon className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                    <span>Capacity: {home.capacity} residents</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-neutral-400">
                    <ClockIcon className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                    <span>Hours: {formatOperatingHours(home.operating_hours.start, home.operating_hours.end)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-neutral-400">
                    <PhoneIcon className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    <span>{home.contact_info.phone}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 dark:text-neutral-400">
                    <EnvelopeIcon className="h-4 w-4 mr-2 text-orange-500 dark:text-orange-400" />
                    <span className="truncate">{home.contact_info.email}</span>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-neutral-400">
                    <span className="font-medium">Manager:</span> {getManagerName(home.manager_id)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      home.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {home.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-neutral-400">
                      {getServiceCount(home.id)} services
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <HomeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        home={selectedHome}
        onSuccess={handleModalSuccess}
      />

      <WeeklyScheduleModal
        isOpen={isWeeklyScheduleModalOpen}
        onClose={() => setIsWeeklyScheduleModalOpen(false)}
        homeId={selectedHomeForSchedule?.id || ''}
        homeName={selectedHomeForSchedule?.name || ''}
        onSuccess={handleWeeklyScheduleSuccess}
      />
    </div>
  )
}

export default Homes
