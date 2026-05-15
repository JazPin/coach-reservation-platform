'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StudentAvatar } from './Dashboard'
import type { Student } from '@/types'

interface Props {
  coachId: string
  students: Student[]
  preselectedStudentId?: string
  onClose: () => void
  onSuccess?: () => void
}

const SESSION_PRESETS = [8, 16, 24]
const DEFAULT_PRICE = 2000

export default function PackageForm({ coachId, students, preselectedStudentId, onClose, onSuccess }: Props) {
  const [isTrial, setIsTrial] = useState(false)
  const [studentId, setStudentId] = useState(preselectedStudentId ?? '')
  const [sessions, setSessions] = useState(16)
  const [customSessions, setCustomSessions] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [pricePerSession, setPricePerSession] = useState(DEFAULT_PRICE)
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const actualSessions = isTrial ? 1 : (isCustom ? (parseInt(customSessions) || 0) : sessions)
  const totalPaid = isTrial ? 0 : actualSessions * pricePerSession

  const selectedStudent = students.find(s => s.id === studentId)

  function switchType(trial: boolean) {
    setIsTrial(trial)
    setError('')
  }

  function pickPreset(n: number) {
    setIsCustom(false)
    setSessions(n)
  }

  function pickCustom() {
    setIsCustom(true)
    setCustomSessions(String(sessions))
  }

  async function handleSave() {
    if (!studentId || actualSessions <= 0) return
    setSaving(true)
    setError('')

    const { error: dbError } = await supabase.from('session_packages').insert({
      coach_id: coachId,
      student_id: studentId,
      total_sessions: actualSessions,
      remaining_sessions: actualSessions,
      price_per_session: isTrial ? 0 : pricePerSession,
      total_paid: totalPaid,
      paid_at: isTrial ? null : paidAt,
    })

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    onSuccess?.()
    setSaving(false)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-8 flex flex-col items-center text-center gap-4" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24">
              <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-[16px] font-medium mb-1">
              {isTrial ? '體驗課已建立' : '堂數包已建立'}
            </div>
            <div className="text-sm text-gray-500">
              {selectedStudent?.name} · {actualSessions} 堂
              {isTrial ? ' · 免費體驗' : ` · NT$${totalPaid.toLocaleString()}`}
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { setSaved(false); setStudentId(''); setIsTrial(false) }}
              className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
            >
              繼續新增
            </button>
            <button onClick={onClose} className="text-xs px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-700">
              完成
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="text-[15px] font-medium">新增堂數包</span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded hover:bg-gray-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 類型切換 */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => switchType(false)}
              className={`flex-1 py-2 text-xs font-medium rounded transition-all ${
                !isTrial ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              一般課程
            </button>
            <button
              onClick={() => switchType(true)}
              className={`flex-1 py-2 text-xs font-medium rounded transition-all ${
                isTrial ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              體驗課
            </button>
          </div>

          {isTrial && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs text-amber-700">體驗課為 1 堂免費課程，不計入收款紀錄。</span>
            </div>
          )}

          {/* 選學員 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">
              學員 <span className="text-red-400">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStudentId(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs transition-all ${
                    studentId === s.id
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-600 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-medium">
                    {s.name[0]}
                  </div>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* 堂數（一般課程才顯示選擇） */}
          {isTrial ? (
            <div className="flex items-center justify-between py-2 border border-gray-100 rounded-lg px-4">
              <span className="text-xs text-gray-500">堂數</span>
              <span className="text-sm font-medium text-gray-900">1 堂</span>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2">堂數</label>
              <div className="flex gap-2">
                {SESSION_PRESETS.map(n => (
                  <button
                    key={n}
                    onClick={() => pickPreset(n)}
                    className={`flex-1 py-2 text-xs border rounded font-medium transition-all ${
                      !isCustom && sessions === n
                        ? 'border-indigo-400 bg-indigo-500 text-white'
                        : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                    }`}
                  >
                    {n} 堂
                  </button>
                ))}
                <button
                  onClick={pickCustom}
                  className={`flex-1 py-2 text-xs border rounded font-medium transition-all ${
                    isCustom
                      ? 'border-indigo-400 bg-indigo-500 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  自訂
                </button>
              </div>
              {isCustom && (
                <input
                  type="number"
                  min={1}
                  value={customSessions}
                  onChange={e => setCustomSessions(e.target.value)}
                  placeholder="輸入堂數…"
                  className="mt-2 w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
                />
              )}
            </div>
          )}

          {/* 單價 + 日期（一般課程才顯示） */}
          {!isTrial && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">每堂單價</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">NT$</span>
                  <input
                    type="number"
                    min={0}
                    value={pricePerSession}
                    onChange={e => setPricePerSession(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">付款日期</label>
                <input
                  type="date"
                  value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 text-gray-900"
                />
              </div>
            </div>
          )}

          {/* 收款總計預覽 */}
          {isTrial ? (
            <div className="flex items-center justify-between bg-amber-50 rounded px-4 py-3">
              <div>
                <div className="text-[11px] text-amber-600 mb-0.5">收款總計</div>
                <div className="text-[22px] font-medium text-amber-700">免費</div>
              </div>
              <div className="text-right text-xs text-amber-600">
                <div>1 堂體驗課</div>
                <div className="mt-0.5">不計入收款</div>
              </div>
            </div>
          ) : (
            actualSessions > 0 && pricePerSession > 0 && (
              <div className="flex items-center justify-between bg-gray-50 rounded px-4 py-3">
                <div>
                  <div className="text-[11px] text-gray-500 mb-0.5">收款總計</div>
                  <div className="text-[22px] font-medium text-gray-900">NT${totalPaid.toLocaleString()}</div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{actualSessions} 堂 × NT${pricePerSession.toLocaleString()}</div>
                  <div className="mt-0.5 text-indigo-600">現金收款</div>
                </div>
              </div>
            )
          )}

          {/* 備注 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">備注（選填）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={isTrial ? 'e.g. 來自 IG 廣告、朋友介紹…' : 'e.g. 4月促銷方案、現金付清…'}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded mb-3">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!studentId || actualSessions <= 0 || saving}
              className="text-xs px-5 py-2 bg-indigo-500 text-white rounded font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '建立中…' : isTrial ? '建立體驗課' : `建立 ${actualSessions > 0 ? `${actualSessions} 堂包` : '堂數包'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
