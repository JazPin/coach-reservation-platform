'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Props {
  coachName: string
  onClose: () => void
}

export default function FeedbackModal({ coachName, onClose }: Props) {
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setContact(data.user.email)
    })
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit() {
    if (!message.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachName, contact, message }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[15px] font-medium">建議回饋</span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-900 rounded hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {status === 'sent' ? (
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 13l4 4L19 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">感謝您的回饋！</p>
            <p className="text-xs text-gray-500 mb-6">我們會盡快查看並持續改善。</p>
            <button
              onClick={onClose}
              className="text-xs px-5 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 transition-colors"
            >
              關閉
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                聯絡方式
                <span className="ml-1.5 normal-case font-normal text-gray-400">（選填，方便我們回覆）</span>
              </label>
              <input
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Email 或電話"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                內容 <span className="text-red-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="功能建議、問題回報、使用心得…"
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded resize-none focus:outline-none focus:border-indigo-400"
              />
            </div>

            {status === 'error' && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded">送出失敗，請稍後再試。</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="text-xs px-4 py-2 border border-gray-200 rounded text-gray-500 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!message.trim() || status === 'sending'}
                className="text-xs px-5 py-2 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                {status === 'sending' ? '送出中…' : '送出'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
