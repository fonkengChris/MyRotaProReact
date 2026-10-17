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
import Profile from '@/pages/Profile'
import KeyWorkerHome from '@/pages/KeyWorkerHome'
import MyHours from '@/pages/MyHours'
import ClockInAnalysis from '@/pages/ClockInAnalysis'
import StaffManagement from '@/pages/StaffManagement'
import Settings from '@/pages/Settings'
import Availability from '@/pages/Availability'
import Services from '@/pages/Services'
import Homes from '@/pages/Homes'
import ServiceUsers from '@/pages/ServiceUsers'
import WeeklySchedules from '@/pages/WeeklySchedules'
import ShiftSelection from '@/pages/ShiftSelection'
import ShiftSwaps from '@/pages/ShiftSwaps'
import Timetables from '@/pages/Timetables'
import SolverSettings from '@/pages/SolverSettings'
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

// Personal rostered-staff pages (My Schedule, Shift Selection/Swaps, My Hours);
// admins are redirected to their landing page.
function RequireNonAdmin({ children, fallback }: { children: React.ReactElement; fallback: string }) {
  const { isAdmin } = usePermissions()
  return isAdmin ? <Navigate to={fallback} replace /> : children
}

// Key Worker Home is the key-worker landing page (task prompts + caseload).
function RequireKeyWorker({ children }: { children: React.ReactElement }) {
  const { isKeyWorker } = usePermissions()
  return isKeyWorker ? children : <Navigate to="/" replace />
}

// Default landing page per role: key workers get Key Worker Home, other managers the
// Dashboard, and regular staff their Profile.
function landingPath(permissions: ReturnType<typeof usePermissions>) {
  if (permissions.isKeyWorker) return '/key-worker-home'
  return permissions.isManagement ? '/dashboard' : '/profile'
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
          <Route path="/" element={<Navigate to={landingPath(permissions)} replace />} />

          {/* Management-only pages */}
          <Route path="/dashboard" element={<RequireManagement><Dashboard /></RequireManagement>} />
          <Route path="/rota/:weekStart?" element={<RequireManagement><RotaEditor /></RequireManagement>} />
          <Route path="/weekly-schedules" element={<RequireManagement><WeeklySchedules /></RequireManagement>} />
          <Route path="/timetables" element={<RequireAdmin><Timetables /></RequireAdmin>} />
          <Route path="/solver-settings" element={<RequireAdmin><SolverSettings /></RequireAdmin>} />
          <Route path="/staff" element={<RequireManagement><StaffManagement /></RequireManagement>} />
          <Route path="/services" element={<RequireManagement><Services /></RequireManagement>} />
          <Route path="/clock-in-analysis" element={<RequireAdmin><ClockInAnalysis /></RequireAdmin>} />

          {/* Admin-only pages */}
          <Route path="/homes" element={<RequireAdmin><Homes /></RequireAdmin>} />
          <Route path="/service-users" element={<RequireManagement><ServiceUsers /></RequireManagement>} />

          {/* Personal pages (available to all authenticated users) */}
          <Route path="/key-worker-home" element={<RequireKeyWorker><KeyWorkerHome /></RequireKeyWorker>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/shift-selection" element={<RequireNonAdmin fallback={landingPath(permissions)}><ShiftSelection /></RequireNonAdmin>} />
          <Route path="/shift-swaps" element={<RequireNonAdmin fallback={landingPath(permissions)}><ShiftSwaps /></RequireNonAdmin>} />
          <Route path="/my-timetables" element={<RequireAdmin><UserTimetables /></RequireAdmin>} />
          <Route path="/my-schedule" element={<RequireNonAdmin fallback={landingPath(permissions)}><MySchedule /></RequireNonAdmin>} />
          <Route path="/my-hours" element={<RequireNonAdmin fallback={landingPath(permissions)}><MyHours /></RequireNonAdmin>} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/theme" element={<ThemeShowcase />} />
          <Route path="*" element={<Navigate to={landingPath(permissions)} replace />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
