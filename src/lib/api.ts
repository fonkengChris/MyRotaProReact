import axios, { AxiosResponse } from 'axios'
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  Home,
  Service,
  Shift,
  Rota,
  Availability,
  TimeOffRequest,
  AIGenerationRequest,
  AIGenerationResult,
  ConstraintWeight,
  WeeklySchedule,
  ShiftSwap,
  ShiftSwapRequest,
  ShiftSwapResponse,
  AvailableSwap,
  ShiftSwapStats,
  Timetable,
  TimetableCreateRequest,
  TimetableGenerationStatus,
} from '@/types'
import toast from 'react-hot-toast';

// Create base axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Handle authentication errors only for protected routes
    if (error.response?.status === 401) {
      // Only redirect if we're not on a public page AND we have a token
      const currentPath = window.location.pathname
      const publicPaths = ['/login', '/register', '/setup']
      const hasToken = localStorage.getItem('token')
      
      if (!publicPaths.includes(currentPath) && hasToken) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        // Use window.location.href for now, but we'll improve this
        window.location.href = '/login'
        toast.error('Session expired. Please login again.')
      }
    }

    return Promise.reject(error)
  }
)

// Authentication API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data)
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ user: User; permissions: any }>('/auth/me')
    return response.data.user
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/logout')
    return response.data
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${data.id}`, data)
    return response.data
  },
}

// Homes API
export const homesApi = {
  getAll: async (): Promise<Home[]> => {
    const response = await api.get<Home[]>('/homes')
    return response.data
  },

  getById: async (id: string): Promise<Home> => {
    const response = await api.get<Home>(`/homes/${id}`)
    return response.data
  },

  create: async (data: Omit<Home, 'id' | 'created_at' | 'updated_at'>): Promise<Home> => {
    const response = await api.post<Home>('/homes', data)
    return response.data
  },

  update: async (id: string, data: Partial<Home>): Promise<Home> => {
    const response = await api.put<Home>(`/homes/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/homes/${id}`)
    return response.data
  },
}

// Services API
export const servicesApi = {
  getAll: async (homeId?: string): Promise<Service[]> => {
    const params = homeId ? { home_id: homeId } : {}
    const response = await api.get<Service[]>('/services', { params })
    return response.data
  },

  getById: async (id: string): Promise<Service> => {
    const response = await api.get<Service>(`/services/${id}`)
    return response.data
  },

  create: async (data: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> => {
    const response = await api.post<Service>('/services', data)
    return response.data
  },

  update: async (id: string, data: Partial<Service>): Promise<Service> => {
    const response = await api.put<Service>(`/services/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/services/${id}`)
    return response.data
  },
}

// Shifts API
export const shiftsApi = {
  getAll: async (params?: {
    home_id?: string
    service_id?: string
    date?: string
    start_date?: string
    end_date?: string
    user_id?: string
  }): Promise<Shift[]> => {
    const response = await api.get<Shift[]>('/shifts', { params })
    return response.data
  },

  getById: async (id: string): Promise<Shift> => {
    const response = await api.get<Shift>(`/shifts/${id}`)
    return response.data
  },

                                                                                                                                                                                                                                                                                                        create: async (data: Omit<Shift, 'id' | 'created_at' | 'updated_at'>): Promise<Shift> => {
    const response = await api.post<Shift>('/shifts', data)
    return response.data
  },

  update: async (id: string, data: Partial<Shift>): Promise<Shift> => {
    const response = await api.put<Shift>(`/shifts/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/shifts/${id}`)
    return response.data
  },

  assignStaff: async (shiftId: string, userId: string, note?: string): Promise<Shift> => {
    const response = await api.post<Shift>(`/shifts/${shiftId}/assign`, { user_id: userId, note })
    return response.data
  },

  removeStaff: async (shiftId: string, userId: string): Promise<Shift> => {
    const response = await api.delete<Shift>(`/shifts/${shiftId}/assign/${userId}`)
    return response.data
  },

  // Check for scheduling conflicts
  checkConflicts: async (params: {
    home_id: string
    start_date: string
    end_date: string
  }): Promise<any> => {
    const response = await api.get('/shifts/conflicts/check', { params })
    return response.data
  },

  // Get available shifts for staff selection
  getAvailable: async (params: {
    user_id: string
    start_date: string
    end_date: string
    home_ids?: string
  }): Promise<Shift[]> => {
    const response = await api.get<Shift[]>('/shifts/available', { params })
    return response.data
  },
}

// Rotas API
export const rotasApi = {
  getAll: async (params?: {
    home_id?: string
    service_id?: string
    status?: string
    week_start_date?: string
    week_end_date?: string
  }): Promise<Rota[]> => {
    const response = await api.get<Rota[]>('/rotas', { params })
    return response.data
  },

  getById: async (id: string): Promise<Rota> => {
    const response = await api.get<Rota>(`/rotas/${id}`)
    return response.data
  },

  create: async (data: Omit<Rota, 'id' | 'created_at' | 'updated_at'>): Promise<Rota> => {
    const response = await api.post<Rota>('/rotas', data)
    return response.data
  },

  update: async (id: string, data: Partial<Rota>): Promise<Rota> => {
    const response = await api.put<Rota>(`/rotas/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/rotas/${id}`)
    return response.data
  },

  publish: async (id: string): Promise<Rota> => {
    const response = await api.post<Rota>(`/rotas/${id}/publish`)
    return response.data
  },

  archive: async (id: string): Promise<Rota> => {
    const response = await api.post<Rota>(`/rotas/${id}/archive`)
    return response.data
  },

  revertToDraft: async (id: string): Promise<Rota> => {
    const response = await api.post<Rota>(`/rotas/${id}/revert`)
    return response.data
  },
}

// Availability API
export const availabilityApi = {
  getAll: async (params?: {
    user_id?: string
    date?: string
    start_date?: string
    end_date?: string
  }): Promise<Availability[]> => {
    const response = await api.get<Availability[]>('/availability', { params })
    return response.data
  },

  getById: async (id: string): Promise<Availability> => {
    const response = await api.get<Availability>(`/availability/${id}`)
    return response.data
  },

  create: async (data: Omit<Availability, 'id' | 'submitted_at' | 'updated_at'>): Promise<Availability> => {
    const response = await api.post<Availability>('/availability', data)
    return response.data
  },

  update: async (id: string, data: Partial<Availability>): Promise<Availability> => {
    const response = await api.put<Availability>(`/availability/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/availability/${id}`)
    return response.data
  },

  getUserAvailability: async (userId: string, startDate: string, endDate: string): Promise<Availability[]> => {
    const response = await api.get<Availability[]>(`/availability/user/${userId}`, {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  },
}

// Time Off API
export const timeOffApi = {
  getAll: async (params?: {
    user_id?: string
    home_id?: string
    status?: string
    start_date?: string
    end_date?: string
  }): Promise<TimeOffRequest[]> => {
    const response = await api.get<TimeOffRequest[]>('/timeoff', { params })
    return response.data
  },

  getById: async (id: string): Promise<TimeOffRequest> => {
    const response = await api.get<TimeOffRequest>(`/timeoff/${id}`)
    return response.data
  },

  create: async (data: Omit<TimeOffRequest, 'id' | 'submitted_at' | 'updated_at'>): Promise<TimeOffRequest> => {
    const response = await api.post<TimeOffRequest>('/timeoff', data)
    return response.data
  },

  update: async (id: string, data: Partial<TimeOffRequest>): Promise<TimeOffRequest> => {
    const response = await api.put<TimeOffRequest>(`/timeoff/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/timeoff/${id}`)
    return response.data
  },

  approve: async (id: string): Promise<TimeOffRequest> => {
    const response = await api.post<TimeOffRequest>(`/timeoff/${id}/approve`)
    return response.data
  },

  deny: async (id: string, reason: string): Promise<TimeOffRequest> => {
    const response = await api.post<TimeOffRequest>(`/timeoff/${id}/deny`, { reason })
    return response.data
  },
}

// AI Solver API
export const aiSolverApi = {
  generateRota: async (data: AIGenerationRequest): Promise<AIGenerationResult> => {
    const response = await api.post<AIGenerationResult>('/ai-solver/generate-rota', data)
    return response.data
  },

  optimizeRota: async (rotaId: string, optimizationType: string): Promise<any> => {
    const response = await api.post('/ai-solver/optimize-rota', { rota_id: rotaId, optimization_type: optimizationType })
    return response.data
  },

  validateRota: async (rotaData: any): Promise<any> => {
    const response = await api.post('/ai-solver/validate-rota', { rota_data: rotaData })
    return response.data
  },

  getConstraints: async (params?: { home_id?: string; service_id?: string }): Promise<any> => {
    const response = await api.get('/ai-solver/constraints', { params })
    return response.data
  },

  updateConstraints: async (constraints: ConstraintWeight[]): Promise<any> => {
    const response = await api.post('/ai-solver/update-constraints', { constraints })
    return response.data
  },

  getPerformance: async (params?: { home_id?: string; date_range?: string }): Promise<any> => {
    const response = await api.get('/ai-solver/performance', { params })
    return response.data
  },
}

// Users API
export const usersApi = {
  getAll: async (params?: {
    home_id?: string
    role?: string
    is_active?: boolean
  }): Promise<User[]> => {
    const response = await api.get<User[]>('/users', { params })
    return response.data
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`)
    return response.data
  },

  create: async (data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
    const response = await api.post<User>('/users', data)
    return response.data
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/users/${id}`)
    return response.data
  },

  activate: async (id: string): Promise<User> => {
    const response = await api.post<User>(`/users/${id}/activate`)
    return response.data
  },

  deactivate: async (id: string): Promise<User> => {
    const response = await api.post<User>(`/users/${id}/deactivate`)
    return response.data
  },

  // Legacy methods for backward compatibility
  allocateHome: async (userId: string, homeId: string): Promise<User> => {
    const response = await api.post<User>(`/users/${userId}/add-home`, { home_id: homeId, is_default: false })
    return response.data
  },

  removeHomeAllocation: async (userId: string): Promise<User> => {
    // This method is deprecated - use removeHome instead
    const response = await api.delete<User>(`/users/${userId}/allocate-home`)
    return response.data
  },

  // New home management methods
  addHome: async (userId: string, data: { home_id: string; is_default: boolean }): Promise<User> => {
    const response = await api.post<User>(`/users/${userId}/add-home`, data)
    return response.data
  },

  removeHome: async (userId: string, homeId: string): Promise<User> => {
    const response = await api.delete<User>(`/users/${userId}/remove-home/${homeId}`)
    return response.data
  },

  setDefaultHome: async (userId: string, data: { home_id: string }): Promise<User> => {
    const response = await api.post<User>(`/users/${userId}/set-default-home`, data)
    return response.data
  },
}

// Weekly Schedule API
export const weeklySchedulesApi = {
  getAll: async (): Promise<WeeklySchedule[]> => {
    const response = await api.get('/weekly-schedules');
    return response.data;
  },

  getByHome: async (homeId: string): Promise<WeeklySchedule> => {
    const response = await api.get(`/weekly-schedules/home/${homeId}`);
    return response.data;
  },

  create: async (data: Omit<WeeklySchedule, '_id' | 'created_at' | 'updated_at'>): Promise<WeeklySchedule> => {
    const response = await api.post('/weekly-schedules', data);
    return response.data;
  },

  update: async (id: string, data: Partial<WeeklySchedule>): Promise<WeeklySchedule> => {
    const response = await api.put(`/weekly-schedules/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/weekly-schedules/${id}`);
  },

  addShiftToDay: async (scheduleId: string, dayName: string, shiftData: any): Promise<WeeklySchedule> => {
    const response = await api.post(`/weekly-schedules/${scheduleId}/days/${dayName}/shifts`, shiftData);
    return response.data;
  },

  removeShiftFromDay: async (scheduleId: string, dayName: string, shiftIndex: number): Promise<WeeklySchedule> => {
    const response = await api.delete(`/weekly-schedules/${scheduleId}/days/${dayName}/shifts/${shiftIndex}`);
    return response.data;
  },

  toggleDayStatus: async (scheduleId: string, dayName: string): Promise<WeeklySchedule> => {
    const response = await api.patch(`/weekly-schedules/${scheduleId}/days/${dayName}/toggle`);
    return response.data;
  }
};

// Shift Swap API
export const shiftSwapsApi = {
  // Get all shift swaps for the current user
  getAll: async (params?: { status?: string; type?: 'sent' | 'received' }): Promise<ShiftSwap[]> => {
    const response = await api.get('/shift-swaps', { params });
    return response.data;
  },

  // Get pending swap requests (where user needs to respond)
  getPending: async (): Promise<ShiftSwap[]> => {
    const response = await api.get('/shift-swaps/pending');
    return response.data;
  },

  // Get shift swap by ID
  getById: async (id: string): Promise<ShiftSwap> => {
    const response = await api.get(`/shift-swaps/${id}`);
    return response.data;
  },

  // Create a new shift swap request
  create: async (data: ShiftSwapRequest): Promise<ShiftSwap> => {
    const response = await api.post('/shift-swaps', data);
    return response.data;
  },

  // Approve a shift swap request
  approve: async (id: string, data?: ShiftSwapResponse): Promise<ShiftSwap> => {
    const response = await api.post(`/shift-swaps/${id}/approve`, data);
    return response.data;
  },

  // Reject a shift swap request
  reject: async (id: string, data?: ShiftSwapResponse): Promise<ShiftSwap> => {
    const response = await api.post(`/shift-swaps/${id}/reject`, data);
    return response.data;
  },

  // Cancel a shift swap request (by requester)
  cancel: async (id: string): Promise<ShiftSwap> => {
    const response = await api.post(`/shift-swaps/${id}/cancel`);
    return response.data;
  },

  // Get available shifts for swapping
  getAvailableShifts: async (
    userId: string, 
    params?: { start_date?: string; end_date?: string; home_id?: string }
  ): Promise<AvailableSwap[]> => {
    const response = await api.get(`/shift-swaps/available-shifts/${userId}`, { params });
    return response.data;
  },

  // Get swap statistics for a user
  getStats: async (userId: string): Promise<ShiftSwapStats> => {
    const response = await api.get(`/shift-swaps/stats/${userId}`);
    return response.data;
  }
};

// Timetables API
export const timetablesApi = {
  // Get all accessible timetables
  getAll: async (params?: {
    status?: string;
    home_id?: string;
    start_date?: string;
    end_date?: string;
    user_access?: boolean;
  }): Promise<Timetable[]> => {
    const response = await api.get('/timetables', { params });
    return response.data;
  },

  // Get timetable by ID
  getById: async (id: string): Promise<Timetable> => {
    const response = await api.get(`/timetables/${id}`);
    return response.data;
  },

  // Create new timetable (draft)
  create: async (data: TimetableCreateRequest): Promise<Timetable> => {
    const response = await api.post('/timetables', data);
    return response.data;
  },

  // Update timetable (only draft status)
  update: async (id: string, data: Partial<Timetable>): Promise<Timetable> => {
    const response = await api.put(`/timetables/${id}`, data);
    return response.data;
  },

  // Delete timetable (only draft status)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/timetables/${id}`);
  },

  // Generate timetable from existing rotas
  generate: async (id: string): Promise<{ message: string; timetable_id: string; status: string }> => {
    const response = await api.post(`/timetables/${id}/generate`);
    return response.data;
  },

  // Check timetable generation status
  getStatus: async (id: string): Promise<TimetableGenerationStatus> => {
    const response = await api.get(`/timetables/${id}/status`);
    return response.data;
  },

  // Publish timetable
  publish: async (id: string): Promise<Timetable> => {
    const response = await api.post(`/timetables/${id}/publish`);
    return response.data;
  },

  // Archive timetable
  archive: async (id: string): Promise<Timetable> => {
    const response = await api.post(`/timetables/${id}/archive`);
    return response.data;
  },

  // Get timetable summary
  getSummary: async (id: string): Promise<any> => {
    const response = await api.get(`/timetables/${id}/summary`);
    return response.data;
  },

  // Get weekly breakdown
  getWeeklyBreakdown: async (id: string): Promise<any[]> => {
    const response = await api.get(`/timetables/${id}/weekly-breakdown`);
    return response.data;
  }
};

export default api
