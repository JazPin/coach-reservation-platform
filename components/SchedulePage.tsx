'use client'
import { useState } from 'react'
import { useAppointments, useAttentionItems } from '@/hooks/useAppointments'
import { StudentAvatar, SessionsBadge } from './Dashboard'
import ConfirmModal from './ConfirmModal'
import EditAppointmentModal from './EditAppointmentModal'
import { toLocalDate } from '@/lib/date'
import type { Appointment } from '@/types'

interface Props {
  coachId: string
  onViewStudent: (id: string) => void
  onOpenNewApt: () => void
  refreshKey?: number
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function SchedulePage({ coachId, onViewStudent, onOpenNewApt, refreshKey = 0 }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const today = new Date()

  const { appointments, loading, confirmAttendance, updateStatus, deleteAppointment, refetch } = useAppointments(
    toLocalDate(selectedDate), coachId, refreshKey
  )
  const attentionItems = useAttentionItems(coachId)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<Appointment | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null)
  const [pendingEdit, setPendingEdit] = useState<Appointment | null>(null)
  const [toast, setToast] = useState('')

  const calYear = selectedDate.getFullYear()
  const calMonth = selectedDate.getMonth()
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function prevDay() {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1))
  }

  function nextDay() {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
  }

  async function doConfirm(apt: Appointment) {
    if (!apt.student?.id) return
    setConfirming(apt.id)
    const ok = await confirmAttendance(apt.id, apt.student.id)
    if (ok) showToast('已確認到課，扣除 1 堂')
    else showToast('扣點失敗：學員無剩餘堂數')
    setConfirming(null)
  }

  async function handleNoShow(apt: Appointment) {
    await updateStatus(apt.id, 'no_show')
    showToast('已標記爽約')
  }

  const done = appointments.filter(a => a.status === 'completed').length
  const noShow = appointments.filter(a => a.status === 'no_show').length
  const pending = appointments.filter(a => a.status === 'scheduled').length

  const dateLabel = selectedDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
  <>
    <div className="bg-white border border-gray-200 rounded overflow-hidden text-sm">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium">排課管理</span>
          {/* Desktop day navigator */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={prevDay}
              className="w-7 h-7 border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-50"
            >‹</button>
            <span className="text-xs text-gray-500 w-40 text-center">{dateLabel}</span>
            <button
              onClick={nextDay}
              className="w-7 h-7 border border-gray-200 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-50"
            >›</button>
          </div>
          {/* Mobile date picker */}
          <input
            type="date"
            className="sm:hidden text-xs border border-gray-200 rounded px-2 py-1.5 text-gray-500 focus:outline-none focus:border-indigo-400"
            value={toLocalDate(selectedDate)}
            onChange={e => { if (e.target.value) setSelectedDate(new Date(`${e.target.value}T00:00:00`)) }}
          />
        </div>
        <button
          onClick={onOpenNewApt}
          className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3.5 py-2 rounded hover:bg-gray-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          新增預約
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
        {[
          { label: '今日課程', value: appointments.length },
          { label: '已完成', value: done, color: 'text-green-700' },
          { label: '爽約', value: noShow, color: 'text-red-700' },
          { label: '待上課', value: pending },
        ].map(s => (
          <div key={s.label} className="px-5 py-3.5">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{s.label}</div>
            <div className={`text-xl font-medium ${s.color ?? 'text-gray-900'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
        {/* Sidebar calendar – hidden on mobile */}
        <div className="hidden sm:block border-r border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-medium text-gray-900">{calYear}年 {calMonth + 1}月</span>
            <div className="flex gap-1">
              <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700">‹</button>
              <button onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] text-gray-500 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const date = new Date(calYear, calMonth, day)
              const isToday = sameDay(date, today)
              const isSel = sameDay(date, selectedDate)
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`w-full aspect-square flex items-center justify-center rounded text-xs transition-colors
                    ${isToday ? 'bg-gray-900 text-white font-medium' : ''}
                    ${isSel && !isToday ? 'bg-indigo-50 text-indigo-600 font-medium' : ''}
                    ${!isToday && !isSel ? 'text-gray-500 hover:bg-gray-50' : ''}
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">需要注意</div>
            {attentionItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-2 text-center">目前沒有待處理項目</p>
            ) : attentionItems.map((item, i) => {
              const isLow = item.type === 'low_sessions'
              const dot = isLow && item.remaining === 1 ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-indigo-500'
              const msg = isLow
                ? item.remaining === 1 ? '剩最後 1 堂' : `剩 ${item.remaining} 堂，快到期`
                : `${item.daysSince} 天未上課`
              return (
                <div
                  key={i}
                  onClick={() => onViewStudent(item.studentId)}
                  className="flex gap-2 items-start py-1.5 px-2 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${dot}`} />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-900">{item.studentName}</span> {msg}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main appointment list */}
        <div className="relative p-4">
          {toast && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3.5 py-2 rounded z-10 whitespace-nowrap">
              {toast}
            </div>
          )}

          <div className="flex items-baseline gap-2 mb-3.5">
            <h2 className="text-[15px] font-medium">
              {calMonth + 1}月 {selectedDate.getDate()}日，週{DAYS[selectedDate.getDay()]}
            </h2>
            {sameDay(selectedDate, today) && <span className="text-xs text-gray-500">今天</span>}
          </div>

          {loading && <p className="text-sm text-gray-500 py-8 text-center">載入中…</p>}

          {!loading && appointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1"/></svg>
              <p className="text-sm">這天沒有課程安排</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {appointments.map(apt => {
              const isDone = apt.status === 'completed'
              const isNS = apt.status === 'no_show'
              const time = new Date(apt.scheduled_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
              const remaining = apt.package?.remaining_sessions ?? 0

              return (
                <div
                  key={apt.id}
                  className={`border rounded p-3.5 transition-opacity ${isDone ? 'opacity-50' : ''} ${isNS ? 'opacity-50 border-red-100' : 'border-gray-100'}`}
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <StudentAvatar name={apt.student?.name ?? '?'} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => apt.student && onViewStudent(apt.student.id)}>
                      <div className="text-[14px] font-medium truncate">{apt.student?.name}</div>
                      <div className="text-xs text-gray-500">{time} · {apt.duration_minutes} 分鐘 · {apt.student?.goal}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <SessionsBadge count={remaining} />
                      {isDone && <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full">已到課</span>}
                      {isNS && <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full">爽約</span>}
                      {!isDone && !isNS && <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">待上課</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isDone && !isNS ? (
                      <>
                        <button
                          onClick={() => setPendingConfirm(apt)}
                          disabled={confirming === apt.id}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          確認到課
                        </button>
                        <button
                          onClick={() => handleNoShow(apt)}
                          className="text-xs px-2.5 py-1.5 rounded-md border border-red-100 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          標記爽約
                        </button>
                        <button
                          onClick={() => setPendingEdit(apt)}
                          className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                          編輯
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => apt.student && onViewStudent(apt.student.id)}
                        className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        查看紀錄
                      </button>
                    )}
                    <button
                      onClick={() => setPendingDelete(apt)}
                      className="ml-auto text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>

    {pendingConfirm && (
      <ConfirmModal
        title="確認到課"
        message={`確認 ${pendingConfirm.student?.name} 到課並扣除 1 堂？`}
        confirmLabel="確認到課"
        onConfirm={() => { doConfirm(pendingConfirm); setPendingConfirm(null) }}
        onCancel={() => setPendingConfirm(null)}
      />
    )}

    {pendingDelete && (
      <ConfirmModal
        title="刪除預約"
        message={`確定刪除 ${pendingDelete.student?.name} 在 ${new Date(pendingDelete.scheduled_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })} 的預約？此動作無法復原。`}
        confirmLabel="確認刪除"
        onConfirm={async () => { await deleteAppointment(pendingDelete.id); setPendingDelete(null); showToast('預約已刪除') }}
        onCancel={() => setPendingDelete(null)}
      />
    )}

    {pendingEdit && (
      <EditAppointmentModal
        coachId={coachId}
        appointment={pendingEdit}
        onClose={() => setPendingEdit(null)}
        onSuccess={() => { refetch(); showToast('預約已更新') }}
      />
    )}
  </>
  )
}
