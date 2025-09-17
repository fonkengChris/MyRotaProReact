import React, { useState, useEffect } from 'react'
import { format,} from 'date-fns'
import Button from '@/components/ui/Button'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Home, Service, TimetableCreateRequest } from '@/types'

interface TimetableCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TimetableCreateRequest) => void
  homes: Home[]
  services: Service[]
}

const TimetableCreateModal: React.FC<TimetableCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  homes,
  services
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    home_ids: [] as string[],
    service_id: '',
    start_date: '',
    end_date: '',
    total_weeks: 4
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        home_ids: [],
        service_id: '',
        start_date: '',
        end_date: '',
        total_weeks: 4
      })
      setErrors({})
    }
  }, [isOpen])

  // Update end date when start date or total weeks change
  useEffect(() => {
    if (formData.start_date && formData.total_weeks > 0) {
      const startDate = new Date(formData.start_date)
      
      // Calculate end date using the formula: 6 days for first week, then 7n - 1 for subsequent weeks
      let totalDays = 0
      if (formData.total_weeks === 1) {
        totalDays = 6 // First week: 6 days
      } else {
        totalDays = 6 + (7 * formData.total_weeks - 1) // First week (6 days) + subsequent weeks (7n - 1)
      }
      
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + totalDays)
      
      setFormData(prev => ({
        ...prev,
        end_date: format(endDate, 'yyyy-MM-dd')
      }))
    }
  }, [formData.start_date, formData.total_weeks])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    if (formData.home_ids.length === 0) {
      newErrors.home_ids = 'At least one home must be selected'
    }

    if (!formData.service_id) {
      newErrors.service_id = 'Service is required'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (formData.total_weeks < 1 || formData.total_weeks > 52) {
      newErrors.total_weeks = 'Total weeks must be between 1 and 52'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      home_ids: formData.home_ids,
      service_id: formData.service_id,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_weeks: formData.total_weeks
    })
  }

  const handleHomeToggle = (homeId: string) => {
    setFormData(prev => ({
      ...prev,
      home_ids: prev.home_ids.includes(homeId)
        ? prev.home_ids.filter(id => id !== homeId)
        : [...prev.home_ids, homeId]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Create Timetable</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="p-2"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="form-label">
              Timetable Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter timetable name"
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter timetable description (optional)"
              rows={3}
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
          </div>

          {/* Homes Selection */}
          <div>
            <label className="form-label">
              Select Homes *
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
              {homes.map((home) => (
                <label key={home.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.home_ids.includes(home.id)}
                    onChange={() => handleHomeToggle(home.id)}
                    className="rounded border-gray-300 text-primary-600 dark:text-cyan-400 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">{home.name}</span>
                </label>
              ))}
            </div>
            {errors.home_ids && <p className="form-error">{errors.home_ids}</p>}
          </div>

          {/* Service Selection */}
          <div>
            <label htmlFor="service_id" className="form-label">
              Service *
            </label>
            <select
              id="service_id"
              value={formData.service_id}
              onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.service_id ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            {errors.service_id && <p className="form-error">{errors.service_id}</p>}
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="form-label">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.start_date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.start_date && <p className="form-error">{errors.start_date}</p>}
          </div>

          {/* Total Weeks */}
          <div>
            <label htmlFor="total_weeks" className="form-label">
              Total Weeks *
            </label>
            <input
              type="number"
              id="total_weeks"
              min="1"
              max="52"
              value={formData.total_weeks}
              onChange={(e) => setFormData(prev => ({ ...prev, total_weeks: parseInt(e.target.value) || 1 }))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                errors.total_weeks ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.total_weeks && <p className="form-error">{errors.total_weeks}</p>}
          </div>

          {/* End Date (Read-only) */}
          <div>
            <label htmlFor="end_date" className="form-label">
              End Date (Auto-calculated)
            </label>
            <input
              type="date"
              id="end_date"
              value={formData.end_date}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm bg-neutral-50 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Create Timetable
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TimetableCreateModal
