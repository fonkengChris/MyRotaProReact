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
    console.log('📊 Homes: fetchData started')
    console.log('🔐 Homes: Token for fetchData:', localStorage.getItem('token'))
    
    try {
      setIsLoading(true)
      console.log('📤 Homes: Fetching homes and services...')
      
      const [homesData, servicesData] = await Promise.all([
        homesApi.getAll(),
        servicesApi.getAll()
      ])
      
      console.log('✅ Homes: Data fetched successfully')
      console.log('🏠 Homes: Homes data:', homesData)
      console.log('🔧 Homes: Services data:', servicesData)
      
      setHomes(homesData)
      setServices(servicesData)
    } catch (error: any) {
      console.error('❌ Homes: Failed to fetch data:', error)
      console.error('❌ Homes: Error response:', error.response)
      console.error('❌ Homes: Error status:', error.response?.status)
      toast.error('Failed to fetch data')
    } finally {
      console.log('🏁 Homes: fetchData completed')
      setIsLoading(false)
    }
  }

  const handleCreateHome = () => {
    console.log('🏠 Homes: Create home button clicked')
    console.log('🔐 Homes: Current token:', localStorage.getItem('token'))
    console.log('👤 Homes: Current user:', currentUser)
    console.log('🔑 Homes: User permissions:', permissions)
    
    setSelectedHome(null)
    setIsModalOpen(true)
    console.log('🚪 Homes: Modal opened for home creation')
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
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">
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
          <h1 className="text-2xl font-bold text-gray-900">Homes</h1>
          <p className="text-gray-600">Manage care homes and their settings</p>
        </div>
        <Button onClick={handleCreateHome}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Home
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {homes.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">No homes found</p>
              <p className="text-gray-500 mb-4">Get started by creating your first care home</p>
              <Button onClick={handleCreateHome}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Home
              </Button>
            </div>
          </div>
        ) : (
          homes.map((home) => (
            <div key={home.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{home.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span className="truncate">
                        {home.location.address}, {home.location.city} {home.location.postcode}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleWeeklySchedule(home)}
                      title="Weekly Schedule"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditHome(home)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteHome(home.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Capacity: {home.capacity} residents</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>Hours: {formatOperatingHours(home.operating_hours.start, home.operating_hours.end)}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{home.contact_info.phone}</span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="truncate">{home.contact_info.email}</span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Manager:</span> {getManagerName(home.manager_id)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      home.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {home.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-gray-500">
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
