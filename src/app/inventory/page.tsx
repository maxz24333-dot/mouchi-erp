'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import InventoryTable from '@/components/InventoryTable'

type SourceFilter   = 'all' | 'thailand' | 'haido' | 'mdm' | 'sd' | 'other' | 'korea'
type StrategyFilter = 'all' | 'lead' | 'profit' | 'skip'
type StockFilter    = 'all' | 'in_stock' | 'low_stock' | 'sold_out'

const SOURCE_OPTS = [
  { v: 'all',      l: '全部' },
  { v: 'thailand', l: '🇹🇭 泰國' },
  { v: 'haido',    l: '🇯🇵 海度' },
  { v: 'mdm',      l: '🇯🇵 MDM' },
  { v: 'sd',       l: '🇯🇵 SD' },
  { v: 'korea',    l: '🇰🇷 韓國' },
  { v: 'other',    l: '📦 其他' },
] as const

const STRATEGY_OPTS = [
  { v: 'all',    l: '全部' },
  { v: 'lead',   l: '📣 引流' },
  { v: 'profit', l: '💰 利潤' },
  { v: 'skip',   l: '⛔ 放棄' },
] as const

export default function InventoryPage() {
  const [products, setProducts]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all')
  const [stockFilter, setStockFilter]   = useState<StockFilter>('all')
  const [exporting, setExporting]       = useState(false)

  useEffect(() => { fetchProducts() }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function handleSold(id: string, qty: number) {
    const product = products.find(p => p.id === id)
    if (!product) return
    const newSold = product.sold_quantity + qty
    await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sold_quantity: newSold }),
    })
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, sold_quantity: newSold, remaining_stock: p.stock_quantity - newSold } : p
    ))
  }

  async function handleUpdatePrice(id: string, price: number) {
    await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ my_selling_price: price }),
    })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, my_selling_price: price } : p))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : 'MOUCHI_庫存.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const filtered = useMemo(() => products.filter(p => {
    if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
    if (strategyFilter !== 'all' && p.strategy_tag !== strategyFilter) return false
    if (stockFilter !== 'all' && p.stock_status !== stockFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = (p.ai_suggested_name || p.product_name || '').toLowerCase()
      const code = (p.product_code || '').toLowerCase()
      if (!name.includes(q) && !code.includes(q)) return false
    }
    return true
  }), [products, sourceFilter, strategyFilter, stockFilter, search])

  const stats = useMemo(() => ({
    total:      products.length,
    totalStock: products.reduce((s, p) => s + p.remaining_stock, 0),
    lowStock:   products.filter(p => p.stock_status === 'low_stock').length,
    soldOut:    products.filter(p => p.stock_status === 'sold_out').length,
    revenue:    products.reduce((s, p) => s + (p.my_selling_price ?? 0) * p.sold_quantity, 0),
  }), [products])

  // ── Desktop layout ──────────────────────────────────────────────
  const desktopContent = (
    <div className="p-6 space-y-5">
      {/* Page title + stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">庫存管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} 款商品・{stats.totalStock} 件在庫</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition disabled:opacity-50">
            📊 {exporting ? '匯出中…' : '匯出 Excel'}
          </button>
          <Link href="/" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-pink-500 rounded-xl hover:bg-pink-600 transition">
            + 新增選品
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="商品款數" value={String(stats.total)} />
        <StatCard label="在庫件數" value={String(stats.totalStock)} />
        <StatCard label="低庫存警示" value={String(stats.lowStock)} warn={stats.lowStock > 0} onClick={stats.lowStock > 0 ? () => setStockFilter('low_stock') : undefined} />
        <StatCard label="已售完" value={String(stats.soldOut)} warn={stats.soldOut > 0} onClick={stats.soldOut > 0 ? () => setStockFilter('sold_out') : undefined} />
      </div>

      {/* Filter toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋商品名稱或編號…"
          className="flex-1 min-w-[180px] bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-200"
        />
        <div className="flex gap-1.5">
          {SOURCE_OPTS.map(o => (
            <button key={o.v} onClick={() => setSourceFilter(o.v as SourceFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${sourceFilter === o.v ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {o.l}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STRATEGY_OPTS.map(o => (
            <button key={o.v} onClick={() => setStrategyFilter(o.v as StrategyFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all
                ${strategyFilter === o.v ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {o.l}
            </button>
          ))}
        </div>
        {stockFilter !== 'all' && (
          <button onClick={() => setStockFilter('all')}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-800 text-white hover:bg-gray-700">
            清除篩選 ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <div className="skeleton h-6 w-1/3 mx-auto mb-3" />
            <div className="skeleton h-4 w-1/2 mx-auto" />
          </div>
        ) : (
          <InventoryTable products={filtered} onSold={handleSold} onUpdatePrice={handleUpdatePrice} />
        )}
      </div>
    </div>
  )

  // ── Mobile layout ───────────────────────────────────────────────
  const mobileContent = (
    <div className="min-h-screen pb-6">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold text-gray-800">庫存總覽</h1>
            <p className="text-xs text-gray-400">{stats.total} 款・{stats.totalStock} 件</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleExport} disabled={exporting}
              className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full disabled:opacity-50">
              {exporting ? '匯出中…' : '📊 Excel'}
            </button>
            <Link href="/" className="text-xs text-pink-500 font-medium bg-pink-50 px-3 py-1.5 rounded-full">+ 入庫</Link>
          </div>
        </div>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋商品名稱或編號…"
          className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
      </header>

      {(stats.lowStock > 0 || stats.soldOut > 0) && (
        <div className="flex gap-2 px-4 pt-3">
          {stats.lowStock > 0 && (
            <button onClick={() => setStockFilter('low_stock')}
              className="flex-1 bg-amber-50 text-amber-600 text-xs font-medium py-2 rounded-xl">
              ⚠️ 庫存偏低 {stats.lowStock} 款
            </button>
          )}
          {stats.soldOut > 0 && (
            <button onClick={() => setStockFilter('sold_out')}
              className="flex-1 bg-red-50 text-red-500 text-xs font-medium py-2 rounded-xl">
              🔴 已售完 {stats.soldOut} 款
            </button>
          )}
        </div>
      )}

      <div className="px-4 pt-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SOURCE_OPTS.map(o => (
            <button key={o.v} onClick={() => setSourceFilter(o.v as SourceFilter)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${sourceFilter === o.v ? 'bg-pink-400 text-white' : 'bg-white text-gray-600 shadow-sm'}`}>
              {o.l}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {STRATEGY_OPTS.map(o => (
            <button key={o.v} onClick={() => setStrategyFilter(o.v as StrategyFilter)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all
                ${strategyFilter === o.v ? 'bg-pink-400 text-white' : 'bg-white text-gray-600 shadow-sm'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">{search ? '找不到符合的商品' : '還沒有庫存，去入庫吧！'}</p>
            {!search && <Link href="/" className="mt-3 inline-block text-pink-500 text-sm font-medium">前往入庫 →</Link>}
          </div>
        ) : filtered.map(product => (
          <ProductCard key={product.id} product={product} onSold={handleSold} onUpdatePrice={handleUpdatePrice} />
        ))}
      </div>

      {stockFilter !== 'all' && (
        <div className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto px-4">
          <button onClick={() => setStockFilter('all')}
            className="w-full py-2.5 bg-gray-800 text-white text-sm rounded-2xl font-medium">
            清除篩選 ✕
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">{desktopContent}</div>
      {/* Mobile */}
      <div className="lg:hidden">{mobileContent}</div>
    </>
  )
}

function StatCard({ label, value, warn, onClick }: { label: string; value: string; warn?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 p-4 ${onClick ? 'cursor-pointer hover:border-pink-200 transition-colors' : ''}`}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${warn ? 'text-amber-500' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
