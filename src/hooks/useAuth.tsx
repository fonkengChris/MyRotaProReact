import { useState, useEffect, createContext, useContext } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { aiSolverApi, authApi } from '@/lib/api'
import { setSleepInHours } from '@/lib/shiftHours'
import { User, LoginCredentials } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !user) {
      checkAuth()
    } else {
      setIsLoading(false)
    }
  }, []) // Remove user from dependency array to prevent infinite loop

  // Load the org's sleep-in length before showing the app, so every hours figure uses it.
  // On failure the default (9h) stays in place.
  const loadSleepInHours = async () => {
    try {
      setSleepInHours(await aiSolverApi.getSleepInHours())
    } catch {
      // keep the default
    }
  }

  // Pick up access changes made by an admin when the user comes back to the app.
  const signedIn = !!user
  useEffect(() => {
    if (!signedIn) return
    const refresh = () => {
      authApi.getCurrentUser().then(setUser).catch(() => {
        // keep the current user; a real auth failure is handled by the API layer
      })
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [signedIn])

  const checkAuth = async () => {
    try {
      const userData = await authApi.getCurrentUser()
      await loadSleepInHours()
      setUser(userData)
    } catch (error) {
      console.error('🔐 useAuth: checkAuth error:', error)
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials)
      
      // Check if response has the expected structure
      if (!response || !response.user || !response.token) {
        console.error('🔐 useAuth: Invalid response structure:', response)
        throw new Error('Invalid response structure from login API')
      }
      
      const { user: userData, token } = response
      
      localStorage.setItem('token', token)
      await loadSleepInHours()

      setUser(userData)
      
      // Clear any existing queries
      queryClient.clear()
    } catch (error) {
      console.error('🔐 useAuth: Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      setUser(null)
      queryClient.clear()
    }
  }

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authApi.updateProfile({ id: user?.id, ...data })
    // The update response doesn't carry what /auth/me adds (access, service-user homes).
    setUser((current) => ({ ...current, ...updatedUser }))
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking if user has specific permissions
export function usePermissions() {
  const { user } = useAuth()
  
  if (!user) return {}

  // Management roles reach dashboard/staff/rota/etc.; key workers are scoped
  // to their own home(s). senior_staff and support_worker are regular users
  // limited to their own data.
  const isManagement = ['admin', 'key_worker'].includes(user.role)
  const isAdmin = user.role === 'admin'
  const isKeyWorker = user.role === 'key_worker'

  // Key workers' access is set by admins (see KeyWorkerAccessSettings on the server).
  const areaLevel = (area: 'staff' | 'weekly_schedules' | 'rota') =>
    isAdmin ? 'full' : isKeyWorker ? user.access?.[area] ?? 'hidden' : 'hidden'
  const canViewArea = (area: 'staff' | 'weekly_schedules' | 'rota') => areaLevel(area) !== 'hidden'
  const canManageUsers = areaLevel('staff') === 'full'
  const canManageRotas = areaLevel('rota') === 'full'
  // Personal pages: every rostered role, except key workers it's been turned off for.
  const personalPage = (page: 'shift_selection' | 'shift_swaps' | 'my_hours') =>
    !isAdmin && (!isKeyWorker || user.access?.[page] === 'visible')

  return {
    isManagement,
    canViewStaff: canViewArea('staff'),
    canManageUsers,
    canViewRotas: canViewArea('rota'),
    canManageRotas,
    canViewWeeklySchedules: canViewArea('weekly_schedules'),
    canManageWeeklySchedules: areaLevel('weekly_schedules') === 'full',
    canManageOneToOne: canManageRotas,
    canUseMultiHomeAI: canManageRotas,
    canUseShiftSelection: personalPage('shift_selection'),
    canUseShiftSwaps: personalPage('shift_swaps'),
    canViewMyHours: personalPage('my_hours'),
    canApproveRequests: isManagement,
    canManageTimeOff: isManagement,
    // Leave approval/denial is admin-only; key workers can view and cancel but not decide.
    canApproveTimeOff: user.role === 'admin',
    // Part-time and bank staff declare their own availability; admins and key workers with
    // full staff access set it for others.
    canSelfDeclareAvailability: ['parttime', 'bank'].includes(user.type),
    canManageStaffAvailability: canManageUsers,
    canViewAllHomes: user.role === 'admin',
    canManageHomes: user.role === 'admin',
    canManageServices: isManagement,
    canManageServiceUsers: user.role === 'admin',
    canAllocateHomes: canManageUsers,
    canUseAISolver: canManageRotas,
    isAdmin,
    isKeyWorker,
    isSeniorStaff: user.role === 'senior_staff',
    isSupportWorker: user.role === 'support_worker',
  }
}
