'use client'
import { useState, useEffect } from 'react'
import { useBrand } from '@/lib/brand'

interface Supplier {
  id: string; brand: string; name: string
  contact?: string; country?: string; notes?: string; created_at: string
}

const COUNTRIES = ['韓國', '日本', '泰國', '台灣', '中國', '美國', '其他']

export default function SuppliersPage() {
  const { brand, isWholesale } = useBrand()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [search, setSearch]       = useState('')

  const [name, setName]       = useState('')
  const [contact, setContact] = useState('')
  const [country, setCountry] = useState('')
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const accentBg   = isWholesale ? 'bg-indigo-500' : 'bg-pink-500'
  const accentText = isWholesale ? 'text-indigo-600' : 'text-pink-600'

  useEffect(() => { fetchSuppliers() }, [brand])

  async function fetchSuppliers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/suppliers?brand=${brand}`)
      const data = await res.json()
      if (Array.isArray(data)) setSuppliers(data)
    } finally { setLoading(false) }
  }

  function openAdd() {
    setEditId(null); setName(''); setContact(''); setCountry(''); setNotes('')
    setError(''); setShowForm(true)
  }

  function openEdit(s: Supplier) {
    setEditId(s.id); setName(s.name); setContact(s.contact||''); setCountry(s.country||''); setNotes(s.notes||'')
    setError(''); setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim()) { setError('請輸入供應商名稱'); return }
    setSaving(true); setError('')
    try {
      const body = { brand, name: name.trim(), contact: contact||null, country: country||null, notes: notes||null }
      const res = editId
        ? await fetch(`/api/suppliers?id=${editId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
        : await fetch('/api/suppliers', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (!res.ok) { const e = await res.json(); setError(e.error || '儲存失敗'); return }
      setShowForm(false)
      fetchSuppliers()
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string, nm: string) {
    if (!window.confirm(`確定刪除「${nm}」？`)) return
    await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
    setSuppliers(prev => prev.filter(s => s.id !== id))
  }

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.country||'').includes(search) || (s.contact||'').toLowerCase().includes(search.toLowerCase())
  )

  const countryFlag: Record<string, string> = { 韓國:'🇰🇷', 日本:'🇯🇵', 泰國:'🇹🇭', 台灣:'🇹🇼', 中國:'🇨🇳', 美國:'🇺🇸' }

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden lg:block p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">供應商管理</h1>
            <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} 個供應商</p>
          </div>
          <button onClick={openAdd} className={`px-4 py-2 text-sm font-medium text-white ${accentBg} rounded-xl hover:opacity-90 transition`}>
            + 新增供應商
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜尋名稱、國家、聯絡方式…"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-200" />
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? '編輯供應商' : '新增供應商'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">供應商名稱 *</label>
                <input value={name} onChange={e=>setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">聯絡方式</label>
                <input value={contact} onChange={e=>setContact(e.target.value)}
                  placeholder="電話、Line、WeChat…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">國家</label>
                <select value={country} onChange={e=>setCountry(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-300 bg-white">
                  <option value="">—</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
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
              <p className="text-3xl mb-2">🏭</p>
              <p className="text-sm">{search ? '找不到符合的供應商' : '還沒有供應商資料'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">供應商</th>
                  <th className="px-4 py-3 text-left font-medium">國家</th>
                  <th className="px-4 py-3 text-left font-medium">聯絡方式</th>
                  <th className="px-4 py-3 text-left font-medium">備註</th>
                  <th className="px-4 py-3 text-left font-medium">新增時間</th>
                  <th className="px-4 py-3 text-center font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.country ? `${countryFlag[s.country]||'🌍'} ${s.country}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.contact || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{s.notes || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{s.created_at?.slice(0,10)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(s)} className={`text-xs ${accentText} hover:underline mr-3`}>編輯</button>
                      <button onClick={() => handleDelete(s.id, s.name)} className="text-xs text-red-400 hover:text-red-600">刪除</button>
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
            <h1 className="text-base font-bold text-gray-800">供應商管理</h1>
            <button onClick={openAdd} className={`text-xs font-medium px-3 py-1.5 rounded-full text-white ${accentBg}`}>
              + 新增
            </button>
          </div>
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="搜尋名稱、國家…"
            className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
        </header>

        {showForm && (
          <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">{editId ? '編輯供應商' : '新增供應商'}</h2>
            {[{label:'供應商名稱 *',val:name,set:setName,ph:''},{label:'聯絡方式',val:contact,set:setContact,ph:'電話、Line…'},{label:'備註',val:notes,set:setNotes,ph:''}].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 mb-0.5 block">{f.label}</label>
                <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">國家</label>
              <select value={country} onChange={e=>setCountry(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white">
                <option value="">—</option>
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
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
              <p className="text-3xl mb-2">🏭</p>
              <p className="text-sm">{search ? '找不到符合的供應商' : '還沒有供應商資料'}</p>
            </div>
          ) : filtered.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-800">
                    {s.country && countryFlag[s.country] ? `${countryFlag[s.country]} ` : ''}{s.name}
                  </p>
                  {s.country && <p className="text-xs text-gray-500 mt-0.5">{s.country}</p>}
                  {s.contact && <p className="text-xs text-gray-400">{s.contact}</p>}
                  {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(s)} className={`text-xs ${accentText} font-medium`}>編輯</button>
                  <button onClick={() => handleDelete(s.id, s.name)} className="text-xs text-red-400">刪除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
