import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFrom, mockUpdate, mockUpdateEq, mockSendReminderEmail } = vi.hoisted(() => {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate   = vi.fn().mockReturnValue({ eq: mockUpdateEq })
  const mockFrom     = vi.fn()
  const mockSendReminderEmail = vi.fn().mockResolvedValue({})
  return { mockFrom, mockUpdate, mockUpdateEq, mockSendReminderEmail }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

vi.mock('@/lib/email', () => ({ sendReminderEmail: mockSendReminderEmail }))

import { GET } from '@/app/api/cron/reminders/route'

// ─────────────────────────────────────────────────────────

// chain(rows) — each call captures its own rows snapshot
function chain(rows: unknown[]) {
  const c: Record<string, unknown> = {}
  const pass = () => c
  c.select = vi.fn(pass)
  c.eq     = vi.fn(pass)
  c.gte    = vi.fn(pass)
  c.lte    = vi.fn(pass)
  c.update = mockUpdate
  c.then   = (resolve: (v: { data: unknown; error: null }) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(resolve)
  return c
}

const SECRET = 'test-secret'

function makeReq(secret?: string) {
  return new Request('http://localhost/api/cron/reminders', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  })
}

const APT_48 = {
  id: 'a48',
  // scheduled_at is set in beforeEach after vi.setSystemTime
  get scheduled_at() {
    return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  },
  students: { name: '李雅婷', email: 'li@example.com' },
  coaches:  { name: '陳教練' },
}

const APT_24 = {
  id: 'a24',
  get scheduled_at() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  },
  students: { name: '陳小明', email: 'chen@example.com' },
  coaches:  { name: '陳教練' },
}

describe('GET /api/cron/reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET               = SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL  = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    // Default: both windows return empty
    mockFrom.mockImplementation(() => chain([]))
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-10T10:00:00Z'))
  })

  afterEach(() => vi.useRealTimers())

  // ── Auth guard ────────────────────────────────────────

  it('returns 401 when auth header is missing', async () => {
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET does not match', async () => {
    const res = await GET(makeReq('wrong-secret'))
    expect(res.status).toBe(401)
  })

  // ── Happy path ────────────────────────────────────────

  it('returns { ok: true } with no pending appointments', async () => {
    const res = await GET(makeReq(SECRET))
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.sent).toBe(0)
  })

  it('sends email for an appointment in the 48h window', async () => {
    // 48h window fires; 24h window empty
    mockFrom
      .mockReturnValueOnce(chain([APT_48]))
      .mockReturnValueOnce(chain([]))

    const res = await GET(makeReq(SECRET))
    const body = await res.json()

    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'li@example.com',
        studentName: '李雅婷',
        coachName: '陳教練',
        hoursAhead: 48,
      })
    )
    expect(body.sent).toBe(1)
  })

  it('sends email for an appointment in the 24h window', async () => {
    // 48h window empty; 24h window fires
    mockFrom
      .mockReturnValueOnce(chain([]))
      .mockReturnValueOnce(chain([APT_24]))

    await GET(makeReq(SECRET))

    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ hoursAhead: 24 })
    )
  })

  it('updates the reminder flag after a successful send', async () => {
    mockFrom
      .mockReturnValueOnce(chain([APT_48]))
      .mockReturnValueOnce(chain([]))

    await GET(makeReq(SECRET))

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reminded_48h: true })
    )
  })

  // ── Edge cases ────────────────────────────────────────

  it('skips appointments with no student email', async () => {
    const noEmail = { ...APT_48, students: { name: '王大偉', email: null } }
    mockFrom
      .mockReturnValueOnce(chain([noEmail]))
      .mockReturnValueOnce(chain([]))

    const res = await GET(makeReq(SECRET))
    const body = await res.json()

    expect(mockSendReminderEmail).not.toHaveBeenCalled()
    expect(body.sent).toBe(0)
  })

  it('increments errors count when email sending throws', async () => {
    mockFrom
      .mockReturnValueOnce(chain([]))         // 48h: nothing
      .mockReturnValueOnce(chain([APT_24]))   // 24h: one appointment

    mockSendReminderEmail.mockRejectedValueOnce(new Error('SMTP error'))

    const res = await GET(makeReq(SECRET))
    const body = await res.json()

    expect(body.errors).toBe(1)
    expect(body.sent).toBe(0)
  })

  it('does not update reminder flag when email sending fails', async () => {
    mockFrom
      .mockReturnValueOnce(chain([APT_48]))   // 48h: one appointment
      .mockReturnValueOnce(chain([]))         // 24h: nothing

    mockSendReminderEmail.mockRejectedValueOnce(new Error('fail'))

    await GET(makeReq(SECRET))

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
