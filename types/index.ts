export type AppointmentStatus = 'scheduled' | 'completed' | 'no_show'

export interface Student {
  id: string
  coach_id: string
  name: string
  phone?: string
  email?: string
  goal?: string
  notes?: string
  injury_notes?: string
  session_frequency?: string
  created_at: string
}

export interface SessionPackage {
  id: string
  student_id: string
  coach_id: string
  total_sessions: number
  remaining_sessions: number
  price_per_session: number
  total_paid: number
  paid_at: string
  expires_at?: string
}

export interface Appointment {
  id: string
  student_id: string
  coach_id: string
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  notes?: string
  reminded_48h: boolean
  reminded_24h: boolean
  student?: Student
  package?: SessionPackage
}

export interface SessionLog {
  id: string
  appointment_id: string
  student_id: string
  coach_id: string
  weight_kg?: number
  body_fat_pct?: number
  training_notes?: string
  exercises?: ExerciseEntry[]
  logged_at: string
}

export interface ExerciseEntry {
  name: string
  sets: number
  reps: number
  weight_kg?: number
  notes?: string
}

export interface Coach {
  id: string
  name: string
  email: string
  available_hours?: Record<string, number[]>
  notify_48h: boolean
  notify_24h: boolean
  notify_low_sessions: boolean
  notify_low_threshold: number
  ecpay_merchant_id?: string
  ecpay_hash_key?: string
  ecpay_hash_iv?: string
}

export interface DashboardStats {
  today_total: number
  today_completed: number
  today_no_show: number
  today_pending: number
  monthly_revenue: number
  monthly_revenue_change_pct: number
  active_students: number
  monthly_sessions: number
  no_show_rate: number
}
