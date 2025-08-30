import React, { useState, useEffect } from 'react'
import { XMarkIcon, ClockIcon, UserGroupIcon, TagIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Service } from '@/types'

interface ShiftConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (shiftData: any) => void
  shift?: any
  services: Service[]
  isLoading?: boolean
}

const ShiftConfigModal: React.FC<ShiftConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  shift,
  services,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    service_id: '',
    start_time: '08:00',
    end_time: '16:00',
    shift_type: 'morning',
    required_staff_count: 1,
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when editing existing shift
  useEffect(() => {
    if (shift) {
      setFormData({
        service_id: shift.service_id || '',
        start_time: shift.start_time || '08:00',
        end_time: shift.end_time || '16:00',
        shift_type: shift.shift_type || 'morning',
        required_staff_count: shift.required_staff_count || 1,
        notes: shift.notes || ''
      })
    } else {
      // Reset form for new shift
      setFormData({
        service_id: services.length > 0 ? services[0].id : '',
        start_time: '08:00',
        end_time: '16:00',
        shift_type: 'morning',
        required_staff_count: 1,
        notes: ''
      })
    }
    setErrors({})
  }, [shift, services])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.service_id) {
      newErrors.service_id = 'Service is required'
    }

    if (!formData.start_time) {
      newErrors.start_time = 'Start time is required'
    }

    if (!formData.end_time) {
      newErrors.end_time = 'End time is required'
    }

    if (formData.start_time === formData.end_time) {
      newErrors.end_time = 'End time must be different from start time'
    }

    if (formData.required_staff_count < 1) {
      newErrors.required_staff_count = 'Required staff count must be at least 1'
    }

    if (formData.required_staff_count > 50) {
      newErrors.required_staff_count = 'Required staff count cannot exceed 50'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-md transform rounded-lg bg-white p-6 shadow-xl transition-all">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {shift ? 'Edit Shift' : 'Add New Shift'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={formData.service_id}
                onChange={(e) => handleInputChange('service_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                  errors.service_id ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={services.length === 0}
              >
                <option value="">Select a service...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              {errors.service_id && (
                <p className="mt-1 text-sm text-red-600">{errors.service_id}</p>
              )}
              {services.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">No services available</p>
              )}
            </div>

            {/* Time Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ClockIcon className="inline h-4 w-4 mr-1" />
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    errors.start_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.start_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.start_time}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ClockIcon className="inline h-4 w-4 mr-1" />
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    errors.end_time ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.end_time && (
                  <p className="mt-1 text-sm text-red-600">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Shift Type and Staff Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <TagIcon className="inline h-4 w-4 mr-1" />
                  Shift Type
                </label>
                <select
                  value={formData.shift_type}
                  onChange={(e) => handleInputChange('shift_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="morning">Morning</option>
                  <option value="day">Day</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="overtime">Overtime</option>
                  <option value="long_day">Long Day</option>
                  <option value="split">Split</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <UserGroupIcon className="inline h-4 w-4 mr-1" />
                  Staff Required
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.required_staff_count}
                  onChange={(e) => handleInputChange('required_staff_count', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    errors.required_staff_count ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.required_staff_count && (
                  <p className="mt-1 text-sm text-red-600">{errors.required_staff_count}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add any additional notes about this shift..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.notes.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
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
                variant="primary"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : (shift ? 'Update Shift' : 'Add Shift')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ShiftConfigModal
