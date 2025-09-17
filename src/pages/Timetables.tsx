import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  PlusIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { timetablesApi, homesApi, servicesApi } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { Timetable, TimetableCreateRequest } from '@/types'
import TimetableCreateModal from '@/components/TimetableCreateModal'
import TimetableViewModal from '@/components/TimetableViewModal'

const Timetables: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth()
  const permissions = usePermissions()
  const queryClient = useQueryClient()
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null)
  
  // Fetch timetables
  const { data: timetables = [], isLoading: timetablesLoading, refetch: refetchTimetables, error: timetablesError } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetablesApi.getAll(),
    select: (data) => Array.isArray(data) ? data : [],
    enabled: !!user, // Only run query if user is authenticated
  })
  
  // Fetch homes for create modal
  const { data: homes = [] } = useQuery({
    queryKey: ['homes'],
    queryFn: () => homesApi.getAll(),
    select: (data) => Array.isArray(data) ? data : []
  })
  
  // Fetch services for create modal
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll(),
    select: (data) => Array.isArray(data) ? data : []
  })

  // Handle create timetable
  const handleCreateTimetable = async (data: TimetableCreateRequest) => {
    try {
      await timetablesApi.create(data)
      toast.success('Timetable created successfully')
      setIsCreateModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create timetable')
    }
  }

  // Handle generate timetable
  const handleGenerateTimetable = async (timetable: Timetable) => {
    try {
      toast.loading('Starting timetable generation...')
      await timetablesApi.generate(timetable.id)
      toast.dismiss()
      toast.success('Timetable generation started. Check status for progress.')
      
      // Start polling for status updates
      pollGenerationStatus(timetable.id)
      
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
    } catch (error: any) {
      toast.dismiss()
      toast.error(error.response?.data?.error || 'Failed to start timetable generation')
    }
  }

  // Poll generation status
  const pollGenerationStatus = async (timetableId: string) => {
    const maxPolls = 60 // Poll for up to 5 minutes (60 * 5 seconds)
    let polls = 0
    
    const poll = async () => {
      try {
        const status = await timetablesApi.getStatus(timetableId)
        
        if (status.status === 'generated') {
          toast.success('Timetable generation completed successfully!')
          queryClient.invalidateQueries({ queryKey: ['timetables'] })
          return
        } else if (status.status === 'draft' && status.generation_errors.length > 0) {
          toast.error(`Timetable generation failed: ${status.generation_errors[0].error}`)
          queryClient.invalidateQueries({ queryKey: ['timetables'] })
          return
        }
        
        // Continue polling if still generating
        if (status.status === 'generating' && polls < maxPolls) {
          polls++
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else if (polls >= maxPolls) {
          toast.error('Timetable generation is taking longer than expected. Please check manually.')
        }
      } catch (error: any) {
        console.error('Error polling generation status:', error)
        
        // Handle specific error cases
        if (error.response?.status === 404) {
          toast.error('Timetable not found. It may have been deleted.')
          return // Stop polling
        } else if (error.response?.status === 403) {
          toast.error('Access denied to timetable.')
          return // Stop polling
        } else {
          toast.error('Error checking generation status')
        }
      }
    }
    
    poll()
  }

  // Handle publish timetable
  const handlePublishTimetable = async (timetable: Timetable) => {
    try {
      await timetablesApi.publish(timetable.id)
      toast.success('Timetable published successfully')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to publish timetable')
    }
  }

  // Handle archive timetable
  const handleArchiveTimetable = async (timetable: Timetable) => {
    try {
      await timetablesApi.archive(timetable.id)
      toast.success('Timetable archived successfully')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to archive timetable')
    }
  }

  // Handle delete timetable
  const handleDeleteTimetable = async (timetable: Timetable) => {
    if (!window.confirm(`Are you sure you want to delete the timetable "${timetable.name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      await timetablesApi.delete(timetable.id)
      toast.success('Timetable deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['timetables'] })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete timetable')
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary'
      case 'generating': return 'warning'
      case 'generated': return 'primary'
      case 'published': return 'success'
      case 'archived': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <DocumentArrowDownIcon className="h-4 w-4" />
      case 'generating': return <ArrowPathIcon className="h-4 w-4 animate-spin" />
      case 'generated': return <CheckCircleIcon className="h-4 w-4" />
      case 'published': return <CheckCircleIcon className="h-4 w-4" />
      case 'archived': return <XCircleIcon className="h-4 w-4" />
      default: return <DocumentArrowDownIcon className="h-4 w-4" />
    }
  }

  if (authLoading || timetablesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (timetablesError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Timetables</h1>
            <p className="text-gray-600 mt-1">
              Generate and manage immutable multi-week rotas
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-16 w-16 text-red-400 mb-4">
              <ExclamationTriangleIcon className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">Error Loading Timetables</h3>
            <p className="text-gray-500 mb-6">
              {timetablesError instanceof Error ? timetablesError.message : 'An unexpected error occurred'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => refetchTimetables()}
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Timetables</h1>
          <p className="text-gray-600 mt-1">
            Generate and manage immutable multi-week rotas
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchTimetables()}
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          {permissions.canManageRotas && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Timetable
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {timetables.filter(t => t.status === 'published').length}
              </p>
              <p className="text-sm text-gray-600">Published</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-warning-600">
                {timetables.filter(t => t.status === 'generating').length}
              </p>
              <p className="text-sm text-gray-600">Generating</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary-600">
                {timetables.filter(t => t.status === 'draft').length}
              </p>
              <p className="text-sm text-gray-600">Draft</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success-600">
                {timetables.reduce((total, t) => total + t.total_weeks, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Weeks</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timetables List */}
      {timetables.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <CalendarIcon className="h-16 w-16" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Timetables</h3>
            <p className="text-gray-500 mb-6">
              Create your first timetable to generate immutable multi-week rotas.
            </p>
            {permissions.canManageRotas && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Timetable
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetables.map((timetable) => (
            <Card key={timetable.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{timetable.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {timetable.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(timetable.status)} className="ml-2">
                    {getStatusIcon(timetable.status)}
                    <span className="ml-1 capitalize">{timetable.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Date Range */}
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {format(parseISO(timetable.start_date), 'MMM d, yyyy')} - {format(parseISO(timetable.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  {/* Weeks */}
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    <span>{timetable.total_weeks} weeks</span>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-semibold text-gray-900 dark:text-neutral-100">{timetable.total_shifts}</p>
                      <p className="text-gray-600">Shifts</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-semibold text-gray-900 dark:text-neutral-100">{timetable.total_hours}</p>
                      <p className="text-gray-600">Hours</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="font-semibold text-gray-900 dark:text-neutral-100">{timetable.total_assignments}</p>
                      <p className="text-gray-600">Assignments</p>
                    </div>
                  </div>
                  
                  {/* Conflicts Warning */}
                  {timetable.conflicts_detected > 0 && (
                    <div className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                      <span>{timetable.conflicts_detected} conflicts detected</span>
                    </div>
                  )}
                  
                  {/* Generation Errors */}
                  {timetable.generation_errors.length > 0 && (
                    <div className="flex items-center text-sm text-red-600 bg-red-50 p-2 rounded">
                      <XCircleIcon className="h-4 w-4 mr-2" />
                      <span>{timetable.generation_errors.length} generation errors</span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTimetable(timetable)
                        setIsViewModalOpen(true)
                      }}
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {permissions.canManageRotas && (
                      <>
                        {timetable.status === 'draft' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleGenerateTimetable(timetable)}
                          >
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Generate
                          </Button>
                        )}
                        
                        {timetable.status === 'generated' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handlePublishTimetable(timetable)}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Publish
                          </Button>
                        )}
                        
                        {timetable.status === 'published' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleArchiveTimetable(timetable)}
                          >
                            Archive
                          </Button>
                        )}
                        
                        {timetable.status === 'draft' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteTimetable(timetable)}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <TimetableCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateTimetable}
          homes={homes}
          services={services}
        />
      )}
      
      {isViewModalOpen && selectedTimetable && (
        <TimetableViewModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          timetable={selectedTimetable}
        />
      )}
    </div>
  )
}

export default Timetables
