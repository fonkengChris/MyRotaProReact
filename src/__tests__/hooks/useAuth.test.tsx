import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth, AuthProvider } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'
import { User } from '@/types'

// Mock the API
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  describe('Initialization', () => {
    it('should initialize with no user if no token', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
    })

    it('should check auth if token exists', async () => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'support_worker',
        type: 'fulltime',
        is_active: true,
      }

      localStorageMock.getItem.mockReturnValue('test-token')
      ;(authApi.getCurrentUser as any).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(authApi.getCurrentUser).toHaveBeenCalled()
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle auth check error gracefully', async () => {
      localStorageMock.getItem.mockReturnValue('test-token')
      ;(authApi.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('Login', () => {
    it('should login successfully', async () => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'support_worker',
        type: 'fulltime',
        is_active: true,
      }

      const mockResponse = {
        user: mockUser,
        token: 'test-token',
      }

      localStorageMock.getItem.mockReturnValue(null)
      ;(authApi.login as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      })

      await waitFor(() => {
        expect(result.current.user).not.toBeNull()
      })

      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token')
      expect(result.current.user).toEqual(mockUser)
    })

    it('should handle login error', async () => {
      const error = new Error('Invalid credentials')
      ;(authApi.login as any).mockRejectedValue(error)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials')

      expect(result.current.user).toBeNull()
    })

    it('should handle invalid response structure', async () => {
      ;(authApi.login as any).mockResolvedValue({})

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await expect(
        result.current.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow()
    })
  })

  describe('Register', () => {
    it('should register successfully', async () => {
      const mockUser: User = {
        id: '1',
        name: 'New User',
        email: 'new@example.com',
        role: 'support_worker',
        type: 'fulltime',
        is_active: true,
      }

      const mockResponse = {
        user: mockUser,
        token: 'test-token',
      }

      localStorageMock.getItem.mockReturnValue(null)
      ;(authApi.register as any).mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await result.current.register({
        name: 'New User',
        email: 'new@example.com',
        phone: '+1234567890',
        password: 'password123',
        role: 'support_worker',
      })

      await waitFor(() => {
        expect(result.current.user).not.toBeNull()
      })

      expect(authApi.register).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'test-token')
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('Logout', () => {
    it('should logout successfully', async () => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'support_worker',
        type: 'fulltime',
        is_active: true,
      }

      localStorageMock.getItem.mockReturnValue('test-token')
      ;(authApi.getCurrentUser as any).mockResolvedValue(mockUser)
      ;(authApi.logout as any).mockResolvedValue({})

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).not.toBeNull()
      })

      await result.current.logout()

      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })

      expect(authApi.logout).toHaveBeenCalled()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })

    it('should logout even if API call fails', async () => {
      ;(authApi.logout as any).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await result.current.logout()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
      expect(result.current.user).toBeNull()
    })
  })

  describe('Update User', () => {
    it('should update user successfully', async () => {
      const mockUser: User = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'support_worker',
        type: 'fulltime',
        is_active: true,
      }

      const updatedUser: User = {
        ...mockUser,
        name: 'Updated Name',
      }

      localStorageMock.getItem.mockReturnValue('test-token')
      ;(authApi.getCurrentUser as any).mockResolvedValue(mockUser)
      ;(authApi.updateProfile as any).mockResolvedValue(updatedUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
        expect(result.current.user).not.toBeNull()
      })

      await result.current.updateUser({ id: '1', name: 'Updated Name' })

      await waitFor(() => {
        expect(result.current.user?.name).toBe('Updated Name')
      })

      expect(authApi.updateProfile).toHaveBeenCalledWith({ id: '1', name: 'Updated Name' })
      expect(result.current.user).toEqual(updatedUser)
    })
  })

  describe('Error Handling', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error
      console.error = vi.fn()

      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      console.error = consoleError
    })
  })
})

