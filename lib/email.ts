import { Resend } from 'resend'

export async function sendLowSessionAlert({
  to,
  coachName,
  students,
}: {
  to: string
  coachName: string
  students: { name: string; remaining: number }[]
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM ?? 'noreply@bookfit.tw'

  const rows = students.map(s =>
    `<tr>
      <td style="padding:6px 12px 6px 0">${s.name}</td>
      <td style="padding:6px 0;text-align:right;font-weight:600;color:${s.remaining === 1 ? '#dc2626' : '#d97706'}">${s.remaining} 堂</td>
    </tr>`
  ).join('')

  return resend.emails.send({
    from: FROM,
    to,
    subject: `【BookFit】${students.length} 位學員堂數即將用完`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="font-size:18px;margin-bottom:8px">低堂數提醒</h2>
        <p style="color:#555">Hi ${coachName} 教練，</p>
        <p style="color:#555">以下學員剩餘堂數不多，建議本週主動跟進：</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f5f5f5;border-radius:8px;padding:12px">
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#888;font-size:12px">可至 BookFit 設定頁面調整通知偏好。</p>
        <p style="color:#ccc;font-size:11px;margin-top:24px">BookFit 預約管理平台</p>
      </div>
    `,
  })
}

export async function sendReminderEmail({
  to,
  studentName,
  coachName,
  scheduledAt,
  hoursAhead,
}: {
  to: string
  studentName: string
  coachName: string
  scheduledAt: string
  hoursAhead: 24 | 48
}) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM ?? 'noreply@bookfit.tw'
  const date = new Date(scheduledAt)
  const formatted = date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  })
  const timeOnly = date.toLocaleString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Taipei',
  })

  const subject = hoursAhead === 24
    ? `【BookFit】明日課程確認｜${timeOnly} 與 ${coachName} 教練`
    : `【BookFit】課程提醒｜${formatted} 與 ${coachName} 教練`

  const headline = hoursAhead === 24 ? '明日課程確認' : '課程提醒'
  const lead = hoursAhead === 24
    ? `明日提醒：您與 <strong>${coachName}</strong> 教練的課程即將到來。`
    : `提醒您，48 小時後有一堂與 <strong>${coachName}</strong> 教練的課程。`

  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="font-size:18px;margin-bottom:8px">${headline}</h2>
        <p style="color:#555">Hi ${studentName}，</p>
        <p style="color:#555">${lead}</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0">
          <strong style="font-size:16px">${formatted}</strong>
        </div>
        <p style="color:#888;font-size:12px">如需更改，請直接聯繫您的教練。</p>
        <p style="color:#ccc;font-size:11px;margin-top:24px">BookFit 預約管理平台</p>
      </div>
    `,
  })
}
