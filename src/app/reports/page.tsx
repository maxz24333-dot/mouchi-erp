'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Period = 'this_month' | 'last_month' | 'last_3m' | 'this_year' | 'all' | 'custom'
type BrandFilter = 'all' | 'mouchi' | 'wholesale'

const PERIODS: { v: Period; l: string }[] = [
  { v: 'this_month', l: '本月' },
  { v: 'last_month', l: '上月' },
  { v: 'last_3m',    l: '近3個月' },
  { v: 'this_year',  l: '今年' },
  { v: 'all',        l: '全部' },
  { v: 'custom',     l: '自訂' },
]

function periodDates(p: Period, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (p === 'this_month') {
    return { from: `${y}-${pad(m + 1)}-01`, to: ymd(now) }
  }
  if (p === 'last_month') {
    const first = new Date(y, m - 1, 1)
    const last  = new Date(y, m, 0)
    return { from: ymd(first), to: ymd(last) }
  }
  if (p === 'last_3m') {
    const first = new Date(y, m - 2, 1)
    return { from: ymd(first), to: ymd(now) }
  }
  if (p === 'this_year') {
    return { from: `${y}-01-01`, to: ymd(now) }
  }
  if (p === 'custom') {
    return { from: customFrom || undefined, to: customTo || undefined }
  }
  return {}
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000) return `NT$${(n / 1000).toFixed(1)}k`
  return `NT$${Math.round(n).toLocaleString()}`
}
function pct(n: number) { return `${(n * 100).toFixed(1)}%` }

export default function ReportsPage() {
  const [period, setPeriod]         = useState<Period>('this_month')
  const [brand, setBrand]           = useState<BrandFilter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')
  const [loading, setLoading]       = useState(true)
  const [data, setData]             = useState<any>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    const { from, to } = periodDates(period, customFrom, customTo)
    const params = new URLSearchParams({ brand })
    if (from) params.set('from', from)
    if (to)   params.set('to', to)
    try {
      const res = await fetch(`/api/reports?${params}`)
      const json = await res.json()
      setData(json)
    } finally { setLoading(false) }
  }, [period, brand, customFrom, customTo])

  useEffect(() => {
    if (period !== 'custom') fetchReport()
  }, [period, brand])

  const s = data?.summary
  const byMonth: any[] = data?.by_month ?? []
  const topProducts: any[] = data?.top_products ?? []

  const desktopContent = (
    <div className="p-6 space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">進銷存報表</h1>
          <p className="text-sm text-gray-500 mt-0.5">銷售、利潤、庫存週期分析</p>
        </div>
        {/* Brand filter */}
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
          {([['all','全部'],['mouchi','MOUCHI零售'],['wholesale','批發倉']] as [BrandFilter, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setBrand(v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${brand === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {PERIODS.map(p => (
          <button key={p.v} onClick={() => setPeriod(p.v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${period === p.v ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
            {p.l}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">從</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">到</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <button onClick={fetchReport}
            className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700">
            查詢
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400">載入中…</div>
      ) : !data ? (
        <div className="py-16 text-center text-gray-400">無資料</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <SumCard label="銷售總額" value={fmt(s.revenue)} sub={`${s.qty} 件出貨`} color="text-gray-800" />
            <SumCard label="商品成本" value={fmt(s.cogs)} color="text-gray-600" />
            <SumCard label="毛利" value={fmt(s.profit)} color={s.profit >= 0 ? 'text-green-600' : 'text-red-500'} />
            <SumCard label="毛利率" value={pct(s.margin)} color={s.margin >= 0.3 ? 'text-green-600' : s.margin >= 0.15 ? 'text-amber-500' : 'text-red-500'} sub={s.revenue === 0 ? '無銷售記錄' : undefined} />
          </div>

          {/* Monthly breakdown */}
          {byMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">月份明細</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2.5 text-left font-medium">月份</th>
                    <th className="px-4 py-2.5 text-right font-medium">件數</th>
                    <th className="px-4 py-2.5 text-right font-medium">銷售額</th>
                    <th className="px-4 py-2.5 text-right font-medium">成本</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {byMonth.map(row => (
                    <tr key={row.month} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-700">{row.month.replace('-', '/')}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{row.qty}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(row.revenue)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{fmt(row.cogs)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(row.profit)}</td>
                      <td className={`px-4 py-3 text-right ${row.margin >= 0.3 ? 'text-green-600' : row.margin >= 0.15 ? 'text-amber-500' : 'text-red-500'}`}>{pct(row.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">熱銷商品 Top 10</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-2.5 text-left font-medium">#</th>
                    <th className="px-4 py-2.5 text-left font-medium">商品</th>
                    <th className="px-4 py-2.5 text-right font-medium">件數</th>
                    <th className="px-4 py-2.5 text-right font-medium">銷售額</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利</th>
                    <th className="px-4 py-2.5 text-right font-medium">毛利率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{p.qty}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(p.revenue)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(p.profit)}</td>
                      <td className={`px-4 py-3 text-right ${p.margin >= 0.3 ? 'text-green-600' : p.margin >= 0.15 ? 'text-amber-500' : 'text-red-500'}`}>{pct(p.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {byMonth.length === 0 && topProducts.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm text-gray-400">此時間段沒有銷售記錄</p>
              <p className="text-xs text-gray-300 mt-1">出貨後才會出現在報表中</p>
            </div>
          )}
        </>
      )}
    </div>
  )

  const mobileContent = (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <h1 className="text-base font-bold text-gray-800 mb-2">進銷存報表</h1>
        {/* Period pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PERIODS.map(p => (
            <button key={p.v} onClick={() => setPeriod(p.v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${period === p.v ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {p.l}
            </button>
          ))}
        </div>
      </header>

      {/* Brand filter */}
      <div className="flex gap-1.5 px-4 pt-3">
        {([['all','全部'],['mouchi','零售'],['wholesale','批發']] as [BrandFilter, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setBrand(v)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${brand === v ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="mx-4 mt-3 bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8">從</span>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-8">到</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <button onClick={fetchReport} className="w-full py-2 bg-gray-800 text-white text-xs rounded-xl">查詢</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">載入中…</div>
      ) : !data ? null : (
        <div className="px-4 pt-3 space-y-4">
          {/* Summary 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            <MobileCard label="銷售總額" value={fmt(s.revenue)} sub={`${s.qty} 件出貨`} />
            <MobileCard label="商品成本" value={fmt(s.cogs)} dim />
            <MobileCard label="毛利" value={fmt(s.profit)} green={s.profit >= 0} red={s.profit < 0} />
            <MobileCard label="毛利率" value={pct(s.margin)} green={s.margin >= 0.3} red={s.margin < 0.15 && s.revenue > 0} />
          </div>

          {/* Monthly */}
          {byMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-100">月份明細</p>
              <div className="divide-y divide-gray-50">
                {byMonth.map(row => (
                  <div key={row.month} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{row.month.replace('-', '/')}</span>
                      <span className="text-xs text-gray-400">{row.qty} 件</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">銷售 {fmt(row.revenue)} / 成本 {fmt(row.cogs)}</span>
                      <span className={`text-sm font-semibold ${row.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(row.profit)} <span className="text-xs font-normal">({pct(row.margin)})</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top products */}
          {topProducts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <p className="px-4 py-3 text-xs font-semibold text-gray-700 border-b border-gray-100">熱銷商品 Top 10</p>
              <div className="divide-y divide-gray-50">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.qty} 件・{fmt(p.revenue)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(p.profit)}</p>
                      <p className="text-[10px] text-gray-400">{pct(p.margin)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {byMonth.length === 0 && topProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm text-gray-400">此期間沒有銷售記錄</p>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{desktopContent}</div>
      <div className="lg:hidden">{mobileContent}</div>
    </>
  )
}

function SumCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MobileCard({ label, value, sub, green, red, dim }: {
  label: string; value: string; sub?: string; green?: boolean; red?: boolean; dim?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-base font-bold leading-tight ${green ? 'text-green-600' : red ? 'text-red-500' : dim ? 'text-gray-500' : 'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
