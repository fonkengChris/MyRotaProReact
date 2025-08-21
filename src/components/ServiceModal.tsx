import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Service, ServiceCategory, PriorityLevel, Skill } from '@/types'
import { homesApi, servicesApi } from '@/lib/api'
import { Home } from '@/types'
import toast from 'react-hot-toast'

interface ServiceModalProps {
  isOpen: boolean
  onClose: () => void
  service?: Service | null
  onSuccess: () => void
}

const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [homes, setHomes] = useState<Home[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    home_ids: [] as string[],
    category: 'personal_care' as ServiceCategory,
    required_skills: [] as Skill[],
    min_staff_count: 1,
    max_staff_count: 1,
    duration_hours: 1,
    is_24_hour: false,
    priority_level: 'medium' as PriorityLevel,
    is_active: true
  })

  const categoryOptions = [
    { value: 'personal_care', label: 'Personal Care' },
    { value: 'medical', label: 'Medical' },
    { value: 'domestic', label: 'Domestic' },
    { value: 'social', label: 'Social' },
    { value: 'specialist', label: 'Specialist' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ]

  const skillOptions = [
    { value: 'medication', label: 'Medication' },
    { value: 'personal_care', label: 'Personal Care' },
    { value: 'domestic_support', label: 'Domestic Support' },
    { value: 'social_support', label: 'Social Support' },
    { value: 'specialist_care', label: 'Specialist Care' }
  ]

  useEffect(() => {
    if (isOpen) {
      fetchHomes()
      if (service) {
        setFormData({
          name: service.name,
          description: service.description,
          home_ids: service.home_ids,
          category: service.category,
          required_skills: service.required_skills,
          min_staff_count: service.min_staff_count,
          max_staff_count: service.max_staff_count,
          duration_hours: service.duration_hours,
          is_24_hour: service.is_24_hour,
          priority_level: service.priority_level,
          is_active: service.is_active
        })
      } else {
        setFormData({
          name: '',
          description: '',
          home_ids: [],
          category: 'personal_care',
          required_skills: [],
          min_staff_count: 1,
          max_staff_count: 1,
          duration_hours: 1,
          is_24_hour: false,
          priority_level: 'medium',
          is_active: true
        })
      }
    }
  }, [isOpen, service])

  const fetchHomes = async () => {
    try {
      const homesData = await homesApi.getAll()
      setHomes(homesData)
    } catch (error) {
      toast.error('Failed to fetch homes')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSkillToggle = (skill: Skill) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.includes(skill)
        ? prev.required_skills.filter(s => s !== skill)
        : [...prev.required_skills, skill]
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required')
      return false
    }
    if (!formData.description.trim()) {
      toast.error('Service description is required')
      return false
    }
    if (formData.home_ids.length === 0) {
      toast.error('Please select at least one home')
      return false
    }
    if (formData.required_skills.length === 0) {
      toast.error('At least one skill is required')
      return false
    }
    if (formData.min_staff_count > formData.max_staff_count) {
      toast.error('Minimum staff count cannot exceed maximum staff count')
      return false
    }
    if (formData.duration_hours < 0.5 || formData.duration_hours > 24) {
      toast.error('Duration must be between 0.5 and 24 hours')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      if (service) {
        await servicesApi.update(service.id, formData)
        toast.success('Service updated successfully')
      } else {
        await servicesApi.create(formData)
        toast.success('Service created successfully')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(service ? 'Failed to update service' : 'Failed to create service')
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
                {service ? 'Edit Service' : 'Create New Service'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                    placeholder="Enter service name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Homes *
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {homes.map((home) => (
                      <label key={home.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={formData.home_ids.includes(home.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleInputChange('home_ids', [...formData.home_ids, home.id])
                            } else {
                              handleInputChange('home_ids', formData.home_ids.filter(id => id !== home.id))
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{home.name}</span>
                      </label>
                    ))}
                  </div>
                  {formData.home_ids.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">Please select at least one home</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter service description"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    required
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority_level}
                    onChange={(e) => handleInputChange('priority_level', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (hours) *
                  </label>
                  <Input
                    type="number"
                    value={formData.duration_hours}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('duration_hours', parseFloat(e.target.value))}
                    min="0.5"
                    max="24"
                    step="0.5"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Staff Count *
                  </label>
                  <Input
                    type="number"
                    value={formData.min_staff_count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('min_staff_count', parseInt(e.target.value))}
                    min="1"
                    max="20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Staff Count *
                  </label>
                  <Input
                    type="number"
                    value={formData.max_staff_count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('max_staff_count', parseInt(e.target.value))}
                    min="1"
                    max="50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required Skills *
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {skillOptions.map((skill) => (
                    <label key={skill.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.required_skills.includes(skill.value as Skill)}
                        onChange={() => handleSkillToggle(skill.value as Skill)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{skill.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_24_hour}
                    onChange={(e) => handleInputChange('is_24_hour', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">24-Hour Service</span>
                </label>

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
                  {isLoading ? 'Saving...' : (service ? 'Update Service' : 'Create Service')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceModal
