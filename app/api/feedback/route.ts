import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const { coachName, contact, message } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'empty' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const FROM = process.env.EMAIL_FROM ?? 'noreply@bookfit.tw'

  const { error } = await resend.emails.send({
    from: FROM,
    to: 'info@montfeatureshop.com',
    subject: `【BookFit 建議回饋】來自 ${coachName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="font-size:18px;margin-bottom:16px;color:#111">使用者建議回饋</h2>
        <p style="margin:4px 0;color:#555"><strong>教練姓名：</strong>${coachName}</p>
        ${contact ? `<p style="margin:4px 0;color:#555"><strong>聯絡方式：</strong>${contact}</p>` : ''}
        <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:20px 0;white-space:pre-wrap;color:#333;line-height:1.6">${message}</div>
        <p style="color:#ccc;font-size:11px;margin-top:24px">BookFit 預約管理平台</p>
      </div>
    `,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
