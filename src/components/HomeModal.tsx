import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Home, User, BreakPolicy, extractManagerId } from '@/types'
import { homesApi, usersApi } from '@/lib/api'
import { usePermissions } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

interface HomeModalProps {
  isOpen: boolean
  onClose: () => void
  home?: Home | null
  onSuccess: () => void
}

// Mirrors the server-side default in models/Home.js (8h+ → 0.5h, 12h+ → 1h).
const DEFAULT_BREAK_POLICY: BreakPolicy = {
  enabled: true,
  tiers: [
    { min_hours: 8, deduction_hours: 0.5 },
    { min_hours: 12, deduction_hours: 1 },
  ],
}

const HomeModal: React.FC<HomeModalProps> = ({
  isOpen,
  onClose,
  home,
  onSuccess
}) => {
  const permissions = usePermissions()
  const isAdmin = permissions.isAdmin
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
    break_policy: DEFAULT_BREAK_POLICY as BreakPolicy,
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
          manager_id: extractManagerId(home.manager_id) || '',
          contact_info: {
            phone: home.contact_info?.phone || '',
            email: home.contact_info?.email || ''
          },
          capacity: home.capacity,
          operating_hours: {
            start: home.operating_hours?.start || '',
            end: home.operating_hours?.end || ''
          },
          break_policy: home.break_policy
            ? {
                enabled: home.break_policy.enabled !== false,
                tiers: (home.break_policy.tiers || []).map((t) => ({ ...t })),
              }
            : { ...DEFAULT_BREAK_POLICY, tiers: DEFAULT_BREAK_POLICY.tiers.map((t) => ({ ...t })) },
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
          break_policy: { ...DEFAULT_BREAK_POLICY, tiers: DEFAULT_BREAK_POLICY.tiers.map((t) => ({ ...t })) },
          is_active: true
        })
      }
    }
  }, [isOpen, home])

  const fetchManagers = async () => {
    try {
      // A home can be managed by an admin or a key worker.
      const [admins, keyWorkers] = await Promise.all([
        usersApi.getAll({ role: 'admin' }),
        usersApi.getAll({ role: 'key_worker' })
      ])
      setManagers([...admins, ...keyWorkers])
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

  const handleBreakEnabledChange = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      break_policy: { ...prev.break_policy, enabled }
    }))
  }

  const handleTierChange = (index: number, field: 'min_hours' | 'deduction_hours', value: number) => {
    setFormData(prev => {
      const tiers = prev.break_policy.tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
      )
      return { ...prev, break_policy: { ...prev.break_policy, tiers } }
    })
  }

  const handleAddTier = () => {
    setFormData(prev => ({
      ...prev,
      break_policy: {
        ...prev.break_policy,
        tiers: [...prev.break_policy.tiers, { min_hours: 0, deduction_hours: 0 }]
      }
    }))
  }

  const handleRemoveTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      break_policy: {
        ...prev.break_policy,
        tiers: prev.break_policy.tiers.filter((_, i) => i !== index)
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
    
    if (!validateForm()) {
      return
    }
    setIsLoading(true)
    
    try {
      // Break policy is admin-only; non-admins never send it (server also enforces this).
      let payload: typeof formData | Omit<typeof formData, 'break_policy'> = formData
      if (!isAdmin) {
        const { break_policy, ...rest } = formData
        payload = rest
      }

      if (home) {
        await homesApi.update(home.id, payload)
        toast.success('Home updated successfully')
      } else {
        await homesApi.create(payload)
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
        <div className="fixed inset-0 bg-neutral-1000 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          <div className="bg-white dark:bg-neutral-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-100">
                {home ? 'Edit Home' : 'Create New Home'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-neutral-800 text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
                    Manager
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => handleInputChange('manager_id', e.target.value)}
                    className="w-full rounded-md border border-neutral-400 dark:border-neutral-600 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-neutral-950 dark:text-neutral-100"
                  >
                    <option value="">No manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.contact_info.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContactChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.contact_info.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleContactChange('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
                    Operating Hours Start
                  </label>
                  <Input
                    type="time"
                    value={formData.operating_hours.start}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOperatingHoursChange('start', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-300 mb-1">
                    Operating Hours End
                  </label>
                  <Input
                    type="time"
                    value={formData.operating_hours.end}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleOperatingHoursChange('end', e.target.value)}
                  />
                </div>
              </div>

              {/* Break deductions — admins only. Governs unpaid break hours removed
                  from payable time for this home. */}
              {isAdmin && (
                <div className="rounded-lg border border-neutral-300 dark:border-neutral-700 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-neutral-950 dark:text-neutral-100">
                      Break Deductions
                    </h4>
                    <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={formData.break_policy.enabled}
                        onChange={(e) => handleBreakEnabledChange(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-400 rounded"
                      />
                      Enabled
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                    Unpaid break hours deducted from a shift's paid time. The highest tier
                    whose minimum shift hours are met is applied.
                  </p>

                  {formData.break_policy.enabled && (
                    <div className="space-y-2">
                      {formData.break_policy.tiers.length === 0 && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          No tiers configured — no break will be deducted.
                        </p>
                      )}
                      {formData.break_policy.tiers.map((tier, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-400 mb-1">
                              Shift hours ≥
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.5"
                              value={tier.min_hours}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleTierChange(index, 'min_hours', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-400 mb-1">
                              Deduct (hours)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              max="24"
                              step="0.25"
                              value={tier.deduction_hours}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleTierChange(index, 'deduction_hours', parseFloat(e.target.value) || 0)
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveTier(index)}
                            className="mb-1 rounded-md p-2 text-neutral-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30"
                            aria-label="Remove tier"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add tier
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-400 rounded"
                  />
                  <span className="ml-2 text-sm text-neutral-800 dark:text-neutral-300">Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-300 dark:border-neutral-700">
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
