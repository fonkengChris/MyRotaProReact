import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'
import { LoginCredentials, RegisterData } from '@/types'

// Mock axios - create a shared mock instance
const mockAxiosInstance = {
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  }
})

const mockedAxios = axios as any

// Store original module to reset between tests
let apiModule: any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock env
vi.mock('@/lib/env', () => ({
  getAppConfig: () => ({
    apiBaseUrl: 'http://localhost:5000',
  }),
  isDebugMode: () => false,
}))

describe('authApi', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Reset the mock instance methods
    mockAxiosInstance.post.mockReset()
    mockAxiosInstance.get.mockReset()
    mockAxiosInstance.put.mockReset()
    mockAxiosInstance.delete.mockReset()
    
    // Import module once - it will use the mocked axios
    if (!apiModule) {
      apiModule = await import('@/lib/api')
    }
  })

  describe('login', () => {
    it('should login successfully', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'support_worker',
          },
          token: 'test-token',
          permissions: {},
        },
      }

      // Use the shared mock instance
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await apiModule.authApi.login(credentials)

      expect(result.user.email).toBe(credentials.email)
      expect(result.token).toBe('test-token')
    })

    it('should handle login error', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      }

      // Use the shared mock instance
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Invalid credentials' },
        },
      })

      await expect(apiModule.authApi.login(credentials)).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('should register successfully', async () => {
      const registerData: RegisterData = {
        name: 'New User',
        email: 'new@example.com',
        phone: '+1234567890',
        password: 'password123',
        role: 'support_worker',
      }

      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: registerData.name,
            email: registerData.email,
            role: registerData.role,
          },
          token: 'test-token',
          permissions: {},
        },
      }

      // Use the shared mock instance
      mockAxiosInstance.post.mockResolvedValue(mockResponse)

      const result = await apiModule.authApi.register(registerData)

      expect(result.user.email).toBe(registerData.email)
      expect(result.token).toBe('test-token')
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'support_worker',
      }

      localStorageMock.getItem.mockReturnValue('test-token')

      // Use the shared mock instance
      mockAxiosInstance.get.mockResolvedValue({
        data: { user: mockUser, permissions: {} },
      })

      const result = await apiModule.authApi.getCurrentUser()

      expect(result.email).toBe(mockUser.email)
    })

    it('should handle 401 error', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token')

      // Use the shared mock instance
      mockAxiosInstance.get.mockRejectedValue({
        response: {
          status: 401,
          config: { url: '/api/auth/me' },
        },
      })

      await expect(apiModule.authApi.getCurrentUser()).rejects.toThrow()
    })
  })

  describe('logout', () => {
    it('should logout successfully', async () => {
      localStorageMock.getItem.mockReturnValue('test-token')

      // Use the shared mock instance
      mockAxiosInstance.post.mockResolvedValue({
        data: { message: 'Logout successful' },
      })

      await apiModule.authApi.logout()

      // Verify the API call was made
      expect(mockAxiosInstance.post).toHaveBeenCalled()
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      localStorageMock.getItem.mockReturnValue('test-token')

      const updateData = {
        name: 'Updated Name',
      }

      const mockResponse = {
        data: {
          id: '1',
          name: 'Updated Name',
          email: 'test@example.com',
          role: 'support_worker',
        },
      }

      // Use the shared mock instance
      mockAxiosInstance.put.mockResolvedValue(mockResponse)

      const result = await apiModule.authApi.updateProfile({ ...updateData, id: '1' })

      expect(result.name).toBe('Updated Name')
    })
  })
})

