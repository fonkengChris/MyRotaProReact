import React, { useEffect, useMemo, useState } from 'react'
import { keyWorkerAccessApi } from '@/lib/api'
import { KEY_WORKER_ACCESS_GROUPS, keyWorkerAccessLabel } from '@/lib/keyWorkerAccess'
import { KeyWorkerAccess as Access } from '@/types'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { ArrowPathIcon, ExclamationTriangleIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// Admin page for what every key worker can reach. Individual exceptions are set on the
// person's staff record (see KeyWorkerAccessOverrides).

const ALWAYS_ADMIN_ONLY = [
  'Pay rates',
  'Granting the admin or key worker role, or changing the role of an admin or key worker',
  'Changing admin accounts, or removing a key worker',
  'Overriding rest and weekly-hours rules',
  'Timetables, Homes, AI Solver Rules and this page',
]

const KeyWorkerAccessPage: React.FC = () => {
  const [settings, setSettings] = useState<Access | null>(null)
  const [saved, setSaved] = useState<Access | null>(null)
  const [defaults, setDefaults] = useState<Access | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const apply = (data: { settings: Access; defaults: Access }) => {
    setSettings(data.settings)
    setSaved(data.settings)
    setDefaults(data.defaults)
  }

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      apply(await keyWorkerAccessApi.get())
    } catch (error: any) {
      setLoadError(error.response?.data?.error || 'Failed to load key worker access')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved])

  const onSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      apply(await keyWorkerAccessApi.update(settings))
      toast.success('Key worker access saved')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save key worker access')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!window.confirm('Reset key worker access to the defaults? Individual exceptions stay in place.')) return
    setSaving(true)
    try {
      apply(await keyWorkerAccessApi.reset())
      toast.success('Key worker access reset to defaults')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset key worker access')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (loadError || !settings || !defaults) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <p className="text-neutral-600 dark:text-neutral-300 mb-6">{loadError || 'Failed to load key worker access'}</p>
          <Button variant="primary" size="sm" onClick={load}>
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading-accent">Key Worker Access</h1>
          <p className="text-neutral-700 dark:text-neutral-300 mt-1">
            What every key worker can reach. Changes apply as soon as you save. To make an exception for one person, edit them on the Staff page.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onReset} disabled={saving}>
            Reset to defaults
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={saving} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>

      {KEY_WORKER_ACCESS_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle>{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`access-${field.key}`} className="form-label">
                    {field.label}
                  </label>
                  <select
                    id={`access-${field.key}`}
                    value={settings[field.key]}
                    onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value } as Access)}
                    className="input w-full"
                  >
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{field.help}</p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Default: {keyWorkerAccessLabel(field.key, defaults[field.key])}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Always admin-only</CardTitle>
          <CardDescription>These stay with admins at every access level.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ALWAYS_ADMIN_ONLY.map((item) => (
              <li key={item} className="flex gap-3">
                <LockClosedIcon className="h-5 w-5 shrink-0 text-neutral-400 mt-0.5" />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{item}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default KeyWorkerAccessPage
