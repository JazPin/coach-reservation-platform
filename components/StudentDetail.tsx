'use client'
import { useState } from 'react'
import { useStudentDetail } from '@/hooks/useAppointments'
import { supabase } from '@/lib/supabase'
import { StudentAvatar, SessionsBadge } from './Dashboard'
import StudentForm from './StudentForm'
import ConfirmModal from './ConfirmModal'

interface Props {
  coachId: string
  studentId: string
  onBack: () => void
  onNewApt: (studentId: string) => void
  onDelete?: () => void
}

type Tab = 'progress' | 'logs' | 'notes'

export default function StudentDetail({ coachId, studentId, onBack, onNewApt, onDelete }: Props) {
  const { student, packages, logs, loading, refetch } = useStudentDetail(studentId)
  const [tab, setTab] = useState<Tab>('progress')
  const [deducting, setDeducting] = useState(false)
  const [deducted, setDeducted] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [showDeductConfirm, setShowDeductConfirm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm'>('idle')
  const [deleting, setDeleting] = useState(false)

  const activePackage = (packages as any[]).find((p: any) => p.remaining_sessions > 0) ?? null

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2500)
  }

  async function handleDeduct() {
    if (!activePackage || deducting || deducted) return
    setDeducting(true)

    // Use end-of-today in LOCAL time so today's future appointments are included,
    // and UTC boundaries don't cause the date to appear as yesterday.
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: apt } = await supabase
      .from('appointments')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'scheduled')
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (apt?.id) {
      await supabase.from('appointments').update({ status: 'completed' }).eq('id', apt.id)
    } else {
      // No scheduled appointment — check for an existing completed one today
      // before inserting, to avoid duplicates from double-tapping or retry.
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .maybeSingle()

      if (!existing) {
        const localNoon = new Date()
        localNoon.setHours(12, 0, 0, 0)
        await supabase.from('appointments').insert({
          coach_id: coachId,
          student_id: studentId,
          package_id: activePackage.id,
          scheduled_at: localNoon.toISOString(),
          status: 'completed',
          duration_minutes: 60,
        })
      }
    }

    const { error } = await supabase.rpc('deduct_session', { p_package_id: activePackage.id })
    if (!error) {
      setDeducted(true)
      showToast(`已扣點，剩餘 ${activePackage.remaining_sessions - 1} 堂`)
      refetch()
    }
    setDeducting(false)
  }

  async function handleDelete() {
    setDeleting(true)
    // appointments and session_logs FKs lack CASCADE — delete dependents first
    await supabase.from('session_logs').delete().eq('student_id', studentId)
    await supabase.from('appointments').delete().eq('student_id', studentId)
    const { error } = await supabase.from('students').delete().eq('id', studentId)
    if (!error) {
      onDelete?.()
      onBack()
    } else {
      showToast('刪除失敗：' + error.message)
      setDeleteStep('idle')
    }
    setDeleting(false)
  }

  const allRemaining = (packages as any[]).reduce((sum, p) => sum + (p.remaining_sessions ?? 0), 0)
  const remaining = deducted ? allRemaining - 1 : allRemaining
  const total = (packages as any[]).reduce((sum, p) => sum + (p.total_sessions ?? 0), 0)
  const barPct = total > 0 ? Math.round((remaining / total) * 100) : 0

  if (loading) return <div className="p-8 text-sm text-gray-500 text-center">載入中…</div>
  if (!student) return <div className="p-8 text-sm text-gray-500 text-center">找不到學員</div>

  const s = student as any
  const noShowCount = (logs as any[]).filter((l: any) => l.status === 'no_show').length
  const totalPaid = (packages as any[]).reduce((sum: number, p: any) => sum + (p.total_paid ?? 0), 0)

  return (
    <>
    <div className="bg-white border border-gray-200 rounded overflow-hidden text-sm">
      {/* Topbar */}
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 border-b border-gray-100 min-w-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 shrink-0"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="hidden sm:inline">學員列表</span>
        </button>
        <span className="hidden sm:inline text-gray-300 text-xs">/</span>
        <span className="text-[14px] font-medium truncate min-w-0">{s.name}</span>
        <div className="ml-auto flex gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-50"
          >
            編輯
          </button>
          <button
            onClick={() => onNewApt(studentId)}
            className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            新增預約
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <div className="sm:border-r border-b sm:border-b-0 border-gray-100 p-5">
          <div className="flex sm:block items-center gap-4 mb-4 sm:mb-0">
            <StudentAvatar name={s.name} size="lg" />
            <div>
              <div className="mt-0 sm:mt-3 mb-0.5 text-[16px] font-medium">{s.name}</div>
              <div className="text-xs text-gray-500 sm:mb-4">目標：{s.goal}</div>
            </div>
          </div>

          {/* Sessions box */}
          <div className="bg-gray-50 rounded p-4 text-center mb-3 mt-4 sm:mt-0">
            <div className={`text-[32px] font-medium leading-none mb-1 ${remaining <= 1 ? 'text-red-600' : remaining <= 3 ? 'text-amber-600' : 'text-gray-900'}`}>
              {remaining}
            </div>
            <div className="text-xs text-gray-500 mb-3">剩餘堂數</div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all ${remaining <= 1 ? 'bg-red-400' : remaining <= 3 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500">共購 {total} 堂，已上 {total - remaining} 堂</div>
          </div>

          <button
            onClick={() => setShowDeductConfirm(true)}
            disabled={deducting || deducted || !activePackage}
            className={`w-full py-2.5 border rounded text-xs transition-all mb-1 ${
              deducted
                ? 'border-green-200 text-green-700 bg-green-50'
                : 'border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:opacity-50'
            }`}
          >
            {deducted ? '✓ 已確認到課' : deducting ? '處理中…' : '確認到課 · 扣 1 堂'}
          </button>
          {toastMsg && <div className="text-[11px] text-gray-500 text-center mt-1">{toastMsg}</div>}

          {/* Info rows */}
          <div className="mt-4 space-y-0">
            {[
              { k: '加入日期', v: new Date(s.created_at).toLocaleDateString('zh-TW') },
              { k: '上課頻率', v: s.session_frequency || '—' },
              { k: '爽約次數', v: `${noShowCount} 次`, vColor: noShowCount > 0 ? 'text-red-600' : '' },
              { k: '已付總額', v: `NT$${totalPaid.toLocaleString()}` },
            ].map(row => (
              <div key={row.k} className="flex justify-between items-center py-2 border-b border-gray-100 text-xs">
                <span className="text-gray-500">{row.k}</span>
                <span className={`font-medium ${row.vColor ?? ''}`}>{row.v}</span>
              </div>
            ))}
          </div>

          {/* Delete section */}
          <div className="mt-5">
            {deleteStep === 'idle' ? (
              <button
                onClick={() => setDeleteStep('confirm')}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                刪除學員…
              </button>
            ) : (
              <div className="border border-red-100 rounded p-3 bg-red-50">
                <p className="text-[12px] text-red-700 font-medium mb-1">確定刪除此學員？</p>
                <p className="text-[11px] text-red-400 mb-3">所有預約與堂數包紀錄將一併刪除，無法復原。</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteStep('idle')}
                    className="flex-1 text-xs py-1.5 border border-gray-200 rounded text-gray-500 hover:bg-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 text-xs py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? '刪除中…' : '確定刪除'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="p-5">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 mb-4">
            {(['progress', 'logs', 'notes'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-center text-xs py-2.5 border-b-2 transition-colors whitespace-nowrap ${
                  tab === t ? 'border-indigo-400 text-gray-900 font-medium' : 'border-transparent text-gray-500 hover:text-gray-900'
                } -mb-px`}
              >
                {{ progress: '體態進度', logs: '課程紀錄', notes: '備忘筆記' }[t]}
              </button>
            ))}
          </div>

          {tab === 'progress' && <ProgressTab logs={logs} />}
          {tab === 'logs' && <LogsTab logs={logs} coachId={coachId} studentId={studentId} onRefetch={refetch} />}
          {tab === 'notes' && <NotesTab notes={s.notes} studentId={studentId} />}
        </div>
      </div>
    </div>

    {showEdit && (
      <StudentForm
        coachId={coachId}
        student={student ?? undefined}
        onClose={() => setShowEdit(false)}
        onSuccess={() => { refetch(); setShowEdit(false) }}
      />
    )}

    {showDeductConfirm && (
      <ConfirmModal
        title="確認到課"
        message={`確認 ${s.name} 到課並扣除 1 堂？`}
        confirmLabel="確認到課"
        onConfirm={() => { setShowDeductConfirm(false); handleDeduct() }}
        onCancel={() => setShowDeductConfirm(false)}
      />
    )}
    </>
  )
}

function ProgressTab({ logs }: { logs: any[] }) {
  // Extract session_logs with body metrics, in chronological order
  const allLogs = logs
    .filter(l => l.session_logs?.length > 0)
    .map(l => ({ ...l.session_logs[0], scheduled_at: l.scheduled_at }))
    .reverse()

  const weightLogs = allLogs.filter(l => l.weight_kg != null)
  const latestLog = allLogs[allLogs.length - 1]

  const latestWeight = latestLog?.weight_kg ?? null
  const latestBodyFat = latestLog?.body_fat_pct ?? null

  const firstWeight = weightLogs[0]?.weight_kg ?? null
  const weightDelta = latestWeight != null && firstWeight != null && firstWeight !== latestWeight
    ? (latestWeight - firstWeight).toFixed(1)
    : null

  const completedCount = logs.filter(l => l.status === 'completed').length
  const trialCount = logs.filter(l => l.status === 'completed' && (l as any).package?.price_per_session === 0).length
  const totalCount = logs.length
  const attendanceRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : null

  const chartData = weightLogs.slice(-8)
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map(l => l.weight_kg)) : 0
  const chartMin = chartData.length > 0 ? Math.min(...chartData.map(l => l.weight_kg)) : 0
  const range = chartMax - chartMin || 1

  const stats = [
    {
      label: '體重',
      value: latestWeight != null ? `${latestWeight} kg` : '—',
      sub: weightDelta != null
        ? (Number(weightDelta) < 0 ? `↓ ${Math.abs(Number(weightDelta))}kg` : `↑ ${weightDelta}kg`)
        : '尚無紀錄',
      subColor: weightDelta != null && Number(weightDelta) < 0 ? 'text-green-700' : 'text-gray-400',
    },
    {
      label: '體脂率',
      value: latestBodyFat != null ? `${latestBodyFat} %` : '—',
      sub: latestBodyFat != null ? '最近一次量測' : '尚無紀錄',
      subColor: 'text-gray-400',
    },
    {
      label: '已上課堂數',
      value: completedCount,
      sub: trialCount > 0 ? `含 ${trialCount} 堂體驗課` : `共預約 ${totalCount} 堂`,
      subColor: trialCount > 0 ? 'text-amber-600' : 'text-gray-400',
    },
    {
      label: '到課率',
      value: attendanceRate != null ? `${attendanceRate} %` : '—',
      sub: totalCount > 0 ? `${completedCount}/${totalCount} 堂到課` : '尚無紀錄',
      subColor: attendanceRate != null && attendanceRate >= 80 ? 'text-green-700' : 'text-amber-600',
    },
  ]

  return (
    <>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">目前數據</div>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {stats.map(p => (
          <div key={p.label} className="border border-gray-100 rounded p-3.5">
            <div className="text-[11px] text-gray-500 mb-1.5">{p.label}</div>
            <div className="text-xl font-medium mb-0.5">{p.value}</div>
            <div className={`text-[11px] ${p.subColor}`}>{p.sub}</div>
          </div>
        ))}
      </div>

      <div className="hidden sm:block border border-gray-100 rounded p-4">
        <div className="text-xs text-gray-500 mb-3">
          體重趨勢（近 {chartData.length} 筆紀錄）
        </div>
        {chartData.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">尚無體重量測紀錄</p>
        ) : (
          <WeightLineChart data={chartData} />
        )}
      </div>
    </>
  )
}

function WeightLineChart({ data }: { data: { weight_kg: number; scheduled_at: string }[] }) {
  const PAD_T = 18
  const PAD_B = 18
  const PAD_L = 34
  const PAD_R = 14
  const INNER_H = 80
  const VB_W = 400
  const TOTAL_H = PAD_T + INNER_H + PAD_B

  const weights = data.map(d => d.weight_kg)
  const rawMin = Math.min(...weights)
  const rawMax = Math.max(...weights)
  const yMin = Math.floor(rawMin) - 1
  const yMax = Math.ceil(rawMax) + 1
  const yRange = yMax - yMin || 1

  function svgY(kg: number) {
    return PAD_T + (1 - (kg - yMin) / yRange) * INNER_H
  }
  function svgX(i: number) {
    if (data.length === 1) return PAD_L + (VB_W - PAD_L - PAD_R) / 2
    return PAD_L + (i / (data.length - 1)) * (VB_W - PAD_L - PAD_R)
  }

  const pts = data.map((d, i) => ({
    x: svgX(i),
    y: svgY(d.weight_kg),
    weight: d.weight_kg,
    date: new Date(d.scheduled_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
    isLatest: i === data.length - 1,
  }))

  const linePath = pts.length > 1
    ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : null

  const areaPath = linePath
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD_T + INNER_H).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD_T + INNER_H).toFixed(1)} Z`
    : null

  const yLabels = [yMin, Math.round((yMin + yMax) / 2), yMax]

  return (
    <svg viewBox={`0 0 ${VB_W} ${TOTAL_H}`} className="w-full" style={{ height: `${TOTAL_H * 0.85}px` }}>
      {/* Y-axis unit */}
      <text x={PAD_L - 2} y={PAD_T - 6} textAnchor="end" fontSize="8" fill="#bbb">kg</text>

      {/* Grid lines + Y labels */}
      {yLabels.map(kg => {
        const y = svgY(kg)
        return (
          <g key={kg}>
            <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD_L - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#d1d5db">{kg}</text>
          </g>
        )
      })}

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="#6366f1" fillOpacity="0.06" />}

      {/* Line */}
      {linePath && <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />}

      {/* Dots + weight labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <text
            x={p.x}
            y={p.y - 7}
            textAnchor="middle"
            fontSize="9"
            fill={p.isLatest ? '#4f46e5' : '#9ca3af'}
            fontWeight={p.isLatest ? '600' : '400'}
          >
            {p.weight}
          </text>
          <circle cx={p.x} cy={p.y} r={p.isLatest ? 4 : 3} fill={p.isLatest ? '#6366f1' : '#a5b4fc'} stroke="white" strokeWidth="1.5">
            <title>{p.weight} kg · {p.date}</title>
          </circle>
          {/* X-axis date — first and last only */}
          {(i === 0 || p.isLatest) && (
            <text x={p.x} y={TOTAL_H - 2} textAnchor={i === 0 ? 'start' : 'end'} fontSize="9" fill="#d1d5db">{p.date}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

function LogsTab({ logs, coachId, studentId, onRefetch }: {
  logs: any[]
  coachId: string
  studentId: string
  onRefetch: () => void
}) {
  type Exercise = { name: string; sets: number; reps: number; weight_kg?: number; notes?: string }
  type SessionLog = {
    id: string
    weight_kg: number | null
    body_fat_pct: number | null
    training_notes: string | null
    exercises: Exercise[] | null
    logged_at: string
  }
  type AptWithLog = {
    id: string
    scheduled_at: string
    status: 'completed' | 'no_show'
    notes: string | null
    package_id: string | null
    package: { price_per_session: number } | null
    session_logs: SessionLog[]
  }

  const entries = logs as AptWithLog[]
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState<{
    scheduledDate: string; scheduledTime: string
    training_notes: string; weight_kg: string; body_fat_pct: string; exercises: Exercise[]
  }>({ scheduledDate: '', scheduledTime: '', training_notes: '', weight_kg: '', body_fat_pct: '', exercises: [] })
  const [saving, setSaving] = useState(false)

  function aptToDateTime(scheduledAt: string) {
    const d = new Date(scheduledAt)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return { date, time }
  }

  function openFor(apt: AptWithLog) {
    const log = apt.session_logs?.[0] ?? null
    const { date, time } = aptToDateTime(apt.scheduled_at)
    setForm(log ? {
      scheduledDate: date, scheduledTime: time,
      training_notes: log.training_notes ?? '',
      weight_kg: log.weight_kg != null ? String(log.weight_kg) : '',
      body_fat_pct: log.body_fat_pct != null ? String(log.body_fat_pct) : '',
      exercises: log.exercises ?? [],
    } : { scheduledDate: date, scheduledTime: time, training_notes: '', weight_kg: '', body_fat_pct: '', exercises: [] })
    setOpenId(apt.id)
  }

  function updateExercise(i: number, patch: Partial<Exercise>) {
    setForm(f => {
      const exs = [...f.exercises]
      exs[i] = { ...exs[i], ...patch }
      return { ...f, exercises: exs }
    })
  }

  async function handleSaveLog(apt: AptWithLog) {
    const log = apt.session_logs?.[0] ?? null
    setSaving(true)

    const newScheduledAt = form.scheduledDate && form.scheduledTime
      ? new Date(`${form.scheduledDate}T${form.scheduledTime}:00`).toISOString()
      : apt.scheduled_at

    await Promise.all([
      supabase.from('appointments').update({ scheduled_at: newScheduledAt }).eq('id', apt.id),
      (async () => {
        const payload = {
          appointment_id: apt.id,
          student_id: studentId,
          coach_id: coachId,
          training_notes: form.training_notes || null,
          weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
          body_fat_pct: form.body_fat_pct ? Number(form.body_fat_pct) : null,
          exercises: form.exercises.length > 0 ? form.exercises : null,
        }
        if (log) {
          await supabase.from('session_logs').update(payload).eq('id', log.id)
        } else {
          await supabase.from('session_logs').insert(payload)
        }
      })(),
    ])

    setSaving(false)
    setOpenId(null)
    setForm({ scheduledDate: '', scheduledTime: '', training_notes: '', weight_kg: '', body_fat_pct: '', exercises: [] })
    onRefetch()
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-gray-400">
        <svg className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="1"/></svg>
        <p className="text-sm">尚無課程紀錄</p>
      </div>
    )
  }

  return (
    <>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">課程紀錄（{entries.length} 筆）</div>
      <div className="flex flex-col gap-2">
        {entries.map(apt => {
          const log = apt.session_logs?.[0] ?? null
          const isNoShow = apt.status === 'no_show'
          const date = new Date(apt.scheduled_at)
          const dateLabel = date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
          const timeLabel = date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
          const isOpen = openId === apt.id

          return (
            <div key={apt.id} className={`border rounded-xl overflow-hidden ${isNoShow ? 'border-red-100' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3 p-3.5">
                <div className="text-xs text-gray-400 w-20 shrink-0 pt-0.5">
                  <div>{dateLabel}</div>
                  <div className="text-[10px] mt-0.5 text-gray-300">{timeLabel}</div>
                </div>

                <div className="flex-1 min-w-0">
                  {isNoShow ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">爽約</span>
                      {apt.package?.price_per_session === 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">體驗課</span>}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">已到課</span>
                      {apt.package?.price_per_session === 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">體驗課</span>}
                      {log?.weight_kg != null && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{log.weight_kg} kg</span>}
                      {log?.body_fat_pct != null && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">體脂 {log.body_fat_pct}%</span>}
                      {log?.exercises && log.exercises.length > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">{log.exercises.length} 個動作</span>}
                    </div>
                  )}

                  {log?.training_notes && (
                    <p className="text-xs text-gray-500 leading-relaxed mt-1">{log.training_notes}</p>
                  )}

                  {log?.exercises && log.exercises.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {log.exercises.map((ex, i) => (
                        <div key={i} className="text-xs text-gray-500 flex gap-2 flex-wrap">
                          <span className="font-medium text-gray-700">{ex.name}</span>
                          <span>{ex.sets}組×{ex.reps}下{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}</span>
                          {ex.notes && <span className="text-gray-400">— {ex.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {apt.notes && !log && !isNoShow && (
                    <p className="text-[11px] text-gray-400 mt-1">預約備注：{apt.notes}</p>
                  )}
                </div>

                {!isNoShow && (
                  <button
                    onClick={() => isOpen ? setOpenId(null) : openFor(apt)}
                    className="shrink-0 text-[11px] px-2.5 py-1 border border-gray-200 rounded-lg text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    {isOpen ? '取消' : log ? '編輯' : '＋ 記錄'}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">日期</label>
                      <input
                        type="date"
                        value={form.scheduledDate}
                        onChange={e => setForm(f => ({ ...f, scheduledDate: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">時間</label>
                      <input
                        type="time"
                        value={form.scheduledTime}
                        onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">體重 (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.weight_kg}
                        onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                        placeholder="e.g. 82.5"
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">體脂率 (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.body_fat_pct}
                        onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))}
                        placeholder="e.g. 21.4"
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">訓練備忘</label>
                    <textarea
                      rows={3}
                      value={form.training_notes}
                      onChange={e => setForm(f => ({ ...f, training_notes: e.target.value }))}
                      placeholder="本次訓練重點、觀察、下次注意事項…"
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 resize-none bg-white"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide">訓練動作</label>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, exercises: [...f.exercises, { name: '', sets: 3, reps: 10 }] }))}
                        className="text-[11px] text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        ＋ 新增動作
                      </button>
                    </div>
                    {form.exercises.map((ex, i) => (
                      <div key={i} className="flex items-center gap-1.5 mb-1.5">
                        <input
                          value={ex.name}
                          onChange={e => updateExercise(i, { name: e.target.value })}
                          placeholder="動作名稱"
                          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 bg-white min-w-0"
                        />
                        <input
                          type="number"
                          value={ex.sets}
                          onChange={e => updateExercise(i, { sets: Number(e.target.value) })}
                          placeholder="組"
                          className="w-11 text-xs px-1.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 bg-white text-center"
                        />
                        <span className="text-[10px] text-gray-400">×</span>
                        <input
                          type="number"
                          value={ex.reps}
                          onChange={e => updateExercise(i, { reps: Number(e.target.value) })}
                          placeholder="下"
                          className="w-11 text-xs px-1.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 bg-white text-center"
                        />
                        <input
                          type="number"
                          step="2.5"
                          value={ex.weight_kg ?? ''}
                          onChange={e => updateExercise(i, { weight_kg: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="kg"
                          className="w-14 text-xs px-1.5 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-indigo-400 bg-white text-center"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, exercises: f.exercises.filter((_, j) => j !== i) }))}
                          className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSaveLog(apt)}
                      disabled={saving}
                      className="text-xs px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? '儲存中…' : '儲存紀錄'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
function NotesTab({ notes, studentId }: { notes?: string; studentId: string }) {
  const [text, setText] = useState(notes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleSave() {
    setStatus('saving')
    try {
      const { error } = await supabase.from('students').update({ notes: text }).eq('id', studentId)
      if (error) {
        setStatus('error')
      } else {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 2500)
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-3">教練備忘</div>
      <textarea
        value={text}
        onChange={e => { setText(e.target.value); if (status === 'saved') setStatus('idle') }}
        className="w-full h-48 p-4 text-sm border border-gray-100 rounded resize-none focus:outline-none focus:border-indigo-300 text-gray-500 leading-7"
        placeholder="記錄學員特殊狀況、偏好、注意事項…"
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        {status === 'saved' && <span className="text-xs text-green-600">✓ 已儲存</span>}
        {status === 'error' && <span className="text-xs text-red-500">儲存失敗，請稍後再試</span>}
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {status === 'saving' ? '儲存中…' : '儲存'}
        </button>
      </div>
    </>
  )
}
