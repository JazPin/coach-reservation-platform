'use client'

interface StepItem {
  title: string
  desc: string
}

interface SectionProps {
  icon: React.ReactNode
  title: string
  badge?: string
  children: React.ReactNode
}

function Section({ icon, title, badge, children }: SectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[14px] font-medium text-gray-900">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{badge}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Steps({ items }: { items: StepItem[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-medium flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <div>
            <div className="text-[13px] font-medium text-gray-900">{item.title}</div>
            <div className="text-[12px] text-gray-500 mt-0.5">{item.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-[12px] text-amber-800">
      <span className="shrink-0">💡</span>
      <span>{children}</span>
    </div>
  )
}

function Divider() {
  return <hr className="border-gray-50 my-4" />
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] rounded font-medium">{children}</span>
  )
}

export default function HelpPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="mb-2">
        <h1 className="text-[17px] font-medium text-gray-900">使用說明</h1>
        <p className="text-sm text-gray-500 mt-0.5">BookFit 功能教學，幫助你快速上手</p>
      </div>

      {/* 快速開始 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="快速開始"
        badge="新手必看"
      >
        <p className="text-[12px] text-gray-500 mb-4">只需四個步驟，即可完成第一堂課的完整流程。</p>
        <Steps items={[
          {
            title: '新增學員',
            desc: '點擊「新增學員」，填入姓名、聯絡方式與訓練目標後送出。',
          },
          {
            title: '建立堂數包',
            desc: '點擊「新增堂數包」，選擇學員、選擇堂數（或自訂）、填入單堂價格後建立。',
          },
          {
            title: '新增預約',
            desc: '點擊「新增預約」，選擇學員、調整日期與時間後建立預約，系統會寄出 Email 提醒。',
          },
          {
            title: '確認到課',
            desc: '在「排課」頁找到當天預約，點擊「確認到課」即自動扣除 1 堂。',
          },
        ]} />
        <Tip>建立堂數包前請先新增學員，預約前建議先有堂數包，這樣系統才能自動扣點。</Tip>
      </Section>

      {/* 今日儀表板 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="今日儀表板"
      >
        <p className="text-[12px] text-gray-500 mb-3">每天打開 App 的第一個畫面，快速掌握當天狀況。</p>
        <div className="space-y-2.5">
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-0.5">統計卡片</div>
            <div className="text-[12px] text-gray-500">顯示本月收入、活躍學員數、課堂數、爽約率，讓你一眼掌握業績。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-0.5">今日課程</div>
            <div className="text-[12px] text-gray-500">列出今天所有預約，可直接點「查看全部」進入排課頁。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-0.5">需要處理</div>
            <div className="text-[12px] text-gray-500">自動匯整需要跟進的事項：堂數快用完的學員、長時間未上課的學員等。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-0.5">快速操作</div>
            <div className="text-[12px] text-gray-500">右側有「新增預約」「新增學員」「新增堂數包」三個快捷按鈕，隨時可操作。</div>
          </div>
        </div>
      </Section>

      {/* 學員管理 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="學員管理"
      >
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[13px] font-medium text-gray-900">新增學員</div>
              <Tag>學員頁 → 新增學員</Tag>
            </div>
            <div className="text-[12px] text-gray-500">填入姓名（必填）、電話、Email、訓練目標後建立。免費方案最多 5 位學員。</div>
          </div>
          <Divider />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[13px] font-medium text-gray-900">搜尋與篩選</div>
            </div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>・搜尋框：輸入姓名或目標關鍵字即時過濾</div>
              <div>・<span className="font-medium">低堂數</span>：剩餘堂數 ≤ 3 堂的學員，需要補課包</div>
              <div>・<span className="font-medium">高風險</span>：超過 30 天未上課的學員，需要主動聯繫</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[13px] font-medium text-gray-900">補堂數</div>
              <Tag>學員列表 → + 補堂數</Tag>
            </div>
            <div className="text-[12px] text-gray-500">滑鼠移到學員列時右側出現「+ 補堂數」按鈕，可快速為該學員新增堂數包。</div>
          </div>
          <Divider />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[13px] font-medium text-gray-900">學員詳細頁</div>
              <Tag>點擊學員列</Tag>
            </div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>・<span className="font-medium">體態進度</span>：記錄體重、體脂率的趨勢圖</div>
              <div>・<span className="font-medium">課程紀錄</span>：查看歷史預約與到課狀態</div>
              <div>・<span className="font-medium">備忘筆記</span>：填寫訓練備注供內部參考</div>
              <div>・直接在詳細頁可「確認到課 · 扣 1 堂」（無需先建立預約）</div>
              <div>・點擊「編輯」可修改學員資料，點擊「刪除學員」永久移除</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 堂數包 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <path d="M20 12V22H4V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 7H2v5h20V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="堂數包管理"
      >
        <div className="space-y-3">
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">建立堂數包</div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>1. 選擇學員</div>
              <div>2. 選擇堂數：4、8、12、16、24 堂，或點「自訂」輸入任意數字</div>
              <div>3. 輸入單堂價格，系統自動計算總價</div>
              <div>4. 點「建立 N 堂包」完成</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">堂數如何扣除</div>
            <div className="text-[12px] text-gray-500">確認到課時，系統從最早建立的堂數包開始扣點（先進先出）。當一個堂數包用完，自動接著用下一個。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">低堂數警示</div>
            <div className="text-[12px] text-gray-500">學員剩餘堂數 ≤ 3 堂時，學員列表會標示「低堂數」，儀表板「需要處理」也會出現提示。</div>
          </div>
        </div>
        <Tip>一個學員可以有多個堂數包同時生效，系統會自動累加剩餘堂數。</Tip>
      </Section>

      {/* 排課管理 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
        title="排課管理"
      >
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[13px] font-medium text-gray-900">新增預約</div>
            </div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>1. 點擊右上角「新增預約」</div>
              <div>2. 選擇學員（右側顯示剩餘堂數）</div>
              <div>3. 用 <span className="font-mono">‹ ›</span> 切換日期，預設為明天</div>
              <div>4. 選擇時間段（僅顯示你在設定中開放的時段，已預約時段不顯示）</div>
              <div>5. 建立後系統自動寄 Email 提醒給學員</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">日曆導覽</div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>・左側小月曆：點擊任一日期跳到該天，<span className="font-mono">‹ ›</span> 可切換月份</div>
              <div>・標題列的 <span className="font-mono">‹ ›</span>：每次切換一天</div>
              <div>・有預約的日期在小月曆上會顯示藍點</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">修改預約</div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>在「待上課」預約卡片點「編輯」，可調整日期、時間段、時長及備注，學員欄位不可更改。</div>
              <div>儲存後系統重設 Email 提醒計時（變更日期後仍會在新時間前 48h / 24h 寄提醒）。</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">確認到課（扣點）</div>
            <div className="text-[12px] text-gray-500">在當天的預約卡片點「確認到課」→ 確認彈窗 → 自動從堂數包扣除 1 堂，狀態改為「已到課」。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">標記爽約</div>
            <div className="text-[12px] text-gray-500">點「標記爽約」後狀態改為「爽約」，<span className="font-medium">不扣堂數</span>，爽約次數記入學員統計。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">刪除預約</div>
            <div className="text-[12px] text-gray-500">點「刪除」→ 確認 → 預約移除，若已確認到課則同步還原扣除的堂數。</div>
          </div>
        </div>
        <Tip>預約建立後系統會自動寄課前 48 小時與 24 小時 Email 提醒，可在設定頁關閉。</Tip>
      </Section>

      {/* 設定 */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        }
        title="設定"
      >
        <div className="space-y-3">
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">個人資料</div>
            <div className="text-[12px] text-gray-500">修改教練顯示名稱後點「儲存變更」生效。登入用的 Email 不可更改。</div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">可上課時段</div>
            <div className="text-[12px] text-gray-500">
              點擊格子切換開啟／關閉。新增預約時，時間段選擇只顯示你開放的時段，已被預約的時段會自動隱藏。設定完成後按「儲存時段」。
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">提醒通知</div>
            <div className="text-[12px] text-gray-500 space-y-1">
              <div>・<span className="font-medium">課前 48/24 小時 Email 提醒</span>：自動寄給學員，可分別開關</div>
              <div>・<span className="font-medium">低堂數警示</span>：學員堂數 ≤ 閾值時每日早上 9 點 Email 通知教練，閾值可選 1–5 堂</div>
              <div>・所有通知設定切換後<span className="font-medium">立即自動儲存</span>，不需要按儲存按鈕</div>
            </div>
          </div>
          <Divider />
          <div>
            <div className="text-[13px] font-medium text-gray-900 mb-1">訂閱方案</div>
            <div className="text-[12px] text-gray-500">免費方案最多 5 位學員。進度條顯示目前用量，滿額時無法新增學員。</div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        }
        title="常見問題"
      >
        <div className="space-y-4">
          {[
            {
              q: '確認到課後發現記錯了，可以取消嗎？',
              a: '到「排課」頁找到該預約，點「刪除」即可。若已扣點，系統會自動還原堂數。',
            },
            {
              q: '學員同時有多個堂數包，扣哪一個？',
              a: '系統按建立時間由舊到新扣除（先進先出）。先用完最早的那包，再用下一包。',
            },
            {
              q: '可以為同一個學員建立多個堂數包嗎？',
              a: '可以。系統會累加所有堂數包的剩餘堂數，顯示總剩餘堂數。',
            },
            {
              q: '新增預約為什麼看不到某些時間？',
              a: '時間段只顯示你在「設定 → 可上課時段」開放的時間，已被預約的時段也會隱藏。請先在設定頁確認時段是否開啟。',
            },
            {
              q: '超過 5 位學員上限怎麼辦？',
              a: '免費方案限 5 位，請在「設定 → 訂閱方案」升級至專業方案（NT$499/月）以新增更多學員。',
            },
          ].map((item, i) => (
            <div key={i}>
              <div className="text-[13px] font-medium text-gray-900 mb-1">Q：{item.q}</div>
              <div className="text-[12px] text-gray-500 pl-3 border-l-2 border-indigo-200">A：{item.a}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 意見回饋 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded p-4 text-center">
        <p className="text-[13px] text-indigo-800 font-medium mb-1">有其他問題或功能建議？</p>
        <p className="text-[12px] text-indigo-600">點擊左下角「建議回饋」告訴我們，我們會持續改善 BookFit。</p>
      </div>
    </div>
  )
}
