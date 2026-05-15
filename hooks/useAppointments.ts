// hooks/useAppointments.ts
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Appointment, AppointmentStatus } from '@/types'

export function useAppointments(date: string, coachId: string, refreshKey = 0, endDate?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAppointments()
  }, [date, endDate, coachId, refreshKey])

  async function fetchAppointments() {
    setLoading(true)
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate ?? date)
    end.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('appointments')
      .select(`*, student:students(*), package:session_packages(*)`)
      .eq('coach_id', coachId)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at')

    if (!error && data) setAppointments(data)
    setLoading(false)
  }

  async function updateStatus(id: string, status: AppointmentStatus) {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status } : a)
      )
    }
    return !error
  }

  // 確認到課：更新狀態 + FIFO 扣點（優先扣最快到期 / 最舊的堂數包）
  async function confirmAttendance(appointmentId: string, studentId: string) {
    const ok = await updateStatus(appointmentId, 'completed')
    if (!ok) return false

    const { data: usedPackageId, error } = await supabase.rpc('deduct_session_fifo', {
      p_student_id: studentId,
    })
    if (error) return false

    // Write back which package was actually used
    if (usedPackageId) {
      await supabase.from('appointments').update({ package_id: usedPackageId }).eq('id', appointmentId)
    }
    // Re-fetch to get accurate package.remaining_sessions for the badge
    const { data } = await supabase
      .from('appointments')
      .select('*, student:students(*), package:session_packages(*)')
      .eq('id', appointmentId)
      .single()
    if (data) setAppointments(prev => prev.map(a => a.id === appointmentId ? data as Appointment : a))
    return true
  }

  async function deleteAppointment(id: string) {
    await supabase.from('session_logs').delete().eq('appointment_id', id)
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (!error) setAppointments(prev => prev.filter(a => a.id !== id))
    return !error
  }

  async function updateAppointment(id: string, updates: { scheduled_at?: string; duration_minutes?: number; notes?: string }) {
    const { error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)

    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    }
    return !error
  }

  return { appointments, loading, updateStatus, confirmAttendance, deleteAppointment, updateAppointment, refetch: fetchAppointments }
}

export function useStudents(coachId: string) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('students')
      .select('*, session_packages(remaining_sessions, total_sessions)')
      .eq('coach_id', coachId)
      .order('name')
      .then(({ data }) => {
        if (data) setStudents(data as any)
        setLoading(false)
      })
  }, [coachId, refreshKey])

  return { students, loading, refetch: () => setRefreshKey(k => k + 1) }
}

export function useStudentDetail(studentId: string) {
  const [student, setStudent] = useState(null)
  const [packages, setPackages] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('session_packages').select('*').eq('student_id', studentId).order('paid_at', { ascending: false }),
      supabase.from('appointments')
        .select('id, scheduled_at, status, notes, package_id, package:session_packages(price_per_session), session_logs(id, weight_kg, body_fat_pct, training_notes, exercises, logged_at)')
        .eq('student_id', studentId)
        .in('status', ['completed', 'no_show'])
        .order('scheduled_at', { ascending: false })
        .limit(30),
    ]).then(([s, p, l]) => {
      if (s.data) setStudent(s.data as any)
      if (p.data) setPackages(p.data as any)
      if (l.data) setLogs(l.data as any)
      setLoading(false)
    })
  }, [studentId, refreshKey])

  return { student, packages, logs, loading, refetch: () => setRefreshKey(k => k + 1) }
}

export function useStudentLastSeen(coachId: string): Map<string, Date> {
  const [lastSeenMap, setLastSeenMap] = useState(new Map<string, Date>())

  useEffect(() => {
    supabase
      .from('appointments')
      .select('student_id, scheduled_at')
      .eq('coach_id', coachId)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .then(({ data }) => {
        const map = new Map<string, Date>()
        for (const apt of data ?? []) {
          if (!map.has(apt.student_id)) map.set(apt.student_id, new Date(apt.scheduled_at))
        }
        setLastSeenMap(map)
      })
  }, [coachId])

  return lastSeenMap
}

export function useMonthlyRevenue(coachId: string) {
  const [data, setData] = useState<{ month: string; revenue: number }[]>([])

  useEffect(() => {
    async function load() {
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      start.setMonth(start.getMonth() - 5)

      const { data: pkgs } = await supabase
        .from('session_packages')
        .select('total_paid, paid_at')
        .eq('coach_id', coachId)
        .gte('paid_at', start.toISOString())
        .not('paid_at', 'is', null)

      const buckets = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        return {
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          month: `${d.getMonth() + 1}月`,
          revenue: 0,
        }
      })

      for (const pkg of pkgs ?? []) {
        const d = new Date(pkg.paid_at!)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const bucket = buckets.find(b => b.key === key)
        if (bucket) bucket.revenue += pkg.total_paid ?? 0
      }

      setData(buckets.map(({ month, revenue }) => ({ month, revenue })))
    }
    load()
  }, [coachId])

  return data
}

export type AttentionItem = {
  type: 'low_sessions' | 'inactive'
  studentId: string
  studentName: string
  remaining?: number
  daysSince?: number
}

export function useAttentionItems(coachId: string) {
  const [items, setItems] = useState<AttentionItem[]>([])

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [{ data: pkgs }, { data: recentApts }, { data: oldApts }] = await Promise.all([
        supabase
          .from('session_packages')
          .select('remaining_sessions, student:students(id, name)')
          .eq('coach_id', coachId)
          .lte('remaining_sessions', 3)
          .gt('remaining_sessions', 0)
          .order('remaining_sessions'),

        supabase
          .from('appointments')
          .select('student_id')
          .eq('coach_id', coachId)
          .eq('status', 'completed')
          .gte('scheduled_at', thirtyDaysAgo.toISOString()),

        supabase
          .from('appointments')
          .select('student_id, scheduled_at, student:students(id, name)')
          .eq('coach_id', coachId)
          .eq('status', 'completed')
          .lt('scheduled_at', thirtyDaysAgo.toISOString())
          .order('scheduled_at', { ascending: false }),
      ])

      const result: AttentionItem[] = []
      const usedStudentIds = new Set<string>()

      for (const pkg of pkgs ?? []) {
        const student = pkg.student as any
        if (!student || usedStudentIds.has(student.id)) continue
        usedStudentIds.add(student.id)
        result.push({ type: 'low_sessions', studentId: student.id, studentName: student.name, remaining: pkg.remaining_sessions })
      }

      const recentIds = new Set(recentApts?.map(a => a.student_id) ?? [])
      const seenInactive = new Set<string>()

      for (const apt of oldApts ?? []) {
        if (recentIds.has(apt.student_id) || usedStudentIds.has(apt.student_id) || seenInactive.has(apt.student_id)) continue
        seenInactive.add(apt.student_id)
        const student = apt.student as any
        if (!student) continue
        const daysSince = Math.floor((Date.now() - new Date(apt.scheduled_at).getTime()) / (1000 * 60 * 60 * 24))
        result.push({ type: 'inactive', studentId: student.id, studentName: student.name, daysSince })
      }

      setItems(result.slice(0, 5))
    }
    load()
  }, [coachId])

  return items
}

export function useDashboardStats(coachId: string) {
  const [stats, setStats] = useState({
    today_total: 0,
    today_completed: 0,
    today_no_show: 0,
    today_pending: 0,
    monthly_revenue: 0,
    monthly_revenue_last: 0,
    monthly_revenue_change_pct: 0,
    active_students: 0,
    new_students_this_month: 0,
    monthly_sessions: 0,
    monthly_no_shows: 0,
    no_show_rate: 0,
  })

  useEffect(() => {
    supabase.rpc('get_dashboard_stats', { p_coach_id: coachId })
      .then(({ data }) => { if (data) setStats(data) })
  }, [coachId])

  return stats
}
