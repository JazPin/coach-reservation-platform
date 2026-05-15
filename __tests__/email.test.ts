import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn().mockResolvedValue({ data: { id: 'email-id' }, error: null })

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import { sendReminderEmail } from '@/lib/email'

const BASE_ARGS = {
  to: 'student@example.com',
  studentName: '李雅婷',
  coachName: '陳教練',
  scheduledAt: '2026-06-01T09:00:00.000Z',
  hoursAhead: 24 as const,
}

describe('sendReminderEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-key'
    process.env.EMAIL_FROM = 'noreply@test.tw'
  })

  it('calls resend with correct from / to', async () => {
    await sendReminderEmail(BASE_ARGS)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@test.tw',
        to: 'student@example.com',
      })
    )
  })

  it('includes BookFit prefix and coach name in subject', async () => {
    await sendReminderEmail(BASE_ARGS)
    const { subject } = mockSend.mock.calls[0][0] as { subject: string }
    expect(subject).toContain('BookFit')
    expect(subject).toContain('陳教練')
  })

  it('24h subject uses 明日課程確認 label', async () => {
    await sendReminderEmail({ ...BASE_ARGS, hoursAhead: 24 })
    const { subject } = mockSend.mock.calls[0][0] as { subject: string }
    expect(subject).toContain('明日課程確認')
  })

  it('48h subject uses 課程提醒 label', async () => {
    await sendReminderEmail({ ...BASE_ARGS, hoursAhead: 48 })
    const { subject } = mockSend.mock.calls[0][0] as { subject: string }
    expect(subject).toContain('課程提醒')
  })

  it('includes student name and hoursAhead in HTML body', async () => {
    await sendReminderEmail({ ...BASE_ARGS, hoursAhead: 48 })
    const { html } = mockSend.mock.calls[0][0] as { html: string }
    expect(html).toContain('李雅婷')
    expect(html).toContain('48')
  })

  it('falls back to default FROM when env var is absent', async () => {
    delete process.env.EMAIL_FROM
    await sendReminderEmail(BASE_ARGS)
    const { from } = mockSend.mock.calls[0][0] as { from: string }
    expect(from).toBe('noreply@bookfit.tw')
  })

  it('forwards resend response', async () => {
    const result = await sendReminderEmail(BASE_ARGS)
    expect(result).toEqual({ data: { id: 'email-id' }, error: null })
  })
})
