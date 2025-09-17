import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { 
  CalendarIcon, 
  ClockIcon, 
  UsersIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { timetablesApi } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import TimetableViewModal from '@/components/TimetableViewModal'
import { Timetable } from '@/types'

const UserTimetables: React.FC = () => {
  const { user } = useAuth()
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  // Fetch timetables accessible to the current user
  const { data: timetables = [], isLoading, error } = useQuery({
    queryKey: ['user-timetables', user?.id],
    queryFn: () => timetablesApi.getAll({ user_access: true }),
    enabled: !!user,
    select: (data) => Array.isArray(data) ? data : []
  })

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <CalendarIcon className="h-4 w-4" />
      case 'generating': return <ClockIcon className="h-4 w-4 animate-spin" />
      case 'generated': return <CheckCircleIcon className="h-4 w-4" />
      case 'published': return <CheckCircleIcon className="h-4 w-4" />
      case 'archived': return <XCircleIcon className="h-4 w-4" />
      default: return <CalendarIcon className="h-4 w-4" />
    }
  }

  const handleViewTimetable = (timetable: Timetable) => {
    setSelectedTimetable(timetable)
    setIsViewModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsViewModalOpen(false)
    setSelectedTimetable(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading timetables</h3>
        <p className="mt-1 text-sm text-gray-500">
          There was an error loading your timetables. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">My Timetables</h1>
          <p className="text-gray-600 mt-1">
            View your published work schedules and timetables
          </p>
        </div>
      </div>

      {/* Timetables List */}
      {timetables.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No timetables available</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have access to any published timetables yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetables.map((timetable) => (
            <Card key={timetable.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{timetable.name}</CardTitle>
                  <Badge variant={getStatusBadgeVariant(timetable.status)}>
                    {getStatusIcon(timetable.status)}
                    <span className="ml-1 capitalize">{timetable.status}</span>
                  </Badge>
                </div>
                {timetable.description && (
                  <CardDescription>{timetable.description}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Date Range */}
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {format(parseISO(timetable.start_date), 'MMM d, yyyy')} - {format(parseISO(timetable.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{timetable.total_weeks}</div>
                      <div className="text-xs text-gray-600">Weeks</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-gray-900">{timetable.total_shifts}</div>
                      <div className="text-xs text-gray-600">Shifts</div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Hours:</span>
                      <span className="font-medium">{timetable.total_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assignments:</span>
                      <span className="font-medium">{timetable.total_assignments}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Weekly Hours:</span>
                      <span className="font-medium">{timetable.average_weekly_hours}h</span>
                    </div>
                  </div>

                  {/* Conflicts Warning */}
                  {timetable.conflicts_detected > 0 && (
                    <div className="flex items-center p-2 bg-red-50 border border-red-200 rounded-lg">
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-400 mr-2" />
                      <span className="text-sm text-red-800">
                        {timetable.conflicts_detected} conflicts detected
                      </span>
                    </div>
                  )}

                  {/* View Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewTimetable(timetable)}
                    disabled={timetable.status !== 'published'}
                  >
                    <EyeIcon className="h-4 w-4 mr-2" />
                    {timetable.status === 'published' ? 'View Timetable' : 'Not Available'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Timetable View Modal */}
      {selectedTimetable && (
        <TimetableViewModal
          isOpen={isViewModalOpen}
          onClose={handleCloseModal}
          timetable={selectedTimetable}
          userFilter={true}
        />
      )}
    </div>
  )
}

export default UserTimetables
