import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Home, ServiceUser, ServiceUserFormData, User } from '@/types'
import { serviceUsersApi } from '@/lib/api'
import toast from 'react-hot-toast'

interface ServiceUserModalProps {
  isOpen: boolean
  onClose: () => void
  serviceUser?: ServiceUser | null
  homes: Home[]
  keyWorkers: User[]
  onSuccess: () => void
}

// Populated refs come back as objects; plain ids as strings.
const refId = (ref: string | { id: string } | null | undefined): string =>
  !ref ? '' : typeof ref === 'string' ? ref : ref.id

const emptyForm: ServiceUserFormData = {
  name: '',
  home_id: '',
  key_worker_ids: [],
  notes: '',
  is_active: true
}

const fieldClass =
  'w-full rounded-md border border-neutral-400 dark:border-neutral-600 px-3 py-2 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

const ServiceUserModal: React.FC<ServiceUserModalProps> = ({
  isOpen,
  onClose,
  serviceUser,
  homes,
  keyWorkers,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ServiceUserFormData>(emptyForm)

  useEffect(() => {
    if (!isOpen) return
    if (serviceUser) {
      setFormData({
        name: serviceUser.name,
        home_id: refId(serviceUser.home_id),
        key_worker_ids: serviceUser.key_worker_ids.map(refId).filter(Boolean),
        notes: serviceUser.notes || '',
        is_active: serviceUser.is_active
      })
    } else {
      setFormData(emptyForm)
    }
  }, [isOpen, serviceUser])

  const toggleKeyWorker = (id: string) => {
    setFormData(prev => ({
      ...prev,
      key_worker_ids: prev.key_worker_ids.includes(id)
        ? prev.key_worker_ids.filter(k => k !== id)
        : [...prev.key_worker_ids, id]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.home_id) {
      toast.error('Please select the home they live in')
      return
    }

    setIsLoading(true)
    try {
      if (serviceUser) {
        await serviceUsersApi.update(serviceUser.id, formData)
        toast.success('Service user updated')
      } else {
        await serviceUsersApi.create(formData)
        toast.success('Service user created')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error(serviceUser ? 'Failed to update service user' : 'Failed to create service user')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-neutral-1000 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-neutral-800 text-left shadow-xl border border-neutral-200 dark:border-neutral-700 transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white dark:bg-neutral-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium leading-6 text-neutral-950 dark:text-neutral-100">
                {serviceUser ? 'Edit Service User' : 'Add Service User'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white dark:bg-neutral-800 text-neutral-500 hover:text-neutral-600 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                  Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Service user's name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                  Home *
                </label>
                <select
                  value={formData.home_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, home_id: e.target.value }))}
                  className={fieldClass}
                  required
                >
                  <option value="">Select a home</option>
                  {homes.map(home => (
                    <option key={home.id} value={home.id}>{home.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                  Key Workers
                </label>
                <div className="max-h-40 overflow-y-auto border border-neutral-400 dark:border-neutral-700 bg-white dark:bg-neutral-700/30 rounded-md p-2">
                  {keyWorkers.length === 0 ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">No active key workers yet.</p>
                  ) : (
                    keyWorkers.map(kw => (
                      <label key={kw.id} className="flex items-center mb-2 last:mb-0">
                        <input
                          type="checkbox"
                          checked={formData.key_worker_ids.includes(kw.id)}
                          onChange={() => toggleKeyWorker(kw.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-400 dark:border-neutral-600 rounded"
                        />
                        <span className="ml-2 text-sm text-neutral-800 dark:text-neutral-300">{kw.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Assigned key workers can view this home and the staff who work there.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  className={`${fieldClass} placeholder:text-neutral-500 dark:placeholder-neutral-400`}
                  placeholder="Optional notes"
                />
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-400 dark:border-neutral-600 rounded"
                />
                <span className="ml-2 text-sm text-neutral-800 dark:text-neutral-300">Active</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : serviceUser ? 'Save Changes' : 'Add Service User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceUserModal
