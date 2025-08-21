// User types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  home_id?: string
  is_active: boolean
  skills: Skill[]
  preferred_shift_types: ShiftType[]
  max_hours_per_week: number
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'home_manager' | 'senior_staff' | 'support_worker'

export type Skill = 'medication' | 'personal_care' | 'domestic_support' | 'social_support' | 'specialist_care'

export type ShiftType = 'morning' | 'day' | 'afternoon' | 'evening' | 'night' | 'overtime' | 'long_day'

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  phone: string
  password: string
  role: UserRole
  home_id?: string
}

export interface AuthResponse {
  user: User
  token: string
  permissions: UserPermissions
}

export interface UserPermissions {
  can_manage_users: boolean
  can_manage_rotas: boolean
  can_approve_requests: boolean
  can_view_all_homes: boolean
  can_manage_homes: boolean
  can_use_ai_solver: boolean
  can_allocate_homes: boolean
}

// Home types
export interface Home {
  id: string
  name: string
  location: Location
  manager_id: string | { id: string; name: string; email: string }
  contact_info: ContactInfo
  capacity: number
  operating_hours: OperatingHours
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Location {
  address: string
  city: string
  postcode: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface ContactInfo {
  phone: string
  email: string
}

export interface OperatingHours {
  start: string
  end: string
}

// Service types
export interface Service {
  id: string
  name: string
  description: string
  home_ids: string[]
  category: ServiceCategory
  required_skills: Skill[]
  min_staff_count: number
  max_staff_count: number
  duration_hours: number
  is_24_hour: boolean
  priority_level: PriorityLevel
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ServiceCategory = 'personal_care' | 'medical' | 'domestic' | 'social' | 'specialist'

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical'

// Shift types
export interface Shift {
  id: string
  service_id: string | { id: string; name: string; category: string }
  date: string
  start_time: string
  end_time: string
  shift_type: ShiftType
  required_staff_count: number
  assigned_staff: StaffAssignment[]
  is_urgent: boolean
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
  duration_hours: number
  status: ShiftStatus
}

export interface StaffAssignment {
  user_id: string
  status: AssignmentStatus
  assigned_at: string
  note?: string
}

export type AssignmentStatus = 'assigned' | 'pending' | 'swapped' | 'declined'

export type ShiftStatus = 'unassigned' | 'understaffed' | 'fully_staffed' | 'overstaffed'

// Weekly Schedule types
export interface WeeklyScheduleShift {
  service_id: string | { id: string; name: string; category: string }
  start_time: string
  end_time: string
  shift_type: ShiftType
  required_staff_count: number
  notes?: string
}

export interface WeeklyScheduleDay {
  is_active: boolean
  shifts: WeeklyScheduleShift[]
}

export interface WeeklySchedule {
  id: string
  home_id: string | { id: string; name: string; location: { city: string } }
  schedule: {
    monday: WeeklyScheduleDay
    tuesday: WeeklyScheduleDay
    wednesday: WeeklyScheduleDay
    thursday: WeeklyScheduleDay
    friday: WeeklyScheduleDay
    saturday: WeeklyScheduleDay
    sunday: WeeklyScheduleDay
  }
  is_active: boolean
  totalWeeklyHours: number
  totalWeeklyShifts: number
  created_at: string
  updated_at: string
}

// Rota types
export interface Rota {
  id: string
  home_id: string
  service_id: string
  week_start_date: string
  week_end_date: string
  status: RotaStatus
  created_by: string
  shifts: string[]
  total_hours: number
  total_shifts: number
  notes?: string
  published_at?: string
  archived_at?: string
  created_at: string
  updated_at: string
  week_number: number
}

export type RotaStatus = 'draft' | 'published' | 'archived'

// Availability types
export interface Availability {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  preferred_shift_type?: ShiftType
  notes?: string
  submitted_at: string
  updated_at: string
}

// Time off types
export interface TimeOffRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string
  request_type: TimeOffType
  status: RequestStatus
  approved_by?: string
  approved_at?: string
  denial_reason?: string
  is_urgent: boolean
  submitted_at: string
  updated_at: string
  duration_days: number
}

export type TimeOffType = 'annual_leave' | 'sick_leave' | 'personal_leave' | 'bereavement' | 'other'

export type RequestStatus = 'pending' | 'approved' | 'denied'

// AI Solver types
export interface AIGenerationRequest {
  week_start_date: string
  week_end_date: string
  home_id: string
  service_id: string
  existing_shifts?: Shift[]
}

export interface AIGenerationResult {
  success: boolean
  assignments: RotaAssignment[]
  total_penalty: number
  constraints_violated: ConstraintViolation[]
  error?: string
}

export interface RotaAssignment {
  shift: Shift
  assignments: StaffAssignment[]
}

export interface ShiftAssignment {
  id: string
  shift_id: string
  user_id: string
  status: AssignmentStatus
  assigned_at: string
  note?: string
}

export interface ConstraintViolation {
  type: string
  shift: string
  message: string
}

// Constraint types
export interface ConstraintWeight {
  id: string
  name: string
  description: string
  category: 'hard' | 'soft'
  weight: number
  is_active: boolean
  applies_to: 'all' | 'specific_home' | 'specific_service' | 'specific_role'
  target_id?: string
  constraint_type: ConstraintType
  parameters: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

export type ConstraintType = 
  | 'no_double_booking'
  | 'respect_time_off'
  | 'min_staff_required'
  | 'max_hours_per_week'
  | 'consecutive_days_limit'
  | 'preferred_shift_types'
  | 'skill_requirements'
  | 'even_distribution'
  | 'avoid_overtime'
  | 'preferred_services'

// API Response types
export interface ApiResponse<T> {
  data?: T
  message: string
  error?: string
  details?: any[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'date' | 'time' | 'number'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  validation?: any
}

// UI types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
export type LoadingSize = 'sm' | 'md' | 'lg'
