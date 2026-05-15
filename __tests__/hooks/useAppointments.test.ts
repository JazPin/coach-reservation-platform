// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useAppointments,
  useStudents,
  useDashboardStats,
  useStudentDetail,
} from '@/hooks/useAppointments'

// vi.hoisted prevents TDZ errors when vi.mock factory references outer vars
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc:  vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}))

// ── Query chain helper ────────────────────────────────────

// .single() mirrors Supabase: resolves to the first element, not the array
function chain(rows: unknown[]) {
  let isSingle = false
  const c: Record<string, unknown> = {}
  const pass = () => c
  c.select = vi.fn(pass)
  c.eq     = vi.fn(pass)
  c.gte    = vi.fn(pass)
  c.lte    = vi.fn(pass)
  c.in     = vi.fn(pass)
  c.order  = vi.fn(pass)
  c.single = vi.fn(() => { isSingle = true; return c })
  c.limit  = vi.fn(pass)
  c.update = vi.fn(pass)
  c.insert = vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null })
  c.then   = (resolve: (v: { data: unknown; error: null }) => unknown) => {
    const data = isSingle ? (rows[0] ?? null) : rows
    return Promise.resolve({ data, error: null }).then(resolve)
  }
  return c
}

// ── Fixtures ──────────────────────────────────────────────

const TODAY    = '2026-05-10'
const COACH_ID = 'coach-1'

const MOCK_APTS = [
  { id: 'a1', status: 'scheduled', scheduled_at: `${TODAY}T09:00:00Z`, student: { id: 's1', name: '李雅婷' }, package: { id: 'p1', remaining_sessions: 5 } },
  { id: 'a2', status: 'completed', scheduled_at: `${TODAY}T11:00:00Z`, student: { id: 's2', name: '陳小明' }, package: { id: 'p2', remaining_sessions: 2 } },
]

const MOCK_STUDENTS = [
  { id: 's1', name: '李雅婷', coach_id: COACH_ID, session_packages: [{ remaining_sessions: 5, total_sessions: 16 }] },
  { id: 's2', name: '陳小明', coach_id: COACH_ID, session_packages: [{ remaining_sessions: 2, total_sessions: 20 }] },
]

const MOCK_STATS = {
  monthly_revenue: 84500, monthly_revenue_change_pct: 12, active_students: 5,
  monthly_sessions: 20, today_total: 2, today_completed: 1,
  today_no_show: 0, today_pending: 1, no_show_rate: 0,
}

// ── useAppointments ───────────────────────────────────────

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(chain(MOCK_APTS))
  })

  it('fetches and exposes appointments', async () => {
    const { result } = renderHook(() => useAppointments(TODAY, COACH_ID))
    await waitFor(() => expect(result.current.appointments).toHaveLength(2))
  })

  it('filters by coach_id', async () => {
    const c = chain(MOCK_APTS)
    mockFrom.mockReturnValue(c)
    renderHook(() => useAppointments(TODAY, COACH_ID))
    await waitFor(() => expect(mockFrom).toHaveBeenCalledWith('appointments'))
    expect(c.eq).toHaveBeenCalledWith('coach_id', COACH_ID)
  })

  it('re-fetches when date changes', async () => {
    const { rerender } = renderHook(({ date }) => useAppointments(date, COACH_ID), {
      initialProps: { date: TODAY },
    })
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(1))
    rerender({ date: '2026-05-11' })
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2))
  })

  it('updateStatus patches appointment list locally', async () => {
    const updateChain = chain([])
    updateChain.update = vi.fn(() => updateChain)
    mockFrom.mockReturnValueOnce(chain(MOCK_APTS)).mockReturnValue(updateChain)

    const { result } = renderHook(() => useAppointments(TODAY, COACH_ID))
    await waitFor(() => expect(result.current.appointments).toHaveLength(2))

    await act(() => result.current.updateStatus('a1', 'completed'))
    expect(result.current.appointments.find(a => a.id === 'a1')?.status).toBe('completed')
  })

  it('confirmAttendance calls deduct_session_fifo RPC with student_id', async () => {
    const updateChain = chain([])
    updateChain.update = vi.fn(() => updateChain)
    // initial fetch → MOCK_APTS; all subsequent from() calls → updateChain
    mockFrom.mockReturnValueOnce(chain(MOCK_APTS)).mockReturnValue(updateChain)
    mockRpc.mockResolvedValue({ data: 'p1', error: null })

    const { result } = renderHook(() => useAppointments(TODAY, COACH_ID))
    await waitFor(() => expect(result.current.appointments).toHaveLength(2))

    await act(() => result.current.confirmAttendance('a1', 's1'))
    expect(mockRpc).toHaveBeenCalledWith('deduct_session_fifo', { p_student_id: 's1' })
  })
})

// ── useStudents ───────────────────────────────────────────

describe('useStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue(chain(MOCK_STUDENTS))
  })

  it('fetches students list', async () => {
    const { result } = renderHook(() => useStudents(COACH_ID))
    await waitFor(() => expect(result.current.students).toHaveLength(2))
  })

  it('refetch() triggers another fetch', async () => {
    const { result } = renderHook(() => useStudents(COACH_ID))
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(1))
    act(() => result.current.refetch())
    await waitFor(() => expect(mockFrom).toHaveBeenCalledTimes(2))
  })
})

// ── useDashboardStats ─────────────────────────────────────

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: MOCK_STATS, error: null })
  })

  it('calls get_dashboard_stats with p_coach_id', async () => {
    renderHook(() => useDashboardStats(COACH_ID))
    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { p_coach_id: COACH_ID })
    )
  })

  it('returns stats from RPC', async () => {
    const { result } = renderHook(() => useDashboardStats(COACH_ID))
    await waitFor(() => expect(result.current.monthly_revenue).toBe(84500))
  })

  it('starts with zeroed stats before fetch completes', () => {
    mockRpc.mockReturnValue(new Promise(() => {})) // never resolves
    const { result } = renderHook(() => useDashboardStats(COACH_ID))
    expect(result.current.monthly_revenue).toBe(0)
  })
})

// ── useStudentDetail ──────────────────────────────────────

describe('useStudentDetail', () => {
  const STUDENT  = { id: 's1', name: '李雅婷', coach_id: COACH_ID }
  const PACKAGES = [{ id: 'p1', remaining_sessions: 5, total_sessions: 16 }]

  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom
      .mockReturnValueOnce(chain([STUDENT]))
      .mockReturnValueOnce(chain(PACKAGES))
      .mockReturnValueOnce(chain([]))
  })

  it('loads student, packages and logs in parallel', async () => {
    const { result } = renderHook(() => useStudentDetail('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.student).toMatchObject({ name: '李雅婷' })
    expect(result.current.packages).toHaveLength(1)
    expect(result.current.logs).toHaveLength(0)
  })

  it('refetch() triggers reload', async () => {
    // reset mock to always return the same data
    mockFrom.mockReset().mockReturnValue(chain([STUDENT]))
    const { result } = renderHook(() => useStudentDetail('s1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const callsBefore = mockFrom.mock.calls.length
    act(() => result.current.refetch())
    await waitFor(() => expect(mockFrom.mock.calls.length).toBeGreaterThan(callsBefore))
  })
})
