# BookFit — 自由健身教練輕量行政後台

> 讓教練把時間花在教學，而不是 Excel 和 LINE 追款。

---

## 技術棧

| 層級 | 技術 |
|---|---|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 樣式 | Tailwind CSS |
| 資料庫 | Supabase (PostgreSQL + Auth + RLS) |
| Email | Resend |
| 金流 | 綠界 ECPay（教練自有帳號） |
| 部署 | Vercel + Cron Jobs |

---

## 快速開始

```bash
npm install
cp .env.local.example .env.local  # 編輯填入 Supabase / Resend 金鑰
npm run dev                         # http://localhost:3000
```

在 Supabase SQL Editor 執行 `schema.sql` 初始化資料庫。

---

## 文件索引

| 文件 | 說明 |
|---|---|
| **[plan.md](plan.md)** | 商業計畫 — 產品定位、市場驗證、金流架構、GTM 策略、定價模式 |
| **[DEVPLAN.md](DEVPLAN.md)** | 開發計畫 — Phase 1–3 任務拆解、API 規劃、Schema 擴充、驗收標準 |
| **[design.md](design.md)** | 設計文件 — UI/UX 規格 |
| **[schema.sql](schema.sql)** | 完整資料庫 Schema（含 RLS、Stored Functions、Indexes） |

---

## 測試框架

| 層級 | 工具 | 指令 | 說明 |
|---|---|---|---|
| Unit | **Vitest** | `npm test` | Component / Hook / API route 單元測試 |
| Coverage | Vitest + v8 | `npm run test:coverage` | 覆蓋率報告 |
| E2E | **Playwright** | `npm run e2e` | 真實瀏覽器端對端測試（41 個場景） |
| E2E (headed) | Playwright | `npm run e2e:headed` | 可視化模式，方便除錯 |

### 測試結構

```
__tests__/
├── hooks/useAppointments.test.ts   # Hook 單元測試（12 tests）
├── cron.test.ts                    # Cron API route 測試（9 tests）
└── email.test.ts                   # Email 發送邏輯測試（7 tests）

e2e/
├── app.spec.ts                     # E2E 全流程（41 scenarios）
└── cleanup.mjs                     # 測試資料清理腳本
```

E2E 測試使用 Supabase Admin API 建立獨立測試帳號，`beforeEach` 清除測試學員、`afterAll` 清除帳號，確保每次執行環境乾淨。

---

## AI 開發工作流

本專案使用 **Claude Code** 作為 AI 協作工具，工作流程如下：

```
需求描述 → /plan 產出計畫 → 人類審核 → /execute 逐步實作
```

### 指令集（`.claude/commands/`）

| 指令 | 用途 |
|---|---|
| `/plan` | 讀取程式碼 → 產出微距實作計畫 → 寫入 `.agent/plans/` → 等待核准 |
| `/execute` | 逐步執行已核准計畫，每步驗證，失敗即停止 |
| `/commit` | 產生 Conventional Commits 格式的 commit message |
| `/review` | 程式碼審查，分級回報（Blocker / Major / Minor / Nit） |
| `/pr` | 產生 PR 描述，遵循團隊規範 |
| `/ticket` | 產生 Jira Ticket 格式 |

### Claude Code 規則（`CLAUDE.md`）

- 輸出語言：台灣繁體中文
- Plan Gate：實作前必須產出計畫並等待 `/execute` 核准
- 自我審查：每次回覆前依嚴重程度分級檢查潛在問題
- Git 安全：commit / push / rebase 由開發者自行操作

---

## 資料庫結構

```
coaches             教練帳號
  └─ students       學員
       ├─ session_packages   堂數包（含 FIFO 扣點）
       ├─ appointments       預約紀錄（含提醒旗標）
       └─ session_logs       課後訓練日誌
```

---

## 核心元件

| 檔案 | 說明 |
|---|---|
| `components/Dashboard.tsx` | 儀表板 — 今日課程、本月收入、低堂數警示 |
| `components/SchedulePage.tsx` | 排課週視圖 — 日期切換、新增/編輯/刪除預約 |
| `components/StudentDetail.tsx` | 學員詳情 — 體態進度、課堂紀錄、備忘筆記 |
| `components/StudentList.tsx` | 學員列表 — 搜尋、Tab 篩選、兩步刪除 |
| `components/NewAppointmentModal.tsx` | 新增預約 — 時段檢查、自動連結堂數包 |
| `components/PackageForm.tsx` | 堂數包管理 — 手動建立、體驗課選項 |
| `components/SettingsPage.tsx` | 設定頁 — 個人資料、通知偏好持久化 |
| `hooks/useAppointments.ts` | 核心 Hook — 預約/學員/扣點/爽約邏輯 |
| `lib/supabase.ts` | Supabase client（browser） |
| `lib/supabase-server.ts` | Supabase client（server-side） |
| `lib/email.ts` | Resend Email 封裝（提醒/通知） |
| `middleware.ts` | Auth 路由保護，未登入導向 `/login` |

---

## 常見問題

**Q：如何處理退款？**
透過綠界後台手動退款，在 `session_packages` 恢復 `remaining_sessions`。

**Q：LINE Notify 還能用嗎？**
LINE Notify 已宣布 deprecate。V1 改用 Email（Resend）提醒，V2 評估 LINE Messaging API。
