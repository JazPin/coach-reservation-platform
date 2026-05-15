'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import FeedbackModal from './FeedbackModal'

export type NavKey = 'dashboard' | 'students' | 'schedule' | 'settings' | 'guide'

interface Props {
  activeKey: NavKey
  onNavigate: (key: NavKey) => void
  coachName: string
}

export const NAV = [
  {
    key: 'dashboard' as NavKey,
    label: '今日',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'students' as NavKey,
    label: '學員',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    key: 'schedule' as NavKey,
    label: '排課',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    key: 'settings' as NavKey,
    label: '設定',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    key: 'guide' as NavKey,
    label: '說明',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
]

export default function Sidebar({ activeKey, onNavigate, coachName }: Props) {
  const [showFeedback, setShowFeedback] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    // onAuthStateChange SIGNED_OUT in app-page.tsx handles the redirect
  }

  return (
    <>
      <aside className="hidden sm:flex w-52 bg-white border-r border-gray-100 flex-col h-screen sticky top-0 shrink-0">
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-gray-100">
          <span className="text-[15px] font-medium tracking-tight">
            BookFit
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(item => {
            const active = activeKey === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-[13px] transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Coach info + logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium shrink-0">
              {coachName[0]}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{coachName}</div>
              <div className="text-[10px] text-indigo-600">免費方案</div>
            </div>
          </div>
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[12px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            建議回饋
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-[12px] text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            登出
          </button>
        </div>
      </aside>

      {showFeedback && (
        <FeedbackModal coachName={coachName} onClose={() => setShowFeedback(false)} />
      )}
    </>
  )
}
