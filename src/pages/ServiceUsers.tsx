import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  UserGroupIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PageHeader from '@/components/common/PageHeader'
import ServiceUserModal from '@/components/ServiceUserModal'
import { usePermissions } from '@/hooks/useAuth'
import { homesApi, serviceUsersApi, usersApi } from '@/lib/api'
import { BadgeVariant, Home, KeyWorkerCaseloadEntry, ServiceUser, UserRole } from '@/types'

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  key_worker: 'Key Worker',
  senior_staff: 'Senior Staff',
  support_worker: 'Support Worker'
}

const ROLE_BADGES: Record<UserRole, BadgeVariant> = {
  admin: 'danger',
  key_worker: 'primary',
  senior_staff: 'secondary',
  support_worker: 'success'
}

const selectClass =
  'w-full px-3 py-2 border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-neutral-900 transition-colors dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100'

const thClass = 'px-6 py-3 text-left text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-wider'

const homeName = (home: ServiceUser['home_id']) => (typeof home === 'string' ? '—' : home?.name || '—')

const ServiceUsers: React.FC = () => {
  const { isAdmin } = usePermissions()
  return isAdmin ? <AdminServiceUsers /> : <KeyWorkerCaseload />
}

// Admin view: manage every service user and who their key workers are.
const AdminServiceUsers: React.FC = () => {
  const queryClient = useQueryClient()
  const [homeFilter, setHomeFilter] = useState('')
  const [keyWorkerFilter, setKeyWorkerFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState<ServiceUser | null>(null)

  const { data: serviceUsers = [], isLoading } = useQuery({
    queryKey: ['serviceUsers', homeFilter, keyWorkerFilter],
    queryFn: () => serviceUsersApi.getAll({
      home_id: homeFilter || undefined,
      key_worker_id: keyWorkerFilter || undefined
    })
  })
  const { data: homes = [] } = useQuery({ queryKey: ['homes'], queryFn: () => homesApi.getAll() })
  const { data: keyWorkers = [] } = useQuery({
    queryKey: ['users', 'key_worker', 'active'],
    queryFn: () => usersApi.getAll({ role: 'key_worker', is_active: true })
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['serviceUsers'] })

  const openModal = (serviceUser: ServiceUser | null) => {
    setSelected(serviceUser)
    setIsModalOpen(true)
  }

  const handleDelete = async (serviceUser: ServiceUser) => {
    if (!window.confirm(`Delete ${serviceUser.name}? Their key workers will lose access to this home through them.`)) return
    try {
      await serviceUsersApi.delete(serviceUser.id)
      toast.success('Service user deleted')
      refresh()
    } catch (error) {
      toast.error('Failed to delete service user')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Users"
        subtitle="People we support, where they live, and their key workers"
        actions={
          <Button onClick={() => openModal(null)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Service User
          </Button>
        }
      />

      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="su-home-filter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Filter by Home
            </label>
            <select id="su-home-filter" value={homeFilter} onChange={(e) => setHomeFilter(e.target.value)} className={selectClass}>
              <option value="">All Homes</option>
              {homes.map(home => <option key={home.id} value={home.id}>{home.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="su-kw-filter" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Filter by Key Worker
            </label>
            <select id="su-kw-filter" value={keyWorkerFilter} onChange={(e) => setKeyWorkerFilter(e.target.value)} className={selectClass}>
              <option value="">All Key Workers</option>
              {keyWorkers.map(kw => <option key={kw.id} value={kw.id}>{kw.name}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
              <thead className="bg-neutral-100 dark:bg-neutral-700">
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Home</th>
                  <th className={thClass}>Key Workers</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                {serviceUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                      No service users found
                    </td>
                  </tr>
                ) : (
                  serviceUsers.map(su => (
                    <tr key={su.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{su.name}</div>
                        {su.notes && (
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">{su.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{homeName(su.home_id)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-700 dark:text-neutral-300">
                        {su.key_worker_ids.length === 0
                          ? <span className="text-neutral-500 dark:text-neutral-400">Unassigned</span>
                          : su.key_worker_ids.map(kw => (typeof kw === 'string' ? kw : kw.name)).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={su.is_active ? 'success' : 'neutral'}>{su.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openModal(su)} aria-label={`Edit ${su.name}`}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => handleDelete(su)} aria-label={`Delete ${su.name}`}>
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
        )}
      </div>

      <ServiceUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serviceUser={selected}
        homes={homes}
        keyWorkers={keyWorkers}
        onSuccess={refresh}
      />
    </div>
  )
}

// Key worker view: each home their service users live in, with home details and staff.
const KeyWorkerCaseload: React.FC = () => {
  const { data: caseload = [], isLoading } = useQuery({
    queryKey: ['serviceUsers', 'my-caseload'],
    queryFn: () => serviceUsersApi.getMyCaseload()
  })

  const totalServiceUsers = useMemo(
    () => caseload.reduce((sum, entry) => sum + entry.service_users.length, 0),
    [caseload]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Service Users"
        subtitle={
          caseload.length === 0
            ? 'The people you support, where they live, and the staff in those homes'
            : `You support ${totalServiceUsers} ${totalServiceUsers === 1 ? 'person' : 'people'} across ${caseload.length} ${caseload.length === 1 ? 'home' : 'homes'}`
        }
      />

      {caseload.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <HeartIcon className="mx-auto h-12 w-12 text-neutral-400 dark:text-neutral-500" />
          <p className="mt-2 text-lg font-medium text-neutral-900 dark:text-neutral-100">No service users assigned yet</p>
          <p className="text-neutral-500 dark:text-neutral-400">An admin can assign you as key worker for the people you support.</p>
        </div>
      ) : (
        caseload.map(entry => <CaseloadHomeCard key={entry.home.id} entry={entry} />)
      )}
    </div>
  )
}

const CaseloadHomeCard: React.FC<{ entry: KeyWorkerCaseloadEntry }> = ({ entry }) => {
  const { home, service_users, staff } = entry
  return (
    <section className="bg-white dark:bg-neutral-800 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
      <HomeDetails home={home} />

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-neutral-700">
        <div className="p-6">
          <h3 className="flex items-center text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            <HeartIcon className="h-4 w-4 mr-2" />
            Your service users ({service_users.length})
          </h3>
          <ul className="space-y-3">
            {service_users.map(su => (
              <li key={su.id}>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{su.name}</div>
                {su.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400">{su.notes}</p>}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 lg:col-span-2">
          <h3 className="flex items-center text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Staff in this home ({staff.length})
          </h3>
          {staff.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No staff are assigned to this home.</p>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {staff.map(member => (
                <li key={member.id} className="py-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{member.name}</span>
                    <Badge variant={ROLE_BADGES[member.role]}>{ROLE_LABELS[member.role] || member.role}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="inline-flex items-center hover:underline">
                        <PhoneIcon className="h-4 w-4 mr-1" />{member.phone}
                      </a>
                    )}
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="inline-flex items-center hover:underline break-all">
                        <EnvelopeIcon className="h-4 w-4 mr-1 flex-shrink-0" />{member.email}
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

const HomeDetails: React.FC<{ home: Home }> = ({ home }) => (
  <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{home.name}</h2>
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300">
      {home.location && (
        <span className="inline-flex items-center">
          <MapPinIcon className="h-4 w-4 mr-1" />
          {[home.location.address, home.location.city, home.location.postcode].filter(Boolean).join(', ')}
        </span>
      )}
      {home.contact_info?.phone && (
        <a href={`tel:${home.contact_info.phone}`} className="inline-flex items-center hover:underline">
          <PhoneIcon className="h-4 w-4 mr-1" />{home.contact_info.phone}
        </a>
      )}
      {home.contact_info?.email && (
        <a href={`mailto:${home.contact_info.email}`} className="inline-flex items-center hover:underline">
          <EnvelopeIcon className="h-4 w-4 mr-1" />{home.contact_info.email}
        </a>
      )}
      {home.operating_hours && (
        <span className="inline-flex items-center">
          <ClockIcon className="h-4 w-4 mr-1" />
          {home.operating_hours.start} – {home.operating_hours.end}
        </span>
      )}
    </div>
  </div>
)

export default ServiceUsers
