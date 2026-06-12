'use client'
import { useState, useEffect, useCallback } from 'react'

type MovType = 'all' | 'purchase' | 'sale' | 'wholesale_sale' | 'adjustment'
type BrandF  = 'all' | 'mouchi' | 'wholesale'

const TYPE_CFG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  purchase:      { label: '入庫',    bg: 'bg-blue-50',   text: 'text-blue-600',  icon: '📥' },
  sale:          { label: '零售出',  bg: 'bg-green-50',  text: 'text-green-600', icon: '🛍' },
  wholesale_sale:{ label: '批發出',  bg: 'bg-indigo-50', text: 'text-indigo-600',icon: '📦' },
  adjustment:    { label: '盤點調整',bg: 'bg-amber-50',  text: 'text-amber-600', icon: '⚖️' },
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmt(n: number) {
  if (Math.abs(n) >= 10000) return `NT$${(n/1000).toFixed(1)}k`
  return `NT$${Math.round(n).toLocaleString()}`
}

export default function LogsPage() {
  const [tab, setTab]           = useState<'movements' | 'snapshot'>('movements')
  const [brand, setBrand]       = useState<BrandF>('all')
  const [typeFilter, setType]   = useState<MovType>('all')
  const [from, setFrom]         = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [to, setTo]             = useState(today)
  const [loading, setLoading]   = useState(false)
  const [movements, setMovements] = useState<any[]>([])

  // Snapshot
  const [snapDate, setSnapDate]     = useState(today)
  const [snapBrand, setSnapBrand]   = useState<BrandF>('all')
  const [snapData, setSnapData]     = useState<any[]>([])
  const [snapLoading, setSnapLoading] = useState(false)
  const [snapLoaded, setSnapLoaded]   = useState(false)

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ brand })
      if (from) params.set('from', from)
      if (to)   params.set('to', to)
      const res = await fetch(`/api/stock-movements?${params}`)
      const json = await res.json()
      if (json.data) setMovements(json.data)
    } catch {}
    setLoading(false)
  }, [brand, from, to])

  useEffect(() => { if (tab === 'movements') fetchMovements() }, [tab, brand, from, to])

  async function fetchSnapshot() {
    setSnapLoading(true); setSnapLoaded(false)
    try {
      const params = new URLSearchParams({ brand: snapBrand, snapshot: snapDate })
      const res = await fetch(`/api/stock-movements?${params}`)
      const json = await res.json()
      if (json.data) setSnapData(json.data)
      setSnapLoaded(true)
    } catch {}
    setSnapLoading(false)
  }

  const filtered = typeFilter === 'all' ? movements : movements.filter(m => m.type === typeFilter)

  // Stats
  const inCount  = movements.filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0)
  const outCount = movements.filter(m => m.delta < 0).reduce((s, m) => s + Math.abs(m.delta), 0)
  const netValue = movements.reduce((s, m) => s + (m.total_value ?? 0), 0)

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────── */}
      <div className="hidden lg:block p-6 space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">庫存異動日誌</h1>
            <p className="text-sm text-gray-500 mt-0.5">所有入庫、出貨、盤點調整紀錄</p>
          </div>
          {/* Tab */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setTab('movements')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='movements'?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              異動日誌
            </button>
            <button onClick={() => setTab('snapshot')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab==='snapshot'?'bg-white text-gray-800 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              歷史庫存快照
            </button>
          </div>
        </div>

        {tab === 'movements' && (
          <>
            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
              <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl">
                {(['all','mouchi','wholesale'] as BrandF[]).map(b => (
                  <button key={b} onClick={() => setBrand(b)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${brand===b?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>
                    {b==='all'?'全部':b==='mouchi'?'MOUCHI零售':'批發倉'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">從</label>
                <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                <label className="text-xs text-gray-500">到</label>
                <input type="date" value={to} onChange={e=>setTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm" />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(['all','purchase','sale','wholesale_sale','adjustment'] as MovType[]).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${typeFilter===t?'bg-gray-800 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {t==='all'?'全部':TYPE_CFG[t]?.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">入庫件數</p>
                <p className="text-2xl font-bold text-blue-600">{inCount} 件</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">出庫件數</p>
                <p className="text-2xl font-bold text-green-600">{outCount} 件</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">出貨銷售額（已記錄）</p>
                <p className="text-2xl font-bold text-gray-800">{fmt(netValue)}</p>
              </div>
            </div>

            {/* Movements list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="py-16 text-center text-gray-400">載入中…</div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="text-sm">此期間無異動紀錄</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                      <th className="px-4 py-3 text-left font-medium">日期</th>
                      <th className="px-4 py-3 text-left font-medium">類型</th>
                      <th className="px-4 py-3 text-left font-medium">商品</th>
                      <th className="px-4 py-3 text-left font-medium">品牌</th>
                      <th className="px-4 py-3 text-right font-medium">數量</th>
                      <th className="px-4 py-3 text-right font-medium">單價 / 成本</th>
                      <th className="px-4 py-3 text-right font-medium">金額</th>
                      <th className="px-4 py-3 text-left font-medium">備註</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(m => {
                      const cfg = TYPE_CFG[m.type] ?? TYPE_CFG.purchase
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{m.date?.slice(0,10)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{m.product_name}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{m.brand==='mouchi'?'零售':'批發'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-semibold ${m.delta>0?'text-blue-600':'text-green-600'}`}>
                              {m.delta > 0 ? `+${m.delta}` : m.delta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">
                            {m.unit_price ? fmt(m.unit_price) : m.unit_cost ? fmt(m.unit_cost) : m.reason ? m.reason : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-700">
                            {m.total_value ? fmt(m.total_value) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
                            {m.buyer || m.supplier || m.note || ''}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {tab === 'snapshot' && (
          <SnapshotSection
            snapDate={snapDate} setSnapDate={setSnapDate}
            snapBrand={snapBrand} setSnapBrand={setSnapBrand}
            snapLoading={snapLoading} snapLoaded={snapLoaded}
            snapData={snapData} onFetch={fetchSnapshot}
          />
        )}
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────── */}
      <div className="lg:hidden min-h-screen pb-24">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
          <h1 className="text-base font-bold text-gray-800 mb-2">庫存異動日誌</h1>
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl mb-2">
            <button onClick={() => setTab('movements')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab==='movements'?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>
              異動日誌
            </button>
            <button onClick={() => setTab('snapshot')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab==='snapshot'?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>
              歷史快照
            </button>
          </div>
          {tab === 'movements' && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {(['all','mouchi','wholesale'] as BrandF[]).map(b => (
                <button key={b} onClick={() => setBrand(b)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${brand===b?'bg-gray-800 text-white':'bg-white text-gray-600 shadow-sm'}`}>
                  {b==='all'?'全部':b==='mouchi'?'零售':'批發'}
                </button>
              ))}
              <span className="flex-shrink-0 w-px" />
              {(['all','purchase','sale','wholesale_sale','adjustment'] as MovType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${typeFilter===t?'bg-gray-700 text-white':'bg-gray-100 text-gray-600'}`}>
                  {t==='all'?'全部類型':TYPE_CFG[t]?.icon+' '+TYPE_CFG[t]?.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {tab === 'movements' && (
          <div className="px-4 pt-3 space-y-3">
            <div className="flex gap-2">
              <input type="date" value={from} onChange={e=>setFrom(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-xs" />
              <span className="text-xs text-gray-400 self-center">至</span>
              <input type="date" value={to} onChange={e=>setTo(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-2 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <p className="text-[10px] text-gray-400">入庫件數</p>
                <p className="text-base font-bold text-blue-600">{inCount}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <p className="text-[10px] text-gray-400">出庫件數</p>
                <p className="text-base font-bold text-green-600">{outCount}</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                <p className="text-[10px] text-gray-400">出貨額</p>
                <p className="text-base font-bold text-gray-800">{fmt(netValue)}</p>
              </div>
            </div>
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-sm">載入中…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">此期間無異動紀錄</div>
            ) : (
              <div className="space-y-2">
                {filtered.map(m => {
                  const cfg = TYPE_CFG[m.type] ?? TYPE_CFG.purchase
                  return (
                    <div key={m.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <span className="text-[10px] text-gray-400">{m.date?.slice(0,10)}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700 truncate">{m.product_name}</p>
                          {(m.buyer || m.supplier || m.note) && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{m.buyer || m.supplier || m.note}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${m.delta>0?'text-blue-600':'text-green-600'}`}>
                            {m.delta>0?'+':''}{m.delta} 件
                          </p>
                          {m.total_value > 0 && <p className="text-[10px] text-gray-500">{fmt(m.total_value)}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'snapshot' && (
          <div className="px-4 pt-3">
            <SnapshotSection
              snapDate={snapDate} setSnapDate={setSnapDate}
              snapBrand={snapBrand} setSnapBrand={setSnapBrand}
              snapLoading={snapLoading} snapLoaded={snapLoaded}
              snapData={snapData} onFetch={fetchSnapshot} mobile
            />
          </div>
        )}
      </div>
    </>
  )
}

function SnapshotSection({ snapDate, setSnapDate, snapBrand, setSnapBrand, snapLoading, snapLoaded, snapData, onFetch, mobile }: {
  snapDate: string; setSnapDate: (v:string) => void
  snapBrand: string; setSnapBrand: (v:string) => void
  snapLoading: boolean; snapLoaded: boolean; snapData: any[]
  onFetch: () => void; mobile?: boolean
}) {
  const total = snapData.reduce((s, p) => s + p.stock, 0)
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">查詢某個日期的庫存狀況</p>
        <p className="text-xs text-gray-400">根據入庫、出貨、盤點記錄反推指定日期的庫存量（需有完整的進銷記錄）</p>
        <div className={`flex ${mobile?'flex-col':'items-center'} gap-3`}>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">快照日期</label>
            <input type="date" value={snapDate} onChange={e=>setSnapDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-1 bg-gray-100 p-0.5 rounded-xl">
            {(['all','mouchi','wholesale'] as const).map(b => (
              <button key={b} onClick={() => setSnapBrand(b)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${snapBrand===b?'bg-white text-gray-800 shadow-sm':'text-gray-500'}`}>
                {b==='all'?'全部':b==='mouchi'?'零售':'批發'}
              </button>
            ))}
          </div>
          <button onClick={onFetch} disabled={snapLoading}
            className="px-5 py-2 bg-gray-800 text-white text-sm rounded-xl hover:bg-gray-700 disabled:opacity-50">
            {snapLoading ? '計算中…' : '查詢快照'}
          </button>
        </div>
      </div>

      {snapLoaded && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">{snapDate} 的庫存估算</h2>
            <span className="text-xs text-gray-400">共 {total} 件在庫 · {snapData.length} 款商品</span>
          </div>
          {snapData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">此日期前無記錄</div>
          ) : mobile ? (
            <div className="divide-y divide-gray-50">
              {snapData.map(p => (
                <div key={p.product_id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.product_name}</p>
                    <p className="text-[10px] text-gray-400">{p.brand==='mouchi'?'零售':'批發'}</p>
                  </div>
                  <span className={`text-base font-bold ${p.stock>0?'text-gray-800':'text-red-400'}`}>
                    {p.stock} 件
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 text-left font-medium">商品</th>
                  <th className="px-4 py-3 text-left font-medium">品牌</th>
                  <th className="px-4 py-3 text-right font-medium">估算庫存</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {snapData.map(p => (
                  <tr key={p.product_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700">{p.product_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{p.brand==='mouchi'?'MOUCHI零售':'批發倉'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${p.stock>0?'text-gray-800':'text-red-400'}`}>
                      {p.stock} 件
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
