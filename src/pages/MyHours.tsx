import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import HoursSummary from '@/components/HoursSummary'
import { extractUserDefaultHomeId } from '@/types'

const MyHours: React.FC = () => {
  const { user } = useAuth()

  // Safety check - don't render if user is not loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <HoursSummary 
      homeId={extractUserDefaultHomeId(user)}
      userId={user.id}
      isAdminView={false}
      userRole={user.role}
    />
  )
}

export default MyHours
