import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserPlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UsersIcon,
  HomeIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { usersApi, homesApi } from '@/lib/api'
import { User, UserRole, Home, extractHomeId } from '@/types'
import toast from 'react-hot-toast'

const StaffManagement: React.FC = () => {
  const { user: currentUser } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'fulltime' | 'parttime' | 'bank'>('all')
  const [homeFilter, setHomeFilter] = useState<string>('all')
  const [selectedUserForHomeAllocation, setSelectedUserForHomeAllocation] = useState<User | null>(null)
  const [showHomeAllocationModal, setShowHomeAllocationModal] = useState(false)
  const [newHomeAllocation, setNewHomeAllocation] = useState<{
    homeId: string;
    isDefault: boolean;
  }>({ homeId: '', isDefault: false })

  // Fetch staff data
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', currentUser?.default_home_id],
    queryFn: () => usersApi.getAll({ 
      home_id: extractHomeId(currentUser?.default_home_id) // Only filter by home if user has one
    }),
    enabled: !!currentUser && (!!currentUser.default_home_id || ['admin', 'home_manager', 'senior_staff'].includes(currentUser.role)),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Fetch homes for allocation
  const { data: homes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    enabled: permissions.canAllocateHomes,
    select: (data) => Array.isArray(data) ? data : []
  })

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete staff member')
    }
  })

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Staff member status updated')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status')
    }
  })

  // Home allocation mutations
  const addHomeMutation = useMutation({
    mutationFn: ({ userId, homeId, isDefault }: { userId: string; homeId: string; isDefault: boolean }) => 
      usersApi.addHome(userId, { home_id: homeId, is_default: isDefault }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Home added successfully')
      setShowHomeAllocationModal(false)
      setSelectedUserForHomeAllocation(null)
      setNewHomeAllocation({ homeId: '', isDefault: false })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add home')
    }
  })

  const removeHomeMutation = useMutation({
    mutationFn: ({ userId, homeId }: { userId: string; homeId: string }) => 
      usersApi.removeHome(userId, homeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Home removed successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove home')
    }
  })

  const setDefaultHomeMutation = useMutation({
    mutationFn: ({ userId, homeId }: { userId: string; homeId: string }) => 
      usersApi.setDefaultHome(userId, { home_id: homeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] })
      toast.success('Default home updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update default home')
    }
  })

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && member.is_active) ||
                         (statusFilter === 'inactive' && !member.is_active)
    const matchesType = typeFilter === 'all' || member.type === typeFilter
    const matchesHome = homeFilter === 'all' || 
                       member.homes?.some(home => home.home_id === homeFilter)
    
    return matchesSearch && matchesRole && matchesStatus && matchesType && matchesHome
  })

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId)
    }
  }

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    if (window.confirm(`Are you sure you want to ${action} this staff member?`)) {
      toggleStatusMutation.mutate(userId)
    }
  }

  const handleHomeAllocation = (user: User) => {
    setSelectedUserForHomeAllocation(user)
    setNewHomeAllocation({ homeId: '', isDefault: false })
    setShowHomeAllocationModal(true)
  }

  const handleAddHome = () => {
    if (!selectedUserForHomeAllocation || !newHomeAllocation.homeId) return
    
    addHomeMutation.mutate({
      userId: selectedUserForHomeAllocation.id,
      homeId: newHomeAllocation.homeId,
      isDefault: newHomeAllocation.isDefault
    })
  }

  const handleRemoveHome = (userId: string, homeId: string, userName: string, homeName: string) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from ${homeName}?`)) {
      removeHomeMutation.mutate({ userId, homeId })
    }
  }

  const handleSetDefaultHome = (userId: string, homeId: string) => {
    setDefaultHomeMutation.mutate({ userId, homeId })
  }

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'danger'
      case 'home_manager': return 'primary'
      case 'senior_staff': return 'secondary'
      case 'support_worker': return 'success'
      default: return 'secondary'
    }
  }

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'home_manager': return 'Home Manager'
      case 'senior_staff': return 'Senior Staff'
      case 'support_worker': return 'Support Worker'
      default: return role
    }
  }

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'fulltime': return 'Full Time'
      case 'parttime': return 'Part Time'
      case 'bank': return 'Bank'
      default: return type
    }
  }

  const getHomeDisplayName = (homeId: string) => {
    if (!homes) return 'Unknown Home'
    const home = homes.find(h => h.id === homeId)
    return home ? home.name : 'Unknown Home'
  }

  const getHomeName = (homeId: string | undefined) => {
    if (!homeId || !homes) return 'No home allocated'
    const home = homes.find(h => h.id === homeId)
    return home ? `${home.name} - ${home.location.city}` : 'Unknown home'
  }

  const getUserHomes = (user: User) => {
    if (!user.homes || !homes) return []
    return user.homes.map(userHome => {
      const home = homes.find(h => h.id === userHome.home_id)
      return {
        ...userHome,
        home: home,
        name: home ? `${home.name} - ${home.location.city}` : 'Unknown home'
      }
    }).filter(userHome => userHome.home) // Only return homes that exist
  }

  const getAvailableHomes = (user: User) => {
    if (!homes) return []
    const userHomeIds = user.homes?.map(h => h.home_id) || []
    return homes.filter(home => !userHomeIds.includes(home.id))
  }

  if (!permissions.canManageUsers) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to manage staff members.
        </p>
      </div>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">
            Manage staff members, roles, and permissions
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                className="input"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="home_manager">Home Manager</option>
                <option value="senior_staff">Senior Staff</option>
                <option value="support_worker">Support Worker</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'fulltime' | 'parttime' | 'bank')}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="fulltime">Full Time</option>
                <option value="parttime">Part Time</option>
                <option value="bank">Bank</option>
              </select>
            </div>

            {/* Home Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Home
              </label>
              <select
                value={homeFilter}
                onChange={(e) => setHomeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Homes ({staff.length || 0})</option>
                {homes.map((home) => {
                  const homeStaffCount = staff.filter(member => 
                    member.homes?.some(h => h.home_id === home.id)
                  ).length || 0
                  return (
                    <option key={home.id} value={home.id}>
                      {home.name} ({homeStaffCount})
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                {filteredStaff.length} of {staff.length || 0} staff members
                {typeFilter !== 'all' && (
                  <span className="ml-2 text-primary-600">
                    • {typeFilter === 'fulltime' ? 'Full Time' : 
                       typeFilter === 'parttime' ? 'Part Time' : 
                       typeFilter === 'bank' ? 'Bank' : typeFilter}
                  </span>
                )}
                {homeFilter !== 'all' && homes && (
                  <span className="ml-2 text-primary-600">
                    • {getHomeDisplayName(homeFilter)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500">Filtered</span>
              {(searchTerm || roleFilter !== 'all' || typeFilter !== 'all' || homeFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setRoleFilter('all')
                    setTypeFilter('all')
                    setHomeFilter('all')
                    setStatusFilter('all')
                  }}
                  className="ml-2 text-xs h-6 px-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStaff.length === 0 ? (
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No staff members found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first staff member'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Staff Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Homes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">
                                {member.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {member.id.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleDisplayName(member.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {getTypeDisplayName(member.type)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                        <div className="text-sm text-gray-500">{member.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={member.is_active ? 'success' : 'danger'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {getUserHomes(member).map((userHome) => (
                            <div key={userHome.home_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                              <div className="flex items-center space-x-2">
                                <HomeIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {userHome.name}
                                </span>
                                {userHome.is_default && (
                                  <StarIcon className="h-4 w-4 text-yellow-500" title="Default home" />
                                )}
                                {permissions.canAllocateHomes && (
                                  <div className="flex space-x-1">
                                    {!userHome.is_default && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSetDefaultHome(member.id, userHome.home_id)}
                                        className="text-xs h-6 px-2"
                                        title="Set as default"
                                      >
                                        <StarIcon className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveHome(member.id, userHome.home_id, member.name, userHome.name)}
                                      className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                                      title="Remove from home"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {getUserHomes(member).length === 0 && (
                            <span className="text-sm text-gray-500">No homes allocated</span>
                          )}
                          {permissions.canAllocateHomes && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHomeAllocation(member)}
                              className="text-xs h-6 px-2"
                            >
                              <PlusIcon className="h-3 w-3 mr-1" />
                              Add Home
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {member.skills.slice(0, 2).map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              {skill.replace('_', ' ')}
                            </span>
                          ))}
                          {member.skills.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              +{member.skills.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleToggleStatus(member.id, member.is_active)}
                            title={member.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {member.is_active ? '🚫' : '✅'}
                          </Button>
                          {member.id !== currentUser?.id && (
                            <Button
                              variant="danger"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteUser(member.id, member.name)}
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Home Allocation Modal */}
      {showHomeAllocationModal && selectedUserForHomeAllocation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Manage Homes for {selectedUserForHomeAllocation.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Role: <Badge variant={getRoleBadgeVariant(selectedUserForHomeAllocation.role)} className="ml-1">
                  {getRoleDisplayName(selectedUserForHomeAllocation.role)}
                </Badge></span>
                <span>Type: <Badge variant="secondary" className="ml-1">
                  {getTypeDisplayName(selectedUserForHomeAllocation.type)}
                </Badge></span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Add new homes or manage existing allocations
              </p>
            </div>

            {/* Current Homes */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Current Homes</h4>
              <div className="space-y-2">
                {getUserHomes(selectedUserForHomeAllocation).map((userHome) => (
                  <div key={userHome.home_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <HomeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{userHome.name}</span>
                      {userHome.is_default && (
                        <Badge variant="success" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {!userHome.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefaultHome(selectedUserForHomeAllocation.id, userHome.home_id)}
                          className="text-xs h-6 px-2"
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveHome(selectedUserForHomeAllocation.id, userHome.home_id, selectedUserForHomeAllocation.name, userHome.name)}
                        className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {getUserHomes(selectedUserForHomeAllocation).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-3">No homes allocated yet</p>
                )}
              </div>
            </div>

            {/* Add New Home */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Home</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Home
                  </label>
                  <select
                    value={newHomeAllocation.homeId}
                    onChange={(e) => setNewHomeAllocation(prev => ({ ...prev, homeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Choose a home...</option>
                    {getAvailableHomes(selectedUserForHomeAllocation).map((home) => (
                      <option key={home.id} value={home.id}>
                        {home.name} - {home.location.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={newHomeAllocation.isDefault}
                    onChange={(e) => setNewHomeAllocation(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-700">
                    Set as default home
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowHomeAllocationModal(false)
                  setSelectedUserForHomeAllocation(null)
                  setNewHomeAllocation({ homeId: '', isDefault: false })
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={handleAddHome}
                disabled={!newHomeAllocation.homeId || addHomeMutation.isPending}
              >
                {addHomeMutation.isPending ? 'Adding...' : 'Add Home'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffManagement
