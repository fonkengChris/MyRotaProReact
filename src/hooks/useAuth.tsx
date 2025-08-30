import { useState, useEffect, createContext, useContext } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { User, LoginCredentials, RegisterData } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
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
  }, [user])

  const checkAuth = async () => {
    try {
      const userData = await authApi.getCurrentUser()
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
      
      setUser(userData)
      
      // Clear any existing queries
      queryClient.clear()
    } catch (error) {
      console.error('🔐 useAuth: Login error:', error)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data)
    const { user: userData, token } = response
    
    localStorage.setItem('token', token)
    setUser(userData)
    
    // Clear any existing queries
    queryClient.clear()
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
    register,
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
  
  return {
    canManageUsers: ['admin', 'home_manager'].includes(user.role),
    canManageRotas: ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    canApproveRequests: ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    canManageTimeOff: ['admin', 'home_manager', 'senior_staff'].includes(user.role),
    canViewAllHomes: user.role === 'admin',
    canManageHomes: user.role === 'admin',
    canAllocateHomes: ['admin', 'home_manager'].includes(user.role),
    canUseAISolver: ['admin', 'home_manager'].includes(user.role),
    isAdmin: user.role === 'admin',
    isHomeManager: user.role === 'home_manager',
    isSeniorStaff: user.role === 'senior_staff',
    isSupportWorker: user.role === 'support_worker',
  }
}
