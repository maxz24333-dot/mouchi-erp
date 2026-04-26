'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/')
        router.refresh()
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-gray-800 tracking-widest">MOUCHI</p>
          <p className="text-xs text-gray-400 mt-1">選物後台</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium">密碼</label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="請輸入密碼"
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 transition-colors"
              autoFocus
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 text-center">密碼錯誤，請再試一次</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-400 hover:bg-pink-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
          >
            {loading ? '驗證中…' : '進入'}
          </button>
        </form>
      </div>
    </div>
  )
}
