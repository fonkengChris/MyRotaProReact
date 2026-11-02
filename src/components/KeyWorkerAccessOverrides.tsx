import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { keyWorkerAccessApi } from '@/lib/api'
import { KEY_WORKER_ACCESS_GROUPS, keyWorkerAccessLabel } from '@/lib/keyWorkerAccess'
import { KeyWorkerAccess, User } from '@/types'
import Button from '@/components/ui/Button'

// Admin-only exceptions to Key Worker Access for one key worker. Saves on its own, separately
// from the rest of the staff record.
const KeyWorkerAccessOverrides: React.FC<{ user: User }> = ({ user }) => {
  const queryClient = useQueryClient()
  const [overrides, setOverrides] = useState<Partial<KeyWorkerAccess>>(user.key_worker_access || {})

  const { data } = useQuery({
    queryKey: ['key-worker-access'],
    queryFn: () => keyWorkerAccessApi.get(),
  })

  const saveMutation = useMutation({
    mutationFn: () => keyWorkerAccessApi.setForUser(user.id, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success(`Access saved for ${user.name}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save access')
    },
  })

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
      <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Key worker access</h4>
      <p className="mt-1 mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        Exceptions for this person only. Everything else follows the Key Worker Access page.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KEY_WORKER_ACCESS_GROUPS.flatMap((group) => group.fields).map((field) => (
          <div key={field.key}>
            <label htmlFor={`override-${field.key}`} className="form-label">
              {field.label}
            </label>
            <select
              id={`override-${field.key}`}
              value={overrides[field.key] || ''}
              onChange={(e) => setOverrides((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="input w-full"
            >
              <option value="">
                {data ? `Use default (${keyWorkerAccessLabel(field.key, data.settings[field.key])})` : 'Use default'}
              </option>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save access'}
        </Button>
      </div>
    </div>
  )
}

export default KeyWorkerAccessOverrides
