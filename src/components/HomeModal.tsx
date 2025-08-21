import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Home, User } from '@/types'
import { homesApi, usersApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface HomeModalProps {
  isOpen: boolean
  onClose: () => void
  home?: Home | null
  onSuccess: () => void
}

const HomeModal: React.FC<HomeModalProps> = ({
  isOpen,
  onClose,
  home,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [managers, setManagers] = useState<User[]>([])
  const [formData, setFormData] = useState({
    name: '',
    location: {
      address: '',
      city: '',
      postcode: ''
    },
    manager_id: '',
    contact_info: {
      phone: '',
      email: ''
    },
    capacity: 10,
    operating_hours: {
      start: '08:00',
      end: '18:00'
    },
    is_active: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchManagers()
      
      if (home) {
        setFormData({
          name: home.name,
          location: {
            address: home.location.address,
            city: home.location.city,
            postcode: home.location.postcode
          },
          manager_id: typeof home.manager_id === 'string' ? home.manager_id : home.manager_id.id,
          contact_info: {
            phone: home.contact_info.phone,
            email: home.contact_info.email
          },
          capacity: home.capacity,
          operating_hours: {
            start: home.operating_hours.start,
            end: home.operating_hours.end
          },
          is_active: home.is_active
        })
      } else {
        setFormData({
          name: '',
          location: {
            address: '',
            city: '',
            postcode: ''
          },
          manager_id: '',
          contact_info: {
            phone: '',
            email: ''
          },
          capacity: 10,
          operating_hours: {
            start: '08:00',
            end: '18:00'
          },
          is_active: true
        })
      }
    }
  }, [isOpen, home])

  const fetchManagers = async () => {
    try {
      const managersData = await usersApi.getAll({ role: 'home_manager' })
      setManagers(managersData)
    } catch (error: any) {
      toast.error('Failed to fetch managers')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleLocationChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }))
  }

  const handleContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contact_info: {
        ...prev.contact_info,
        [field]: value
      }
    }))
  }

  const handleOperatingHoursChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      operating_hours: {
        ...prev.operating_hours,
        [field]: value
      }
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Home name is required')
      return false
    }
    if (!formData.location.address.trim()) {
      toast.error('Address is required')
      return false
    }
    if (!formData.location.city.trim()) {
      toast.error('City is required')
      return false
    }
    if (!formData.location.postcode.trim()) {
      toast.error('Postcode is required')
      return false
    }
    if (!formData.manager_id) {
      toast.error('Please select a manager')
      return false
    }
    if (!formData.contact_info.phone.trim()) {
      toast.error('Phone number is required')
      return false
    }
    if (!formData.contact_info.email.trim()) {
      toast.error('Email is required')
      return false
    }
    if (formData.capacity < 1) {
      toast.error('Capacity must be at least 1')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Store form submission attempt in localStorage for debugging
    const submissionLog = {
      timestamp: new Date().toISOString(),
      action: home ? 'update' : 'create',
      formData,
      token: localStorage.getItem('token'),
      user: localStorage.getItem('user'),
      currentPath: window.location.pathname
    }
    localStorage.setItem('lastHomeSubmission', JSON.stringify(submissionLog))
    
    console.log('🚀 HomeModal: Form submission started')
    console.log('📝 HomeModal: Form data:', formData)
    console.log('🔐 HomeModal: Current token:', localStorage.getItem('token'))
    console.log('👤 HomeModal: Current user:', localStorage.getItem('user'))
    
    if (!validateForm()) {
      console.log('❌ HomeModal: Form validation failed')
      return
    }

    console.log('✅ HomeModal: Form validation passed')
    setIsLoading(true)
    
    try {
      if (home) {
        const result = await homesApi.update(home.id, formData)
        toast.success('Home updated successfully')
      } else {
        const result = await homesApi.create(formData)
        toast.success('Home created successfully')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      // Store error details in localStorage for debugging
      const errorLog = {
        timestamp: new Date().toISOString(),
        action: home ? 'update' : 'create',
        error: {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method
        },
        formData,
        token: localStorage.getItem('token'),
        user: localStorage.getItem('user')
      }
      localStorage.setItem('lastHomeSubmissionError', JSON.stringify(errorLog))
      
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please login again.')
      } else if (error.response?.status === 403) {
        toast.error('Insufficient permissions to manage homes.')
      } else {
        toast.error(home ? 'Failed to update home' : 'Failed to create home')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                {home ? 'Edit Home' : 'Create New Home'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Home Name *
                </label>
                                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                    placeholder="Enter home name"
                    required
                  />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <Input
                    type="text"
                    value={formData.location.address}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocationChange('address', e.target.value)}
                    placeholder="Enter address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <Input
                    type="text"
                    value={formData.location.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocationChange('city', e.target.value)}
                    placeholder="Enter city"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postcode *
                  </label>
                  <Input
                    type="text"
                    value={formData.location.postcode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocationChange('postcode', e.target.value)}
                    placeholder="Enter postcode"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager *
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => handleInputChange('manager_id', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Capacity *
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('capacity', parseInt(e.target.value))}
                    min="1"
                    max="1000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input
                    type="tel"
                    value={formData.contact_info.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContactChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContactChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operating Hours Start *
                  </label>
                  <Input
                    type="time"
                    value={formData.operating_hours.start}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOperatingHoursChange('start', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Operating Hours End *
                  </label>
                  <Input
                    type="time"
                    value={formData.operating_hours.end}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOperatingHoursChange('end', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (home ? 'Update Home' : 'Create Home')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeModal
