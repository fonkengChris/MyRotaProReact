import React, { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import ServiceModal from '@/components/ServiceModal'
import { Service, Home } from '@/types'
import { servicesApi, homesApi } from '@/lib/api'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([])
  const [homes, setHomes] = useState<Home[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedHome, setSelectedHome] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [servicesData, homesData] = await Promise.all([
        servicesApi.getAll(),
        homesApi.getAll()
      ])
      setServices(servicesData || [])
      setHomes(homesData || [])
    } catch (error) {
      toast.error('Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateService = () => {
    setSelectedService(null)
    setIsModalOpen(true)
  }

  const handleEditService = (service: Service) => {
    setSelectedService(service)
    setIsModalOpen(true)
  }

  const handleDeleteService = async (serviceId: string) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await servicesApi.delete(serviceId)
        toast.success('Service deleted successfully')
        fetchData()
      } catch (error) {
        toast.error('Failed to delete service')
      }
    }
  }

  const handleModalSuccess = () => {
    fetchData()
  }

  const filteredServices = selectedHome
    ? services.filter(service => service.home_ids.includes(selectedHome))
    : services

  const getHomeNames = (homeIds: string[]) => {
    return homeIds.map(homeId => {
      const home = homes.find(h => h.id === homeId)
      return home ? home.name : 'Unknown Home'
    }).join(', ')
  }

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      personal_care: 'Personal Care',
      medical: 'Medical',
      domestic: 'Domestic',
      social: 'Social',
      specialist: 'Specialist'
    }
    return categoryMap[category] || category
  }

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; className: string }> = {
      low: { label: 'Low', className: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      critical: { label: 'Critical', className: 'bg-red-100 text-red-800' }
    }
    const config = priorityMap[priority] || { label: priority, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Services</h1>
          <p className="text-gray-600">Manage care services for your homes</p>
        </div>
        <Button onClick={handleCreateService}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="home-filter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Filter by Home
              </label>
              <select
                id="home-filter"
                value={selectedHome}
                onChange={(e) => setSelectedHome(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-neutral-900 transition-colors dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Homes</option>
                {homes.map((home) => (
                  <option key={home.id} value={home.id}>
                    {home.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Service
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Home
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Staff Required
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                    <div className="flex flex-col items-center">
                      <div className="text-neutral-400 dark:text-neutral-500 mb-2">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">No services found</p>
                      <p className="text-neutral-500 dark:text-neutral-400">Get started by creating your first service</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{service.name}</div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                          {service.description}
                        </div>
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getHomeNames(service.home_ids)}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                      {getCategoryLabel(service.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                      {service.min_staff_count} - {service.max_staff_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                      {service.duration_hours}h
                      {service.is_24_hour && (
                        <span className="ml-1 text-xs text-blue-600">(24h)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(service.priority_level)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        service={selectedService}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}

export default Services
