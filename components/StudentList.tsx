'use client'
import { useState } from 'react'
import { StudentAvatar, SessionsBadge } from './Dashboard'
import { useStudentLastSeen } from '@/hooks/useAppointments'
import type { Student } from '@/types'

interface Props {
  coachId: string
  students: Student[]
  onViewStudent: (id: string) => void
  onNewStudent: () => void
  onNewPackage: (studentId?: string) => void
}

function effectiveRemaining(student: Student): number {
  const pkgs: { remaining_sessions: number }[] = (student as any).session_packages ?? []
  return pkgs.reduce((sum, p) => sum + p.remaining_sessions, 0)
}

function formatLastSeen(date: Date | undefined): string {
  if (!date) return '尚未上課'
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

const AT_RISK_DAYS = 30

const STUDENT_LIMIT = 5

export default function StudentList({ coachId, students, onViewStudent, onNewStudent, onNewPackage }: Props) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'low' | 'atrisk'>('all')
  const lastSeenMap = useStudentLastSeen(coachId)

  const now = Date.now()

  const lowIds = students
    .filter(s => effectiveRemaining(s) <= 3)
    .map(s => s.id)

  const atRiskIds = students
    .filter(s => {
      const last = lastSeenMap.get(s.id)
      if (!last) return false
      return (now - last.getTime()) / (1000 * 60 * 60 * 24) >= AT_RISK_DAYS
    })
    .map(s => s.id)

  const filtered = students
    .filter(s => s.name.includes(search) || (s.goal ?? '').includes(search))
    .filter(s => {
      if (tab === 'low') return lowIds.includes(s.id)
      if (tab === 'atrisk') return atRiskIds.includes(s.id)
      return true
    })

  const tabs = [
    { key: 'all',    label: `全部（${students.length}）` },
    { key: 'low',    label: `低堂數（${lowIds.length}）` },
    { key: 'atrisk', label: `高風險（${atRiskIds.length}）` },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden text-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3.5 border-b border-gray-100">
        <span className="text-[15px] font-medium">學員管理</span>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋學員…"
              className="w-full sm:w-44 pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="relative group shrink-0">
            <button
              onClick={onNewStudent}
              disabled={students.length >= STUDENT_LIMIT}
              className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-3.5 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              新增學員
            </button>
            {students.length >= STUDENT_LIMIT && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-gray-900 text-white text-[11px] px-3 py-2 rounded shadow-lg z-10 hidden group-hover:block">
                免費方案上限 5 位，請升級專業方案
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 px-5 border-b border-gray-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`text-xs py-2.5 mr-5 border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-indigo-400 text-gray-900 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-14 text-gray-500">
            <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeWidth="1"/>
              <circle cx="9" cy="7" r="4" strokeWidth="1"/>
            </svg>
            <p className="text-sm">沒有符合的學員</p>
          </div>
        )}

        {filtered.map(student => {
          const pkgs: any[] = (student as any).session_packages ?? []
          const remaining = effectiveRemaining(student)
          const total = pkgs.reduce((sum: number, p: any) => sum + p.total_sessions, 0)
          const pct = total > 0 ? Math.round((remaining / total) * 100) : 0
          const lastDate = lastSeenMap.get(student.id)
          const isAtRisk = atRiskIds.includes(student.id)
          const daysSince = lastDate
            ? Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            : null

          return (
            <div
              key={student.id}
              onClick={() => onViewStudent(student.id)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              <StudentAvatar name={student.name} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-medium text-gray-900">{student.name}</span>
                  {isAtRisk && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 font-medium">
                      未上課 {daysSince} 天
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{student.goal}</span>
              </div>

              {/* Progress bar */}
              <div className="w-24 hidden sm:block">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>堂數使用</span>
                  <span>{remaining}/{total}</span>
                </div>
                <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${remaining <= 1 ? 'bg-red-400' : remaining <= 3 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="hidden sm:inline text-[11px] text-gray-500">上次 {formatLastSeen(lastDate)}</span>
                <SessionsBadge count={remaining} />

                <button
                  onClick={e => { e.stopPropagation(); onNewPackage(student.id) }}
                  className="text-[11px] px-2.5 py-1 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity whitespace-nowrap"
                >
                  + 補堂數
                </button>

                <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 16 16">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-500">
          共 {filtered.length} 位學員
        </div>
      )}
    </div>
  )
}
