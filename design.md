# BookFit — Design System Reference
> 文件版本：v1.1 ／ 更新日期：2026-05-10  
> 實際實作的設計語言，以 Tailwind CSS 工具類別為準。

---

## 主題定調

簡潔、可信任的工具型後台。灰白底色配合 Indigo 主色，資訊密度適中，兼顧桌機與手機體驗。

---

## 顏色系統

### 基底色（Neutrals）

| 角色 | Tailwind | Hex | 用途 |
|------|----------|-----|------|
| 頁面底色 | `bg-gray-100` | #f3f4f6 | 整體頁面背景 |
| 卡片 / 側欄 | `bg-white` | #ffffff | 主要內容容器 |
| 淺灰底 | `bg-gray-50` | #f9fafb | 次要區塊、hover 狀態 |
| 分隔線 | `border-gray-100` | #f3f4f6 | 卡片內部分隔 |
| 輕邊框 | `border-gray-200` | #e5e7eb | Input、按鈕邊框 |

### 主色（Primary — Indigo）

| 角色 | Tailwind | 用途 |
|------|----------|------|
| 主色強調 | `bg-indigo-500` | 按鈕、進度條、active badge |
| 主色淺底 | `bg-indigo-50` | Chip 選中狀態底色 |
| 主色文字 | `text-indigo-600` | 連結、選中狀態、方案標籤 |
| 主色邊框 | `border-indigo-400` | focus 狀態、選中邊框 |
| Tab 底線 | `border-indigo-400` | Active tab underline |
| 圖表線條 | `#818cf8`（indigo-400） | SVG 折線圖 |
| 圖表點（最新）| `#6366f1`（indigo-500） | SVG 圓點 |
| 圖表點（其餘）| `#a5b4fc`（indigo-300） | SVG 小圓點 |

### 文字色

| 角色 | Tailwind | 用途 |
|------|----------|------|
| 主要文字 | `text-gray-900` | 標題、數值 |
| 次要文字 | `text-gray-500` | 說明文字、標籤 |
| 最淺文字 | `text-gray-400` | 時間戳、佔位字 |
| 反白 | `text-white` | 深色按鈕上的文字 |

### 狀態色

| 狀態 | Tailwind 組合 | 用途 |
|------|--------------|------|
| 成功 / 已到課 | `bg-green-50 text-green-700` | Badge |
| 警告 / 體驗課 | `bg-amber-50 text-amber-700` | Badge、說明文字 |
| 錯誤 / 爽約 | `bg-red-50 text-red-700` | Badge |
| 堂數危急 | `text-red-600` | 堂數數字 |
| 堂數偏低 | `text-amber-600` | 堂數數字 |

---

## 字型系統

系統字（system-ui / sans-serif），不引入額外字體。

| 角色 | 大小 | 樣式 | 範例 |
|------|------|------|------|
| 頁面主標題 | `text-[15px] font-medium` | — | 側欄 Logo、Modal 標題 |
| 區塊標題 | `text-[13px] font-medium` | — | 今日課程、學員姓名 |
| 卡片數值 | `text-[22px] font-medium` | — | 統計卡數字 |
| 大數字 | `text-[32px] font-medium` | — | 剩餘堂數 |
| 標準內文 | `text-sm`（14px） | — | 表單輸入、課程說明 |
| 次要說明 | `text-xs`（12px） | — | Badge 文字、按鈕 |
| 微型標籤 | `text-[11px]` | uppercase tracking-wide | Section header |
| 最小 | `text-[10px]` | — | 時間戳、圖表標籤 |

---

## 間距 & 佈局

| 場景 | 值 |
|------|---|
| 頁面外距（桌機）| `p-6`（24px） |
| 頁面外距（手機）| `p-4`（16px） |
| 卡片內距 | `p-5`（20px）|
| 元素間距 | `gap-2`～`gap-4` |
| 表單欄位間距 | `space-y-4` |
| 側欄寬度 | `w-52`（208px） |
| 學員詳細側欄 | `240px` |

---

## 圓角

| 場景 | Tailwind |
|------|----------|
| 輸入框、小按鈕 | `rounded`（4px） |
| Badge | `rounded-full` |
| 課程紀錄卡片 | `rounded-xl`（12px） |
| Modal / 大卡片 | `rounded-2xl`（16px） |

---

## 元件規範

### 主要動作按鈕（深色）
```
bg-gray-900 text-white text-xs px-4 py-2 rounded hover:bg-gray-700
```

### 次要動作按鈕（外框）
```
border border-gray-200 text-gray-500 text-xs px-4 py-2 rounded hover:bg-gray-50
```

### 強調按鈕（Indigo）
```
bg-indigo-500 text-white text-xs px-5 py-2 rounded font-medium hover:bg-indigo-600
```

### Badge（狀態標籤）
```
text-[11px] px-2 py-0.5 rounded-full font-medium
```
- 已到課：`bg-green-50 text-green-700`
- 體驗課：`bg-amber-50 text-amber-700`
- 爽約：`bg-red-50 text-red-700`
- 資料 chip：`bg-gray-50 text-gray-500`

### 表單輸入（一般）
```
text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400
```

### 表單輸入（表格內 / 緊湊）
```
text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400 bg-white
```

### Section Header（區塊小標）
```
text-[11px] text-gray-500 uppercase tracking-wide mb-3
```

### 統計卡（Stats Card）
```
bg-gray-50 rounded p-3.5
├─ text-[11px] text-gray-500 uppercase tracking-wide mb-1.5   // label
├─ text-[22px] font-medium text-gray-900 mb-0.5               // value
└─ text-[11px] {subColor}                                      // sub（狀態色）
```

### Segmented Control（類型切換）
```
flex gap-2 p-1 bg-gray-100 rounded-lg
└─ active:  bg-white text-gray-900 shadow-sm rounded
└─ inactive: text-gray-500 hover:text-gray-700 rounded
```

---

## 響應式策略

| 元素 | 手機 | 桌機 |
|------|------|------|
| 導覽 | 底部 Tab Bar（`sm:hidden`）| 左側 Sidebar（`hidden sm:flex`）|
| 圖表 | 隱藏（`hidden sm:block`）| 顯示 |
| 統計格 | `grid-cols-2` | `grid-cols-4` |
| 學員詳細佈局 | `grid-cols-1` | `grid-cols-[240px_1fr]` |
| 頁距 | `p-4 pb-20`（為底部 Tab 留空）| `p-6` |
| Viewport | `max-width: 100vw; overflow-x: hidden` | — |
| 最小點擊區域 | `min-h-[44px]`（iOS 標準）| — |
| Modal 高度 | `max-h-[90svh]`（svh 排除 Safari 位址列）| — |

---

## 圖表（SVG 折線圖 — 體重趨勢）

- 純 SVG，不引入圖表套件，viewBox 自動縮放
- Y 軸：左側 3 個刻度（min / mid / max）+ 頂端「kg」單位標示
- 格線：`stroke="#f3f4f6"` 極淡水平線
- 填色：`fill="#6366f1" fillOpacity 0.06`（線下淺紫填色）
- 線條：`stroke="#818cf8"` strokeWidth 1.5，round join / cap
- 資料點：最新點 `r=4 fill="#6366f1"`，其餘 `r=3 fill="#a5b4fc"`，均有 `stroke="white"` 外框
- 數值標籤：每點正上方，最新點 indigo 加粗，其餘 gray-400
- X 軸：僅顯示第一筆 / 最後一筆日期，避免擁擠

---

## 設計原則

1. **資訊密度適中** — 桌機 compact，手機 single-column
2. **狀態透明** — 所有非同步操作提供 loading / success / error 回饋
3. **保守色彩** — 僅 Indigo 主色 + 語義狀態色（green / amber / red），其餘灰階
4. **無多餘裝飾** — 無漸層、無複雜 shadow，卡片以 border 分隔
5. **原生優先，問題才換** — Safari `<input type="date">` overflow 問題時改用自製日期導航 UI
6. **本地時間優先** — 所有日期顯示用 `toLocaleDateString / getFullYear / getDate`，避免 UTC 邊界日期偏移
