import { useState, useEffect, createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    const updatedUser = await authApi.updateProfile(data)
    setUser(updatedUser)
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

  return {
    isManagement,
    canManageUsers: isManagement,
    canManageRotas: isManagement,
    canApproveRequests: isManagement,
    canManageTimeOff: isManagement,
    canViewAllHomes: user.role === 'admin',
    canManageHomes: user.role === 'admin',
    canManageServices: isManagement,
    canManageServiceUsers: user.role === 'admin',
    canAllocateHomes: isManagement,
    canUseAISolver: isManagement,
    isAdmin: user.role === 'admin',
    isKeyWorker: user.role === 'key_worker',
    isSeniorStaff: user.role === 'senior_staff',
    isSupportWorker: user.role === 'support_worker',
  }
}
