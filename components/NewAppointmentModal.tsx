'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StudentAvatar } from './Dashboard'
import { toLocalDate } from '@/lib/date'
import type { Student } from '@/types'

interface Props {
  coachId: string
  students: Student[]
  preselectedStudentId?: string
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18]

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toLocalDate(d)
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function NewAppointmentModal({ coachId, students, preselectedStudentId, onClose, onSuccess }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId ?? '')
  const [date, setDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return toLocalDate(d)
  })
  const [selectedTime, setSelectedTime] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [sendReminder, setSendReminder] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [remainingMap, setRemainingMap] = useState<Record<string, number> | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const selectedStudent = students.find(s => s.id === selectedStudentId)

  // Fetch coach's weekly schedule (once)
  const [weeklyHours, setWeeklyHours] = useState<Record<string, number[]> | null>(null)
  useEffect(() => {
    supabase.from('coaches').select('available_hours').eq('id', coachId).single()
      .then(({ data }) => {
        if (data?.available_hours) {
          setWeeklyHours(data.available_hours as Record<string, number[]>)
        } else {
          const def: Record<string, number[]> = {}
          for (let d = 0; d < 7; d++) def[String(d)] = [...DEFAULT_HOURS]
          setWeeklyHours(def)
        }
      })
  }, [coachId])

  // Recompute available slots when date or weekly schedule changes
  useEffect(() => {
    if (!weeklyHours) return
    async function computeSlots() {
      // Use local date parse to avoid UTC offset shifting the day
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
      const hoursForDay = weeklyHours![String(dayOfWeek)] ?? []

      const { data: taken } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .eq('coach_id', coachId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', `${date}T00:00:00`)
        .lte('scheduled_at', `${date}T23:59:59`)

      const takenHours = new Set(taken?.map(a => new Date(a.scheduled_at).getHours()) ?? [])
      const slots = hoursForDay
        .filter(h => !takenHours.has(h))
        .map(h => `${String(h).padStart(2, '0')}:00`)

      setAvailableSlots(slots)
      setSelectedTime(prev => slots.includes(prev) ? prev : (slots[0] ?? ''))
    }
    computeSlots()
  }, [date, coachId, weeklyHours])

  useEffect(() => {
    supabase
      .from('session_packages')
      .select('student_id, remaining_sessions')
      .eq('coach_id', coachId)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, number> = {}
        for (const pkg of data) {
          map[pkg.student_id] = Math.max(map[pkg.student_id] ?? 0, pkg.remaining_sessions)
        }
        setRemainingMap(map)
      })
  }, [coachId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!selectedStudentId || !selectedTime) return
    if (remainingMap !== null && (remainingMap[selectedStudentId] ?? 0) === 0) return
    setSaving(true)

    const [h, m] = selectedTime.split(':').map(Number)
    const scheduledAt = new Date(date)
    scheduledAt.setHours(h, m, 0, 0)

    // Pre-link to the FIFO package (expires_at soonest first, then oldest paid_at)
    // confirmAttendance re-selects FIFO at confirmation time; this is just for the badge preview
    const { data: pkg } = await supabase
      .from('session_packages')
      .select('id')
      .eq('student_id', selectedStudentId)
      .gt('remaining_sessions', 0)
      .order('expires_at', { ascending: true })
      .order('paid_at', { ascending: true })
      .limit(1)
      .single()

    const { error } = await supabase.from('appointments').insert({
      coach_id: coachId,
      student_id: selectedStudentId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: duration,
      notes,
      status: 'scheduled',
      reminded_48h: false,
      reminded_24h: false,
      package_id: pkg?.id ?? null,
    })

    if (!error) {
      setSaved(true)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90svh]" onClick={e => e.stopPropagation()}>
        {!saved ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <span className="text-[15px] font-medium">新增預約</span>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded hover:bg-gray-50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Student selector */}
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-2">選擇學員</label>
                <div className="flex flex-wrap gap-2">
                  {students.map(s => {
                    const remaining = remainingMap?.[s.id] ?? 0
                    const hasPackage = remainingMap !== null && s.id in remainingMap
                    const noSessions = remainingMap !== null && (!hasPackage || remaining === 0)
                    const isSel = selectedStudentId === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => !noSessions && setSelectedStudentId(s.id)}
                        disabled={noSessions}
                        title={noSessions ? '堂數為 0，請先購買堂數包' : undefined}
                        className={`flex items-center gap-1.5 px-3 py-2 border rounded-full text-sm transition-all min-h-[36px] ${
                          noSessions
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                            : isSel
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-600 font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium ${noSessions ? 'bg-gray-50 text-gray-300' : 'bg-indigo-100 text-indigo-600'}`}>
                          {s.name[0]}
                        </div>
                        {s.name}
                        {noSessions && <span className="text-[9px] text-gray-300">（0 堂）</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date + Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">日期</label>
                  <div className="flex items-center border border-gray-200 rounded overflow-hidden min-h-[44px]">
                    <button
                      type="button"
                      onClick={() => setDate(shiftDate(date, -1))}
                      className="px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0 text-lg leading-none"
                    >‹</button>
                    <span className="flex-1 text-center text-sm text-gray-900 select-none">
                      {formatDateLabel(date)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDate(shiftDate(date, 1))}
                      className="px-3 py-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors shrink-0 text-lg leading-none"
                    >›</button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">時長</label>
                  <select
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 text-gray-900 min-h-[44px]"
                  >
                    <option value={45}>45 分鐘</option>
                    <option value={60}>60 分鐘</option>
                    <option value={90}>90 分鐘</option>
                  </select>
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-2">時間段</label>
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-gray-500 py-3 text-center">今日無可用時段</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 text-sm border rounded transition-all min-h-[44px] ${
                          selectedTime === t
                            ? 'border-indigo-400 bg-indigo-500 text-white font-medium'
                            : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1.5">僅顯示可預約時段，已預約時段不列出</p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">訓練備注（選填）</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. 今天重點做腿部訓練，注意右膝…"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-300"
                />
              </div>

              {/* Email reminder toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="text-[13px] text-gray-900">自動發 Email 提醒</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">課前 48hr 及 24hr 自動寄送提醒信</div>
                </div>
                <button
                  onClick={() => setSendReminder(!sendReminder)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${sendReminder ? 'bg-indigo-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sendReminder ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-100 shrink-0">
              <button onClick={onClose} className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedStudentId || !selectedTime || saving || (remainingMap !== null && (remainingMap[selectedStudentId] ?? 0) === 0)}
                className="text-xs px-5 py-2 bg-indigo-500 text-white rounded font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '建立中…' : '建立預約'}
              </button>
            </div>
          </>
        ) : (
          // Success state
          <div className="flex flex-col items-center text-center p-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-[16px] font-medium mb-1">預約已建立</div>
              <div className="text-sm text-gray-500">
                {selectedStudent?.name} · {new Date(date).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })} {selectedTime}
                {sendReminder && <><br />Email 提醒已排程</>}
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 text-gray-500">已加入行事曆</span>
              {sendReminder && <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">Email 提醒已設</span>}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setSaved(false)} className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                繼續新增
              </button>
              <button onClick={() => { onSuccess(); onClose() }} className="text-xs px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700">
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
