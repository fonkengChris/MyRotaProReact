// User types
export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
  homes: Array<{
    home_id: string | { id: string; name?: string }
    is_default: boolean
  }>
  default_home_id?: string
  type: 'fulltime' | 'parttime' | 'bank'
  min_hours_per_week: number
  is_active: boolean
  skills: Skill[]
  preferred_shift_types: ShiftType[]
  max_hours_per_week: number
  created_at: string
  updated_at: string
}

export type UserRole = 'admin' | 'home_manager' | 'senior_staff' | 'support_worker'

export type Skill = 'medication' | 'personal_care' | 'domestic_support' | 'social_support' | 'specialist_care'

export type ShiftType = 'morning' | 'afternoon' | 'evening' | 'night' | 'overtime' | 'long_day' | 'none' | 'split'

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
  homes?: Array<{
    home_id: string | { id: string; name?: string }
    is_default: boolean
  }>
  type?: 'fulltime' | 'parttime' | 'bank'
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
  home_id: string | { id: string; name: string; location: { city: string } }
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

// Shift Swap types
export interface ShiftSwap {
  _id: string
  requester_shift_id: string | Shift
  target_shift_id: string | Shift
  requester_id: string | User
  target_user_id: string | User
  status: ShiftSwapStatus
  requester_message?: string
  response_message?: string
  conflict_check: {
    has_conflict: boolean
    conflict_details: Array<{
      type: string
      conflict_type?: string
      message: string
      user?: string
      conflictingShiftId?: string
      timeOffRequestId?: string
      existingSwapId?: string
      restPeriodMinutes?: number
    }>
  }
  requested_at: string
  responded_at?: string
  completed_at?: string
  expires_at: string
  home_id: string | Home
  created_at: string
  updated_at: string
  isExpired: boolean
  isActive: boolean
}

export type ShiftSwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed'

export interface ShiftSwapRequest {
  requester_shift_id: string
  target_shift_id: string
  requester_message?: string
}

export interface ShiftSwapResponse {
  response_message?: string
}

export interface AvailableSwap {
  user_shift: Shift
  target_shift: Shift
  potential_swappers: Array<{
    user_id: string
    name: string
    email: string
  }>
}

export interface ShiftSwapStats {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  completed: number
}

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
  _id: string
  home_id: string | { _id: string; name: string; location: { city: string } }
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
  user_id: string | User
  start_date: string
  end_date: string
  reason: string
  request_type: TimeOffType
  status: RequestStatus
  approved_by?: string | User
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
  home_ids: string | string[] // Support single home ID or array of home IDs
  service_id: string
  existing_shifts?: Shift[]
}

export interface AIGenerationResult {
  message: string
  data: {
    success: boolean
    assignments: RotaAssignment[]
    total_penalty: number
    constraints_violated: ConstraintViolation[]
    employment_distribution?: {
      fulltime: { total_hours: number; staff_count: number; average_hours: number }
      parttime: { total_hours: number; staff_count: number; average_hours: number }
      bank: { total_hours: number; staff_count: number; average_hours: number }
    }
    homes_processed?: number
    total_homes_considered?: number
    error?: string
  }
  summary?: string
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
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'accent'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral'
export type LoadingSize = 'sm' | 'md' | 'lg'

// Utility functions
export const extractHomeId = (homeId: string | { id: string; name: string; location: { city: string } } | undefined): string | undefined => {
  if (!homeId) return undefined
  if (typeof homeId === 'string') return homeId
  // Handle ObjectId objects by converting to string
  if (typeof homeId === 'object' && homeId !== null) {
    return homeId.id || String(homeId)
  }
  return undefined
}

export const extractUserDefaultHomeId = (user: User | undefined): string | undefined => {
  if (!user || !user.homes || user.homes.length === 0) return undefined
  
  // First try to find a default home
  const defaultHome = user.homes.find(home => home.is_default)
  if (defaultHome) {
    const homeId = defaultHome.home_id
    // Handle both string and object cases
    if (typeof homeId === 'string') return homeId
    if (homeId && typeof homeId === 'object' && homeId.id) return String(homeId.id)
    return String(homeId)
  }
  
  // If no default home, use the first home
  if (user.homes.length > 0) {
    const homeId = user.homes[0].home_id
    // Handle both string and object cases
    if (typeof homeId === 'string') return homeId
    if (homeId && typeof homeId === 'object' && homeId.id) return String(homeId.id)
    return String(homeId)
  }
  
  return undefined
}

export const extractServiceId = (serviceId: string | { id: string; name: string; category: string } | undefined): string | undefined => {
  if (!serviceId) return undefined
  return typeof serviceId === 'string' ? serviceId : serviceId.id
}

export const extractServiceName = (serviceId: string | { id: string; name: string; category: string } | undefined): string | undefined => {
  if (!serviceId) return undefined
  return typeof serviceId === 'string' ? undefined : serviceId.name
}

export const extractManagerId = (managerId: string | { id: string; name: string; email: string } | undefined): string | undefined => {
  if (!managerId) return undefined
  return typeof managerId === 'string' ? managerId : managerId.id
}

// Timetable types
export interface Timetable {
  id: string
  name: string
  description?: string
  home_ids: string[]
  service_id: string
  start_date: string
  end_date: string
  total_weeks: number
  status: 'draft' | 'generating' | 'generated' | 'published' | 'archived'
  generated_by: string
  weekly_rotas: WeeklyRota[]
  total_shifts: number
  total_hours: number
  total_assignments: number
  average_weekly_hours: number
  generation_started_at?: string
  generation_completed_at?: string
  generation_duration_ms?: number
  conflicts_detected: number
  generation_errors: GenerationError[]
  is_public: boolean
  accessible_by_roles: UserRole[]
  accessible_by_users: string[]
  created_at: string
  updated_at: string
}

export interface WeeklyRota {
  week_start_date: string
  week_end_date: string
  week_number: number
  shifts: TimetableShift[]
  total_shifts: number
  total_hours: number
  total_assignments: number
  employment_distribution: EmploymentDistribution
}

export interface TimetableShift {
  shift_id: string
  home_id: string
  service_id: string
  date: string
  start_time: string
  end_time: string
  shift_type: ShiftType
  required_staff_count: number
  assigned_staff: TimetableStaffAssignment[]
  notes?: string
  duration_hours: number
}

export interface TimetableStaffAssignment {
  user_id: string
  name: string
  role: UserRole
  type: 'fulltime' | 'parttime' | 'bank'
  status: string
  assigned_at: string
}

export interface EmploymentDistribution {
  fulltime: {
    total_hours: number
    staff_count: number
    average_hours: number
  }
  parttime: {
    total_hours: number
    staff_count: number
    average_hours: number
  }
  bank: {
    total_hours: number
    staff_count: number
    average_hours: number
  }
}

export interface GenerationError {
  week: number
  error: string
  timestamp: string
}

export interface TimetableCreateRequest {
  name: string
  description?: string
  home_ids: string[]
  service_id: string
  start_date: string
  end_date: string
  total_weeks: number
}

export interface TimetableGenerationStatus {
  status: 'draft' | 'generating' | 'generated' | 'published' | 'archived'
  generation_started_at?: string
  generation_completed_at?: string
  generation_duration_ms?: number
  conflicts_detected: number
  generation_errors: GenerationError[]
}
