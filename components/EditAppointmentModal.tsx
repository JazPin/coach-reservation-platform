'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StudentAvatar } from './Dashboard'
import { toLocalDate } from '@/lib/date'
import type { Appointment } from '@/types'

interface Props {
  coachId: string
  appointment: Appointment
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

export default function EditAppointmentModal({ coachId, appointment, onClose, onSuccess }: Props) {
  const aptDate = new Date(appointment.scheduled_at)
  const initDate = toLocalDate(aptDate)
  const initTime = `${String(aptDate.getHours()).padStart(2, '0')}:00`

  const [date, setDate] = useState(initDate)
  const [selectedTime, setSelectedTime] = useState(initTime)
  const [duration, setDuration] = useState(appointment.duration_minutes)
  const [notes, setNotes] = useState(appointment.notes ?? '')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    if (!weeklyHours) return
    async function computeSlots() {
      const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
      const hoursForDay = weeklyHours![String(dayOfWeek)] ?? []

      const { data: taken } = await supabase
        .from('appointments')
        .select('scheduled_at')
        .eq('coach_id', coachId)
        .eq('status', 'scheduled')
        .neq('id', appointment.id)
        .gte('scheduled_at', `${date}T00:00:00`)
        .lte('scheduled_at', `${date}T23:59:59`)

      const takenHours = new Set(taken?.map(a => new Date(a.scheduled_at).getHours()) ?? [])
      const slots = hoursForDay
        .filter(h => !takenHours.has(h))
        .map(h => `${String(h).padStart(2, '0')}:00`)

      // On the original date, always include the original time slot
      if (date === initDate && !slots.includes(initTime)) {
        slots.push(initTime)
        slots.sort()
      }

      setAvailableSlots(slots)
      setSelectedTime(prev => slots.includes(prev) ? prev : (slots[0] ?? ''))
    }
    computeSlots()
  }, [date, coachId, weeklyHours])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSave() {
    if (!selectedTime) return
    setSaving(true)

    const [h] = selectedTime.split(':').map(Number)
    const scheduledAt = new Date(`${date}T00:00:00`)
    scheduledAt.setHours(h, 0, 0, 0)

    const { error } = await supabase
      .from('appointments')
      .update({
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: duration,
        notes,
        reminded_48h: false,
        reminded_24h: false,
      })
      .eq('id', appointment.id)

    setSaving(false)
    if (!error) {
      onSuccess()
      onClose()
    }
  }

  const hasChanges =
    date !== initDate ||
    selectedTime !== initTime ||
    duration !== appointment.duration_minutes ||
    notes !== (appointment.notes ?? '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90svh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="text-[15px] font-medium">修改預約</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Student (read-only) */}
          <div>
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block mb-2">學員</label>
            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-lg">
              <StudentAvatar name={appointment.student?.name ?? '?'} size="sm" />
              <span className="text-sm text-gray-700">{appointment.student?.name}</span>
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
              <p className="text-xs text-gray-500 py-3 text-center">此日無可用時段</p>
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
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedTime || saving || !hasChanges}
            className="text-xs px-5 py-2 bg-indigo-500 text-white rounded font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '儲存中…' : '儲存變更'}
          </button>
        </div>
      </div>
    </div>
  )
}
