import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReminderEmail, sendLowSessionAlert } from '@/lib/email'

// Service-role client — bypasses RLS, only for server-side cron use
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = adminClient()
  const now = new Date()
  const results = { sent: 0, errors: 0 }

  // Appointment reminders (48h and 24h)
  for (const window of [
    { hours: 48, flag: 'reminded_48h' as const, notifyCol: 'notify_48h' },
    { hours: 24, flag: 'reminded_24h' as const, notifyCol: 'notify_24h' },
  ]) {
    const windowStart = new Date(now.getTime() + (window.hours - 1) * 60 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() + (window.hours + 1) * 60 * 60 * 1000)

    const { data: appointments } = await supabase
      .from('appointments')
      .select(`id, scheduled_at, student_id, coach_id,
        students(name, email),
        coaches(name, notify_48h, notify_24h)`)
      .eq('status', 'scheduled')
      .eq(window.flag, false)
      .gte('scheduled_at', windowStart.toISOString())
      .lte('scheduled_at', windowEnd.toISOString())

    if (!appointments) continue

    for (const apt of appointments) {
      const student = (apt.students as unknown) as { name: string; email?: string } | null
      const coach   = (apt.coaches  as unknown) as { name: string; notify_48h: boolean; notify_24h: boolean } | null

      if (!student?.email) continue
      if (coach && !coach[window.notifyCol as 'notify_48h' | 'notify_24h']) continue

      try {
        await sendReminderEmail({
          to: student.email,
          studentName: student.name,
          coachName: coach?.name ?? '教練',
          scheduledAt: apt.scheduled_at,
          hoursAhead: window.hours as 24 | 48,
        })

        await supabase
          .from('appointments')
          .update({ [window.flag]: true })
          .eq('id', apt.id)

        results.sent++
      } catch {
        results.errors++
      }
    }
  }

  // Daily low-session digest — runs at 9 AM Taipei (UTC+8 = 01:00 UTC)
  const taipeiHour = new Date(now.getTime() + 8 * 60 * 60 * 1000).getUTCHours()
  if (taipeiHour === 9) {
    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, name, email, notify_low_threshold')
      .eq('notify_low_sessions', true)

    for (const coach of coaches ?? []) {
      const { data: pkgs } = await supabase
        .from('session_packages')
        .select('remaining_sessions, student:students(name)')
        .eq('coach_id', coach.id)
        .lte('remaining_sessions', coach.notify_low_threshold)
        .gt('remaining_sessions', 0)

      if (!pkgs?.length) continue

      const students = pkgs.map(p => ({
        name: (p.student as unknown as { name: string } | null)?.name ?? '未知',
        remaining: p.remaining_sessions,
      }))

      try {
        await sendLowSessionAlert({ to: coach.email, coachName: coach.name, students })
      } catch {
        results.errors++
      }
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
