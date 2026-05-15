'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  coachId: string
  coachName: string
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-10 h-5 rounded-full transition-colors ${on ? 'bg-indigo-500' : 'bg-gray-200'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
        <span className="text-[14px] font-medium">{title}</span>
        {badge && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium">{badge}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <div className="text-[13px] text-gray-900">{label}</div>
        {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

const ALL_HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6–22
const DAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
const DEFAULT_WEEKLY: Record<string, number[]> = {
  '0': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '1': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '2': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '3': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '4': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '5': [9, 10, 11, 12, 14, 15, 16, 17, 18],
  '6': [9, 10, 11, 12, 14, 15, 16, 17, 18],
}

export default function SettingsPage({ coachId, coachName }: Props) {
  const [name, setName] = useState(coachName)
  const [email, setEmail] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [remind48h, setRemind48h] = useState(true)
  const [remind24h, setRemind24h] = useState(true)
  const [lowSessionAlert, setLowSessionAlert] = useState(true)
  const [lowThreshold, setLowThreshold] = useState(3)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [weeklyHours, setWeeklyHours] = useState<Record<string, number[]>>(DEFAULT_WEEKLY)
  const [savingHours, setSavingHours] = useState(false)
  const [savedHours, setSavedHours] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
    supabase.from('coaches')
      .select('available_hours, notify_48h, notify_24h, notify_low_sessions, notify_low_threshold')
      .eq('id', coachId).single()
      .then(({ data }) => {
        if (data?.available_hours) setWeeklyHours(data.available_hours as Record<string, number[]>)
        if (data) {
          setRemind48h(data.notify_48h ?? true)
          setRemind24h(data.notify_24h ?? true)
          setLowSessionAlert(data.notify_low_sessions ?? true)
          setLowThreshold(data.notify_low_threshold ?? 3)
        }
      })
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('coach_id', coachId)
      .then(({ count }) => { if (count !== null) setStudentCount(count) })
  }, [coachId])

  async function saveNotify(updates: Record<string, boolean | number>) {
    await supabase.from('coaches').update(updates).eq('id', coachId)
  }

  function toggleHour(day: number, hour: number) {
    const key = String(day)
    setWeeklyHours(prev => {
      const current = prev[key] ?? []
      const updated = current.includes(hour)
        ? current.filter(h => h !== hour)
        : [...current, hour].sort((a, b) => a - b)
      return { ...prev, [key]: updated }
    })
  }

  async function handleSaveHours() {
    setSavingHours(true)
    const { error } = await supabase.from('coaches').update({ available_hours: weeklyHours }).eq('id', coachId)
    setSavingHours(false)
    if (!error) {
      setSavedHours(true)
      setTimeout(() => setSavedHours(false), 3000)
    }
  }

  async function handleSaveName() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { error } = await supabase.from('coaches').update({ name: name.trim() }).eq('id', coachId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="mb-2">
        <h1 className="text-[17px] font-medium text-gray-900">設定</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理個人資料與通知偏好</p>
      </div>

      {/* 教練個人資料 */}
      <Section title="教練個人資料">
        <div className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-50">
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-medium shrink-0">
              {name[0] ?? '?'}
            </div>
            <div>
              <button className="text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors">
                上傳頭像
              </button>
              <p className="text-[11px] text-gray-500 mt-1">JPG、PNG，最大 2MB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">姓名</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full text-sm px-3 py-2 border border-gray-100 rounded bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          {/* 學員預約連結 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              學員預約連結
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-100 rounded">
              <span className="text-xs text-gray-400">即將推出，學員可透過專屬連結自助預約</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium shrink-0">即將推出</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveName}
              disabled={saving || !name.trim()}
              className={`text-xs px-4 py-2 rounded transition-colors disabled:opacity-50 ${
                saved ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
              }`}
            >
              {saved ? '✓ 已儲存' : saving ? '儲存中…' : '儲存變更'}
            </button>
          </div>
        </div>
      </Section>

      {/* 可上課時段 */}
      <Section title="可上課時段">
        <p className="text-xs text-gray-500 mb-3">點擊格子切換可上課時段，新增預約時只顯示設定的時間，已被預約時段不顯示。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                <th className="w-10" />
                {ALL_HOURS.map(h => (
                  <th key={h} className="text-center text-gray-500 font-normal pb-1.5 px-px w-8">
                    {String(h).padStart(2, '0')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAY_LABELS.map((label, dayIdx) => (
                <tr key={dayIdx}>
                  <td className="text-gray-500 pr-2 py-0.5 text-right whitespace-nowrap font-medium">{label}</td>
                  {ALL_HOURS.map(hour => {
                    const isOn = (weeklyHours[String(dayIdx)] ?? []).includes(hour)
                    return (
                      <td key={hour} className="p-px">
                        <button
                          onClick={() => toggleHour(dayIdx, hour)}
                          className={`w-7 h-7 rounded transition-all text-[10px] font-medium ${
                            isOn
                              ? 'bg-indigo-500 text-white'
                              : 'bg-gray-50 text-gray-300 hover:bg-gray-200'
                          }`}
                        >
                          {isOn ? '✓' : ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            {Object.values(weeklyHours).reduce((s, h) => s + h.length, 0)} 個時段已啟用
          </span>
          <button
            onClick={handleSaveHours}
            disabled={savingHours}
            className={`text-xs px-4 py-2 rounded transition-colors disabled:opacity-50 ${
              savedHours ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'
            }`}
          >
            {savedHours ? '✓ 已儲存' : savingHours ? '儲存中…' : '儲存時段'}
          </button>
        </div>
      </Section>

      {/* 通知設定 */}
      <Section title="提醒通知">
        <Row
          label="課前 48 小時 Email 提醒"
          sub="自動寄送課程提醒給學員，減少爽約率"
        >
          <Toggle on={remind48h} onToggle={() => {
            const v = !remind48h
            setRemind48h(v)
            saveNotify({ notify_48h: v })
          }} />
        </Row>
        <Row
          label="課前 24 小時 Email 提醒"
          sub="第二次提醒，效果最顯著"
        >
          <Toggle on={remind24h} onToggle={() => {
            const v = !remind24h
            setRemind24h(v)
            saveNotify({ notify_24h: v })
          }} />
        </Row>
        <Row
          label="低堂數警示通知"
          sub={`學員剩餘堂數 ≤ ${lowThreshold} 堂時 Email 通知教練`}
        >
          <div className="flex items-center gap-2">
            <select
              value={lowThreshold}
              onChange={e => {
                const v = Number(e.target.value)
                setLowThreshold(v)
                saveNotify({ notify_low_threshold: v })
              }}
              className="text-xs px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400"
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} 堂</option>)}
            </select>
            <Toggle on={lowSessionAlert} onToggle={() => {
              const v = !lowSessionAlert
              setLowSessionAlert(v)
              saveNotify({ notify_low_sessions: v })
            }} />
          </div>
        </Row>

        <div className="mt-3 p-3 bg-gray-50 rounded">
          <p className="text-[11px] text-gray-500">
            📧 提醒 Email 由 <span className="font-medium">Resend</span> 發送。
          </p>
        </div>
      </Section>

      {/* 金流設定 */}
      <Section title="金流設定">
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] text-gray-900 mb-0.5">線上收款與自動堂數包</p>
            <p className="text-[11px] text-gray-500">學員掃碼付款，系統自動建立堂數包</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium shrink-0">即將推出</span>
        </div>
      </Section>

      {/* 訂閱方案 */}
      <Section title="訂閱方案">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px] font-medium text-gray-900">免費方案</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">目前使用中</span>
            </div>

            {/* 學員用量 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-500">學員人數</span>
                <span className={`text-[11px] font-medium ${studentCount >= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                  {studentCount} / 5 位
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${studentCount >= 5 ? 'bg-red-500' : studentCount >= 4 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((studentCount / 5) * 100, 100)}%` }}
                />
              </div>
              {studentCount >= 5 && (
                <p className="text-[11px] text-red-600 mt-1">已達免費方案上限，無法新增學員</p>
              )}
            </div>

            <ul className="text-xs text-gray-500 space-y-0.5">
              <li>✓ 最多 5 位學員</li>
              <li>✓ 基本扣點與排課</li>
              <li>✓ Email 自動提醒</li>
              <li className="text-gray-300">✗ 金流收款</li>
              <li className="text-gray-300">✗ AI 課後日誌</li>
            </ul>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-gray-500 mb-2">升級即可解鎖全功能</div>
            <button className="text-xs px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors font-medium">
              升級專業方案 NT$499/月
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}
