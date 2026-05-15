'use client'
import { useState } from 'react'
import { useDashboardStats, useAppointments, useMonthlyRevenue, useAttentionItems } from '@/hooks/useAppointments'
import { toLocalDate } from '@/lib/date'
import ConfirmModal from './ConfirmModal'
import type { Appointment } from '@/types'

interface Props {
  coachId: string
  coachName: string
  onOpenNewApt: () => void
  onViewStudent: (id: string) => void
  onNavigate?: (key: 'schedule' | 'students') => void
  onNewStudent?: () => void
  onNewPackage?: () => void
  refreshKey?: number
}

export default function Dashboard({ coachId, coachName, onOpenNewApt, onViewStudent, onNavigate, onNewStudent, onNewPackage, refreshKey = 0 }: Props) {
  const today = toLocalDate(new Date())
  const stats = useDashboardStats(coachId)
  const { appointments, confirmAttendance } = useAppointments(today, coachId, refreshKey)
  const monthlyRevenue = useMonthlyRevenue(coachId)
  const attentionItems = useAttentionItems(coachId)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [pendingCheckIn, setPendingCheckIn] = useState<Appointment | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'

  const nextApt = appointments.find(a => a.status === 'scheduled')
  const nextTime = nextApt
    ? new Date(nextApt.scheduled_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    : null

  async function doCheckIn(apt: Appointment) {
    if (!apt.student?.id || loadingIds.has(apt.id)) return
    setLoadingIds(prev => new Set(prev).add(apt.id))
    await confirmAttendance(apt.id, apt.student.id)
    setLoadingIds(prev => { const s = new Set(prev); s.delete(apt.id); return s })
  }

  const maxRevenue = Math.max(...monthlyRevenue.map(d => d.revenue), 1)

  return (
  <>
    <div className="bg-white border border-gray-200 rounded overflow-hidden text-sm">
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium tracking-tight">
            BookFit
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-gray-500">{coachName}，{greeting}</span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
            {coachName[0]}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        {/* Main */}
        <div className="p-5 lg:border-r border-gray-100">
          <div className="mb-5">
            <h1 className="text-lg font-medium mb-0.5">
              今天，{new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
            </h1>
            <p className="text-sm text-gray-500">
              {appointments.length > 0
                ? `你有 ${appointments.length} 堂課${nextTime ? `，最近一堂 ${nextTime} 開始` : ''}`
                : '今天沒有課程'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
            {[
              {
                label: '本月收入',
                value: `$${stats.monthly_revenue.toLocaleString()}`,
                sub: stats.monthly_revenue_change_pct > 0
                  ? `↑ ${stats.monthly_revenue_change_pct}% 較上月`
                  : stats.monthly_revenue_change_pct < 0
                  ? `↓ ${Math.abs(stats.monthly_revenue_change_pct)}% 較上月`
                  : stats.monthly_revenue_last === 0 && stats.monthly_revenue === 0
                  ? '本月尚無收入'
                  : '與上月持平',
                subColor: stats.monthly_revenue_change_pct > 0 ? 'text-green-700' : stats.monthly_revenue_change_pct < 0 ? 'text-red-600' : 'text-gray-500',
              },
              {
                label: '活躍學員',
                value: stats.active_students,
                sub: stats.new_students_this_month > 0 ? `本月新增 ${stats.new_students_this_month} 位` : '本月無新學員',
                subColor: 'text-gray-500',
              },
              {
                label: '本月課堂',
                value: stats.monthly_sessions,
                sub: `待上 ${stats.today_pending} 堂`,
                subColor: 'text-gray-500',
              },
              {
                label: '爽約率',
                value: `${stats.no_show_rate}%`,
                sub: stats.monthly_no_shows > 0 ? `本月 ${stats.monthly_no_shows} 次` : '本月無爽約',
                subColor: stats.monthly_no_shows > 0 ? 'text-gray-500' : 'text-green-700',
              },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded p-3.5">
                <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">{s.label}</div>
                <div className="text-[22px] font-medium text-gray-900 mb-0.5">{s.value}</div>
                <div className={`text-[11px] ${s.subColor}`}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Today's appointments */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-medium">今日課程</span>
            <button onClick={() => onNavigate?.('schedule')} className="text-xs text-gray-500 hover:text-gray-900">查看全部 →</button>
          </div>

          <div className="flex flex-col gap-1.5 mb-5">
            {appointments.length === 0 && (
              <p className="text-sm text-gray-500 py-4 text-center">今天沒有課程</p>
            )}
            {appointments.map(apt => {
              const isDone = apt.status === 'completed'
              const isNS = apt.status === 'no_show'
              const remaining = apt.package?.remaining_sessions ?? 0
              const time = new Date(apt.scheduled_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })

              return (
                <div
                  key={apt.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${isDone || isNS ? 'opacity-50' : ''} ${isNS ? 'border-red-100' : 'border-gray-100'}`}
                  onClick={() => apt.student && onViewStudent(apt.student.id)}
                >
                  <StudentAvatar name={apt.student?.name ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{apt.student?.name}</div>
                    <div className="text-[11px] text-gray-500">{apt.student?.goal} · 60 分鐘</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">{time}</span>
                    <SessionsBadge count={remaining} />
                    {!isDone && !isNS && (
                      <button
                        onClick={e => { e.stopPropagation(); setPendingCheckIn(apt) }}
                        disabled={loadingIds.has(apt.id)}
                        className="w-6 h-6 rounded-full border border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700 flex items-center justify-center text-gray-300 transition-all disabled:opacity-50"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 16 16"><path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    )}
                    {isDone && <span className="text-[11px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full">已到課</span>}
                    {isNS && <span className="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded-full">爽約</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Revenue chart – hidden below lg */}
          <div className="hidden lg:block">
            <div className="text-[13px] font-medium mb-2.5">近六個月收入</div>
            <div className="flex items-end gap-1.5 h-16">
              {monthlyRevenue.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    title={`NT$${d.revenue.toLocaleString()}`}
                    className={`w-full rounded-t-sm transition-all ${i === monthlyRevenue.length - 1 ? 'bg-indigo-500' : 'bg-gray-200'}`}
                    style={{ height: `${Math.max(Math.round((d.revenue / maxRevenue) * 60), d.revenue > 0 ? 2 : 0)}px` }}
                  />
                  <span className="text-[10px] text-gray-500">{d.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="p-5 border-t lg:border-t-0 border-gray-100">
          <div className="mb-5">
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2.5">快速操作</div>
            {[
              { label: '新增預約', icon: '＋',  color: 'bg-indigo-50 text-indigo-600', onClick: onOpenNewApt },
              { label: '新增學員', icon: '👤', color: 'bg-green-50 text-green-700',   onClick: onNewStudent ?? (() => {}) },
              { label: '新增堂數包', icon: '📦', color: 'bg-orange-50 text-orange-700', onClick: onNewPackage ?? (() => {}) },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 border border-gray-100 rounded text-[13px] text-left text-gray-900 hover:bg-gray-50 mb-1.5 transition-colors"
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${btn.color}`}>
                  {btn.icon}
                </div>
                {btn.label}
              </button>
            ))}
          </div>

          <div className="h-px bg-gray-50 mb-4" />

          <div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-2">需要處理</div>
            {attentionItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-2 text-center">目前沒有待處理項目 🎉</p>
            ) : attentionItems.map((item, i) => {
              const isLow = item.type === 'low_sessions'
              const dot = isLow && item.remaining === 1 ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-indigo-500'
              const sub = isLow
                ? item.remaining === 1
                  ? ' 剩最後 1 堂，上完就清空'
                  : ` 剩 ${item.remaining} 堂，建議本週跟進`
                : ` 已 ${item.daysSince} 天未上課，考慮主動聯繫`
              return (
                <div
                  key={i}
                  className="flex gap-2 p-2.5 rounded bg-gray-50 mb-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onViewStudent(item.studentId)}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-900">{item.studentName}</span>{sub}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>

    {pendingCheckIn && (
      <ConfirmModal
        title="確認到課"
        message={`確認 ${pendingCheckIn.student?.name} 今日到課並扣除 1 堂？`}
        confirmLabel="確認到課"
        onConfirm={() => { doCheckIn(pendingCheckIn); setPendingCheckIn(null) }}
        onCancel={() => setPendingCheckIn(null)}
      />
    )}
  </>
  )
}

// ── Shared sub-components ──────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-600',
  'bg-green-100 text-green-700',
  'bg-pink-100 text-pink-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
]

export function StudentAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colorIdx = name.charCodeAt(0) % AVATAR_COLORS.length
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sizeClass} ${AVATAR_COLORS[colorIdx]} rounded-full flex items-center justify-center font-medium shrink-0`}>
      {name[0]}
    </div>
  )
}

export function SessionsBadge({ count }: { count: number }) {
  if (count <= 1) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 font-medium">剩 {count} 堂</span>
  if (count <= 3) return <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">剩 {count} 堂</span>
  return <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">剩 {count} 堂</span>
}
