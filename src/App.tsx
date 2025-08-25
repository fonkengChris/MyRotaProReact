import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Setup from '@/pages/Setup'
import Dashboard from '@/pages/Dashboard'
import RotaEditor from '@/pages/RotaEditor'
import MySchedule from '@/pages/MySchedule'
import StaffManagement from '@/pages/StaffManagement'
import Settings from '@/pages/Settings'
import Availability from '@/pages/Availability'
import Services from '@/pages/Services'
import Homes from '@/pages/Homes'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rota/:weekStart?" element={<RotaEditor />} />
        <Route path="/my-schedule" element={<MySchedule />} />
        <Route path="/availability" element={<Availability />} />
        <Route path="/staff" element={<StaffManagement />} />
        <Route path="/homes" element={<Homes />} />
        <Route path="/services" element={<Services />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
