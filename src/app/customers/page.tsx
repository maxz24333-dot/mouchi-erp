'use client'
import { useState, useEffect } from 'react'
import { useBrand } from '@/lib/brand'

interface Customer {
  id: string; brand: string; name: string
  phone?: string; email?: string; notes?: string; created_at: string
}

export default function CustomersPage() {
  const { brand, isWholesale } = useBrand()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  const [name, setName]   = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const accentBg   = isWholesale ? 'bg-indigo-500' : 'bg-pink-500'
  const accentText = isWholesale ? 'text-indigo-600' : 'text-pink-600'

  useEffect(() => { fetchCustomers() }, [brand])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?brand=${brand}`)
      const data = await res.json()
      if (Array.isArray(data)) setCustomers(data)
    } finally { setLoading(false) }
  }

  function openAdd() {
    setEditId(null); setName(''); setPhone(''); setEmail(''); setNotes('')
    setError(''); setShowForm(true)
  }

  function openEdit(c: Customer) {
    setEditId(c.id); setName(c.name); setPhone(c.phone||''); setEmail(c.email||''); setNotes(c.notes||'')
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) { setError('請輸入客戶名稱'); return }
    setSaving(true); setError('')
    try {
      const body = { brand, name: name.trim(), phone: phone||null, email: email||null, notes: notes||null }
      const res = editId
        ? await fetch(`/api/customers?id=${editId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
        : await fetch('/api/customers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (!res.ok) { const e = await res.json(); setError(e.error || '儲存失敗'); return }
      setShowForm(false)
      fetchCustomers()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, nm: string) {
    if (!window.confirm(`確定刪除「${nm}」？`)) return
    await fetch(`/api/customers?id=${id}`, { method: 'DELETE' })
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone||'').includes(search) || (c.email||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden lg:block p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">客戶資料庫</h1>
            <p className="text-sm text-gray-500 mt-0.5">{customers.length} 位客戶</p>
          </div>
          <button onClick={openAdd} className={`px-4 py-2 text-sm font-medium text-white ${accentBg} rounded-xl hover:opacity-90 transition`}>
            + 新增客戶
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜尋名稱、電話、Email…"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-200" />
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? '編輯客戶' : '新增客戶'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">姓名 *</label>
                <input value={name} onChange={e=>setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">電話</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">備註</label>
                <input value={notes} onChange={e=>setNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className={`px-5 py-2 text-sm font-medium text-white ${accentBg} rounded-xl hover:opacity-90 disabled:opacity-50`}>
                {saving ? '儲存中…' : '儲存'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-5 py-2 text-sm text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">
                取消
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400">載入中…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm">{search ? '找不到符合的客戶' : '還沒有客戶資料'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">姓名</th>
                  <th className="px-4 py-3 text-left font-medium">電話</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">備註</th>
                  <th className="px-4 py-3 text-left font-medium">新增時間</th>
                  <th className="px-4 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{c.notes || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{c.created_at?.slice(0,10)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(c)} className={`text-xs ${accentText} hover:underline mr-3`}>編輯</button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="text-xs text-red-400 hover:text-red-600">刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden min-h-screen pb-24">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-bold text-gray-800">客戶資料庫</h1>
            <button onClick={openAdd} className={`text-xs font-medium px-3 py-1.5 rounded-full text-white ${accentBg}`}>
              + 新增
            </button>
          </div>
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜尋名稱、電話…"
            className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        </header>

        {showForm && (
          <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? '編輯客戶' : '新增客戶'}</h2>
            {[{label:'姓名 *',val:name,set:setName},{label:'電話',val:phone,set:setPhone},{label:'Email',val:email,set:setEmail},{label:'備註',val:notes,set:setNotes}].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 mb-0.5 block">{f.label}</label>
                <input value={f.val} onChange={e=>f.set(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            ))}
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className={`flex-1 py-2.5 text-sm font-medium text-white ${accentBg} rounded-xl disabled:opacity-50`}>
                {saving ? '儲存中…' : '儲存'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 text-sm text-gray-500 bg-gray-100 rounded-xl">
                取消
              </button>
            </div>
          </div>
        )}

        <div className="px-4 pt-3 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">載入中…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm">{search ? '找不到符合的客戶' : '還沒有客戶資料'}</p>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(c)} className={`text-xs ${accentText} font-medium`}>編輯</button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="text-xs text-red-400">刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
