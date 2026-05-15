# BookFit — 開發指南

## 技術棧
- **前端**：Next.js 14 (App Router) + Tailwind CSS
- **資料庫**：Supabase (PostgreSQL + Auth + Realtime)
- **金流**：綠界 ECPay（教練自有帳號）
- **LINE 提醒**：LINE Notify（免費）→ 後期升 Messaging API

---

## 快速開始

```bash
npx create-next-app@latest bookfit --typescript --tailwind --app
cd bookfit
npm install @supabase/supabase-js
```

把 `components/`、`hooks/`、`types/`、`lib/` 資料夾複製到專案根目錄。

### 環境變數 `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
LINE_NOTIFY_TOKEN=your-line-notify-token
ECPAY_MERCHANT_ID=your-merchant-id
ECPAY_HASH_KEY=your-hash-key
ECPAY_HASH_IV=your-hash-iv
```

### 初始化資料庫

在 Supabase SQL Editor 執行 `schema.sql`。

---

## 資料庫結構

```
coaches           教練帳號
  └─ students     學員
       ├─ session_packages   購買的堂數包
       ├─ appointments       預約紀錄
       └─ session_logs       課後訓練日誌
```

---

## 元件說明

| 檔案 | 說明 |
|---|---|
| `components/Dashboard.tsx` | 主儀表板，今日概覽 + 快速操作 |
| `components/SchedulePage.tsx` | 排課管理，週視圖 + 扣點 |
| `components/StudentDetail.tsx` | 學員詳情，進度追蹤 + 紀錄 |
| `components/NewAppointmentModal.tsx` | 新增預約 Modal |
| `hooks/useAppointments.ts` | 所有資料 fetch 邏輯 |
| `types/index.ts` | TypeScript 型別定義 |
| `lib/supabase.ts` | Supabase client |
| `schema.sql` | 完整資料庫 schema + RLS + Functions |
| `app-page.tsx` | 主入口，組裝所有元件（複製到 `app/page.tsx`） |

---

## 金流串接（綠界 ECPay）

### 架構：教練自有帳號，平台不碰錢

```
學員 → 綠界（教練帳號）→ 教練銀行帳戶
                ↓ Webhook
         你的平台自動扣點
```

### 串接步驟

1. 在 `app/api/ecpay/create/route.ts` 建立付款頁面 API
2. 在 `app/api/ecpay/webhook/route.ts` 接收付款通知
3. Webhook 收到後呼叫 `deduct_session` function

```typescript
// app/api/ecpay/webhook/route.ts
import { createHmac } from 'crypto'

export async function POST(req: Request) {
  const body = await req.formData()
  const data = Object.fromEntries(body)

  // 1. 驗證 CheckMacValue
  const { CheckMacValue, ...params } = data
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  const raw = `HashKey=${HASH_KEY}&${sorted}&HashIV=${HASH_IV}`
  const expected = createHmac('sha256', '').update(raw).digest('hex').toUpperCase()

  if (expected !== CheckMacValue) {
    return new Response('FAIL', { status: 400 })
  }

  // 2. 付款成功 → 更新 DB
  if (data.RtnCode === '1') {
    const packageId = data.CustomField1 as string
    await supabase.rpc('deduct_session', { p_package_id: packageId })
  }

  return new Response('1|OK')
}
```

---

## LINE 提醒

### V1：LINE Notify（免費，5 分鐘可用）

```typescript
// lib/line.ts
export async function sendLineNotify(token: string, message: string) {
  await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ message }),
  })
}

// 使用
await sendLineNotify(coach.line_notify_token, `\n提醒：${student.name} 明天 14:00 有課程`)
```

### 排程提醒（Supabase Edge Function + cron）

```
supabase/functions/send-reminders/index.ts  ← 每小時執行一次
```

查詢 `appointments` 中 `reminded_48h = false` 且 `scheduled_at` 在 48hr 內的記錄 → 發送 LINE 通知 → 更新 `reminded_48h = true`

---

## 開發優先順序

### Week 1–2（V1 核心）
- [x] Schema 建立
- [ ] Supabase Auth（教練登入）
- [ ] 學員 CRUD
- [ ] 預約建立 + 查詢
- [ ] 扣點邏輯（`deduct_session` function）
- [ ] LINE Notify 串接

### Week 3–4（V1 完成）
- [ ] Dashboard 統計
- [ ] 排課週視圖
- [ ] LINE 提醒排程（Edge Function）
- [ ] 部署 Vercel

### Week 5–8（V2 金流）
- [ ] 教練綠界 API Key 設定頁
- [ ] 堂數包購買頁（學員端）
- [ ] ECPay Webhook 處理
- [ ] 付款成功 → 自動建立帳戶

---

## 常見問題

**Q：教練的綠界 API Key 要怎麼安全存放？**  
A：存在 `coaches` 表的加密欄位。Supabase 支援 `pgcrypto`，或使用 Supabase Vault。

**Q：LINE Notify 和 Messaging API 的差異？**  
A：Notify 免費但只能單向推送給自己。Messaging API 可以和學員雙向互動，但需要帳號申請（免費，但有訊息上限）。V1 先用 Notify 驗證，V2 再升級。

**Q：如何處理退款？**  
A：透過綠界後台手動退款，並在 `session_packages` 恢復 `remaining_sessions`。後期可做退款 API 自動化。
