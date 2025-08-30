import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { 
  ExclamationTriangleIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface Conflict {
  type: string
  shift: any
  user: any
  timeOffRequests: any[]
  message: string
}

interface ConflictAlertProps {
  conflicts: Conflict[]
  onResolveConflict?: (conflict: Conflict) => void
  onDismiss?: () => void
}

const ConflictAlert: React.FC<ConflictAlertProps> = ({ 
  conflicts, 
  onResolveConflict, 
  onDismiss 
}) => {
  if (!conflicts || conflicts.length === 0) {
    return null
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'time_off_conflict':
        return <CalendarIcon className="h-5 w-5 text-red-500" />
      case 'overlapping_shift':
        return <ClockIcon className="h-5 w-5 text-orange-500" />
      case 'max_hours_exceeded':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getConflictBadgeVariant = (type: string) => {
    switch (type) {
      case 'time_off_conflict':
        return 'danger'
      case 'overlapping_shift':
        return 'warning'
      case 'max_hours_exceeded':
        return 'warning'
      default:
        return 'danger'
    }
  }

  const getConflictBadgeText = (type: string) => {
    switch (type) {
      case 'time_off_conflict':
        return 'Time Off Conflict'
      case 'overlapping_shift':
        return 'Overlapping Shift'
      case 'max_hours_exceeded':
        return 'Hours Exceeded'
      default:
        return 'Conflict'
    }
  }

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            <CardTitle className="text-red-800">
              Scheduling Conflicts Detected
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="danger" className="text-xs">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </Badge>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-red-600">
          The following conflicts have been detected in your schedule. Please resolve them to ensure proper staffing.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {conflicts.map((conflict, index) => (
            <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getConflictIcon(conflict.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={getConflictBadgeVariant(conflict.type)} className="text-xs">
                        {getConflictBadgeText(conflict.type)}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {conflict.message}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          <strong>Staff:</strong> {conflict.user?.name || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          <strong>Date:</strong> {conflict.shift?.date || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          <strong>Time:</strong> {conflict.shift?.start_time || 'Unknown'} - {conflict.shift?.end_time || 'Unknown'}
                        </span>
                      </div>
                      
                      {conflict.timeOffRequests && conflict.timeOffRequests.length > 0 && (
                        <div className="md:col-span-2">
                          <span className="text-gray-600">
                            <strong>Time Off:</strong> {conflict.timeOffRequests.map(req => 
                              `${req.start_date} to ${req.end_date}`
                            ).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {onResolveConflict && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResolveConflict(conflict)}
                    className="ml-4 flex-shrink-0"
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-red-200">
          <p className="text-xs text-red-600">
            <strong>Note:</strong> Conflicts can be resolved by reassigning staff, adjusting shift times, or canceling conflicting time-off requests.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConflictAlert
