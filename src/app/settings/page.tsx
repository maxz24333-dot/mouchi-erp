'use client'
import { useState, useEffect } from 'react'
import type { SourceRow, Settings } from '@/types'

const DEFAULT_SETTINGS: Settings = {
  default_service_fee_pct: 0.03,
  default_packaging_fee: 10,
  handling_fee_pct: 0.05,
  target_margin_pct: 0.4,
  exchange_rate_buffer: 1.05,
}

const BLANK_SOURCE = {
  label: '',
  currency: 'JPY',
  tax_pct: '10',
  shipping_per_kg: '280',
  search_country: 'jp',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [sources, setSources]   = useState<SourceRow[]>([])
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [adding, setAdding]     = useState(false)
  const [newSrc, setNewSrc]     = useState({ ...BLANK_SOURCE })
  const [submittingSrc, setSubmittingSrc] = useState(false)
  const [refreshingId, setRefreshingId]   = useState<string | null>(null)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editForm, setEditForm]           = useState<Partial<SourceRow & { tax_pct_pct: string; shipping_str: string }>>({})

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { if (d) setSettings(prev => ({ ...prev, ...d })) })
    loadSources()
  }, [])

  function loadSources() {
    fetch('/api/sources').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setSources(d)
    })
  }

  function update(key: keyof Settings, value: string) {
    setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  async function handleSaveSettings() {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSource() {
    if (!newSrc.label || !newSrc.currency) return
    setSubmittingSrc(true)
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSrc),
      })
      if (res.ok) {
        setAdding(false)
        setNewSrc({ ...BLANK_SOURCE })
        loadSources()
      }
    } finally {
      setSubmittingSrc(false)
    }
  }

  async function handleRefreshRate(id: string) {
    setRefreshingId(id)
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        setSources(prev => prev.map(s => s.id === id ? updated : s))
      }
    } finally {
      setRefreshingId(null)
    }
  }

  async function handleRefreshAll() {
    setRefreshingId('all')
    try {
      await Promise.all(sources.map(s =>
        fetch(`/api/sources/${s.id}`, { method: 'POST' })
          .then(r => r.ok ? r.json() : null)
          .then(updated => { if (updated) setSources(prev => prev.map(p => p.id === updated.id ? updated : p)) })
      ))
    } finally {
      setRefreshingId(null)
    }
  }

  async function handleDeleteSource(id: string, label: string) {
    if (!window.confirm(`確定刪除來源「${label}」？已有商品仍會顯示此來源 ID。`)) return
    const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' })
    if (res.ok) setSources(prev => prev.filter(s => s.id !== id))
  }

  function startEdit(s: SourceRow) {
    setEditingId(s.id)
    setEditForm({
      label: s.label,
      currency: s.currency,
      tax_pct_pct: String((s.tax_pct * 100).toFixed(1)),
      shipping_str: String(s.shipping_per_kg),
      search_country: s.search_country,
    })
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: editForm.label,
        currency: editForm.currency,
        tax_pct: editForm.tax_pct_pct,
        shipping_per_kg: editForm.shipping_str,
        search_country: editForm.search_country,
      }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSources(prev => prev.map(s => s.id === id ? updated : s))
      setEditingId(null)
    }
  }

  function rateAge(updatedAt: string | null) {
    if (!updatedAt) return '未取得'
    const h = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 3600000)
    if (h < 1) return '剛更新'
    if (h < 24) return `${h} 小時前`
    return `${Math.floor(h / 24)} 天前`
  }

  return (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <h1 className="text-base font-bold text-gray-800">系統設定</h1>
        <p className="text-xs text-gray-400">調整後記得儲存</p>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* ── 來源管理 ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">來源管理</h2>
            <div className="flex gap-2">
              <button onClick={handleRefreshAll} disabled={refreshingId === 'all'}
                className="text-xs text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg disabled:opacity-50">
                {refreshingId === 'all' ? '更新中…' : '↻ 全部更新匯率'}
              </button>
              <button onClick={() => setAdding(v => !v)}
                className="text-xs text-white bg-pink-500 px-2.5 py-1 rounded-lg">
                {adding ? '取消' : '＋ 新增來源'}
              </button>
            </div>
          </div>

          {/* 新增表單 */}
          {adding && (
            <div className="mb-4 bg-pink-50 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-pink-600">新增來源</p>
              <div className="grid grid-cols-2 gap-2">
                <SrcField label="顯示名稱 (含 emoji)">
                  <input value={newSrc.label} onChange={e => setNewSrc(p => ({ ...p, label: e.target.value }))}
                    placeholder="🇻🇳 越南" className={ic} />
                </SrcField>
                <SrcField label="幣別代碼">
                  <input value={newSrc.currency} onChange={e => setNewSrc(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                    placeholder="VND" maxLength={5} className={ic} />
                </SrcField>
                <SrcField label="稅率 (%)">
                  <input type="number" value={newSrc.tax_pct} onChange={e => setNewSrc(p => ({ ...p, tax_pct: e.target.value }))}
                    placeholder="0" className={ic} />
                </SrcField>
                <SrcField label="運費 (NT$/kg)">
                  <input type="number" value={newSrc.shipping_per_kg} onChange={e => setNewSrc(p => ({ ...p, shipping_per_kg: e.target.value }))}
                    placeholder="280" className={ic} />
                </SrcField>
                <SrcField label="搜尋地區代碼">
                  <input value={newSrc.search_country} onChange={e => setNewSrc(p => ({ ...p, search_country: e.target.value.toLowerCase() }))}
                    placeholder="vn (2碼)" maxLength={5} className={ic} />
                </SrcField>
              </div>
              <p className="text-[10px] text-gray-400">幣別代碼：JPY 日圓、THB 泰銖、KRW 韓元、USD 美元、VND 越盾…<br/>搜尋地區：jp 日本、th 泰國、kr 韓國、vn 越南、tw 台灣…<br/>匯率建立後自動抓取，稅率 0 = 無稅。</p>
              <button onClick={handleAddSource} disabled={submittingSrc || !newSrc.label || !newSrc.currency}
                className="w-full py-2 bg-pink-500 text-white text-sm rounded-xl font-medium disabled:opacity-50">
                {submittingSrc ? '建立中（自動抓匯率）…' : '建立來源'}
              </button>
            </div>
          )}

          {/* 來源列表 */}
          <div className="space-y-2">
            {sources.map(s => (
              <div key={s.id} className="border border-gray-100 rounded-xl overflow-hidden">
                {editingId === s.id ? (
                  <div className="p-3 bg-blue-50 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <SrcField label="顯示名稱">
                        <input value={editForm.label ?? ''} onChange={e => setEditForm(p => ({ ...p, label: e.target.value }))} className={ic} />
                      </SrcField>
                      <SrcField label="幣別代碼">
                        <input value={editForm.currency ?? ''} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value.toUpperCase() }))} maxLength={5} className={ic} />
                      </SrcField>
                      <SrcField label="稅率 (%)">
                        <input type="number" value={editForm.tax_pct_pct ?? ''} onChange={e => setEditForm(p => ({ ...p, tax_pct_pct: e.target.value }))} className={ic} />
                      </SrcField>
                      <SrcField label="運費 (NT$/kg)">
                        <input type="number" value={editForm.shipping_str ?? ''} onChange={e => setEditForm(p => ({ ...p, shipping_str: e.target.value }))} className={ic} />
                      </SrcField>
                      <SrcField label="搜尋地區代碼">
                        <input value={editForm.search_country ?? ''} onChange={e => setEditForm(p => ({ ...p, search_country: e.target.value.toLowerCase() }))} maxLength={5} className={ic} />
                      </SrcField>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(s.id)} className="flex-1 py-1.5 bg-blue-500 text-white text-xs rounded-lg">儲存</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {s.currency} · 稅{(s.tax_pct * 100).toFixed(0)}% · 運費 NT${s.shipping_per_kg}/kg · 搜尋 {s.search_country}
                      </p>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      {s.exchange_rate ? (
                        <>
                          <p className="font-semibold text-gray-700">1 {s.currency} = NT${s.exchange_rate.toFixed(4)}</p>
                          <p className="text-[10px] text-gray-400">{rateAge(s.exchange_rate_updated_at)}</p>
                        </>
                      ) : (
                        <p className="text-amber-500 text-[10px]">未取得匯率</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleRefreshRate(s.id)} disabled={refreshingId === s.id}
                        className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded disabled:opacity-50">
                        {refreshingId === s.id ? '…' : '↻'}
                      </button>
                      <button onClick={() => startEdit(s)} className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">編輯</button>
                      <button onClick={() => handleDeleteSource(s.id, s.label)} className="text-[10px] text-red-400 bg-red-50 px-2 py-0.5 rounded">刪除</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 匯率保守係數 ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">匯率保守係數</h2>
          <p className="text-xs text-gray-400 mb-2">實際使用匯率 = 即時匯率 × 此係數（預設 1.05，+5% 保守空間）</p>
          <NumberInput label="係數" value={settings.exchange_rate_buffer} onChange={v => update('exchange_rate_buffer', v)} step="0.01" unit="倍" />
        </div>

        {/* ── 成本預設 ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">成本預設值</h2>
          <div className="space-y-3">
            <NumberInput label="預設服務費率" value={settings.default_service_fee_pct * 100} onChange={v => update('default_service_fee_pct', String(parseFloat(v) / 100))} unit="%" />
            <NumberInput label="預設包裝費" value={settings.default_packaging_fee} onChange={v => update('default_packaging_fee', v)} unit="元" />
            <NumberInput label="手續費（人工成本）" value={settings.handling_fee_pct * 100} onChange={v => update('handling_fee_pct', String(parseFloat(v) / 100))} unit="%" />
          </div>
        </div>

        {/* ── 戰略判斷 ── */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">商品戰略判斷</h2>
          <p className="text-xs text-gray-400 mb-2">毛利率低於此值 × 0.7 → 引流品；高於此值 × 1.2 → 利潤品</p>
          <NumberInput label="目標毛利率" value={settings.target_margin_pct * 100} onChange={v => update('target_margin_pct', String(parseFloat(v) / 100))} unit="%" />
        </div>

        <button onClick={handleSaveSettings} disabled={saving}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all
            ${saved ? 'bg-green-500' : 'bg-pink-500 active:bg-pink-600 shadow-lg shadow-pink-200'}`}>
          {saved ? '✓ 已儲存' : saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </div>
  )
}

function SrcField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      {children}
    </div>
  )
}

function NumberInput({ label, value, onChange, unit, step = '1' }: {
  label: string; value: number; onChange: (v: string) => void; unit: string; step?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-600 flex-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="number" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)}
          step={step}
          className="w-24 text-right text-sm font-semibold border-b border-gray-200 focus:border-pink-400 outline-none pb-0.5 bg-transparent" />
        <span className="text-xs text-gray-400 w-8">{unit}</span>
      </div>
    </div>
  )
}

const ic = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 bg-white'
