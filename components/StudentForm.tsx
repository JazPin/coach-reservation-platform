'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Student } from '@/types'

interface Props {
  coachId: string
  student?: Student
  onClose: () => void
  onSuccess?: () => void
}

const GOALS = ['減脂塑形', '增肌訓練', '體能強化', '產後恢復', '馬拉松備賽', '功能性訓練', '其他']

export default function StudentForm({ coachId, student, onClose, onSuccess }: Props) {
  const isEdit = !!student
  const [form, setForm] = useState({
    name:               student?.name               ?? '',
    phone:              student?.phone              ?? '',
    email:              student?.email              ?? '',
    goal:               student?.goal               ?? '',
    notes:              student?.notes              ?? '',
    injury_notes:       student?.injury_notes       ?? '',
    session_frequency:  student?.session_frequency  ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function set(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    setError('')

    if (!isEdit) {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('coach_id', coachId)
      if (count !== null && count >= 5) {
        setError('免費方案最多 5 位學員，請升級專業方案以新增更多學員。')
        setSaving(false)
        return
      }
    }

    const payload = { ...form, coach_id: coachId }
    const { error: dbError } = isEdit
      ? await supabase.from('students').update(payload).eq('id', student!.id)
      : await supabase.from('students').insert(payload)

    if (dbError) {
      setError(dbError.message)
      setSaving(false)
      return
    }

    onSuccess?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[15px] font-medium">{isEdit ? '編輯學員' : '新增學員'}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 rounded hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>
          )}
          {/* 姓名 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="學員姓名"
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* 電話 + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">電話</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="09XX-XXX-XXX"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="name@email.com"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* 訓練目標 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">訓練目標</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {GOALS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('goal', g)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    form.goal === g
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-600 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <input
              value={GOALS.includes(form.goal) ? '' : form.goal}
              onChange={e => set('goal', e.target.value)}
              placeholder="或自行輸入目標…"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 text-gray-900"
            />
          </div>

          {/* 上課頻率 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">上課頻率</label>
            <div className="flex flex-wrap gap-1.5">
              {['每週 1 次', '每週 2 次', '每週 3 次', '每週 4 次', '每天'].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('session_frequency', form.session_frequency === f ? '' : f)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    form.session_frequency === f
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-600 font-medium'
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 傷病備注 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              傷病備注
              <span className="ml-1.5 text-[10px] normal-case text-gray-500 font-normal">（教練可見，提醒訓練注意事項）</span>
            </label>
            <textarea
              value={form.injury_notes}
              onChange={e => set('injury_notes', e.target.value)}
              rows={2}
              placeholder="e.g. 右膝曾動手術，深蹲重量不超過體重的 1.2 倍…"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-300"
            />
          </div>

          {/* 教練備忘 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">教練備忘</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="習慣、偏好、個性備注…"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-indigo-400 text-gray-900 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="text-xs px-5 py-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '儲存中…' : isEdit ? '儲存變更' : '建立學員'}
          </button>
        </div>
      </div>
    </div>
  )
}
