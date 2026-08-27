import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth, usePermissions } from '@/hooks/useAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Layout from '@/components/Layout'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import Login from '@/pages/Login'
import Setup from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import RotaEditor from '@/pages/RotaEditor'
import MySchedule from '@/pages/MySchedule'
import MyHours from '@/pages/MyHours'
import ClockInAnalysis from '@/pages/ClockInAnalysis'
import StaffManagement from '@/pages/StaffManagement'
import Settings from '@/pages/Settings'
import Availability from '@/pages/Availability'
import Services from '@/pages/Services'
import Homes from '@/pages/Homes'
import WeeklySchedules from '@/pages/WeeklySchedules'
import ShiftSelection from '@/pages/ShiftSelection'
import ShiftSwaps from '@/pages/ShiftSwaps'
import Timetables from '@/pages/Timetables'
import UserTimetables from '@/pages/UserTimetables'
import Messages from '@/pages/Messages'
import ThemeShowcase from '@/pages/ThemeShowcase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// Restricts management-only pages (dashboard, staff, rota, etc.) to admins and
// key workers. Regular users are redirected to their personal schedule.
function RequireManagement({ children }: { children: React.ReactElement }) {
  const { isManagement } = usePermissions()
  return isManagement ? children : <Navigate to="/my-schedule" replace />
}

// Restricts admin-only pages (managing the list of homes) to admins.
function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { isAdmin } = usePermissions()
  return isAdmin ? children : <Navigate to="/my-schedule" replace />
}

function App() {
  const { user, isLoading } = useAuth()
  const permissions = usePermissions()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/theme" element={<ThemeShowcase />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Layout>
        <PushNotificationSetup />
        <Routes>
          <Route path="/" element={<Navigate to={permissions.isManagement ? '/dashboard' : '/my-schedule'} replace />} />

          {/* Management-only pages */}
          <Route path="/dashboard" element={<RequireManagement><Dashboard /></RequireManagement>} />
          <Route path="/rota/:weekStart?" element={<RequireManagement><RotaEditor /></RequireManagement>} />
          <Route path="/weekly-schedules" element={<RequireManagement><WeeklySchedules /></RequireManagement>} />
          <Route path="/timetables" element={<RequireAdmin><Timetables /></RequireAdmin>} />
          <Route path="/staff" element={<RequireManagement><StaffManagement /></RequireManagement>} />
          <Route path="/services" element={<RequireManagement><Services /></RequireManagement>} />
          <Route path="/clock-in-analysis" element={<RequireAdmin><ClockInAnalysis /></RequireAdmin>} />

          {/* Admin-only pages */}
          <Route path="/homes" element={<RequireAdmin><Homes /></RequireAdmin>} />

          {/* Personal pages (available to all authenticated users) */}
          <Route path="/shift-selection" element={<ShiftSelection />} />
          <Route path="/shift-swaps" element={<ShiftSwaps />} />
          <Route path="/my-timetables" element={<UserTimetables />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/my-hours" element={<MyHours />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/theme" element={<ThemeShowcase />} />
          <Route path="*" element={<Navigate to={permissions.isManagement ? '/dashboard' : '/my-schedule'} replace />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
