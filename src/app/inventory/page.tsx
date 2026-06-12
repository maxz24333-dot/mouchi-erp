'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { SourceRow, Settings } from '@/types'
import { useBrand } from '@/lib/brand'
import ProductCard from '@/components/ProductCard'
import InventoryTable from '@/components/InventoryTable'

type StrategyFilter = 'all' | 'lead' | 'profit' | 'skip'
type StockFilter    = 'all' | 'in_stock' | 'low_stock' | 'sold_out' | 'stale'

const STRATEGY_OPTS = [
  { v: 'all',    l: '全部' },
  { v: 'lead',   l: '📣 引流' },
  { v: 'profit', l: '💰 利潤' },
  { v: 'skip',   l: '⛔ 放棄' },
] as const

const ADJUST_REASONS = ['盤點增加', '盤點減少', '退貨入庫', '損耗報廢', '其他']

const DEFAULT_SETTINGS: Settings = {
  default_service_fee_pct: 0.03,
  default_packaging_fee: 10,
  handling_fee_pct: 0.05,
  target_margin_pct: 0.4,
  exchange_rate_buffer: 1.05,
  wholesale_target_margin_pct: 0.20,
  wholesale_handling_fee_pct: 0.03,
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function InventoryPage() {
  const { brand, isWholesale } = useBrand()
  const [products, setProducts]         = useState<any[]>([])
  const [sources, setSources]           = useState<SourceRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>('all')
  const [stockFilter, setStockFilter]   = useState<StockFilter>('all')
  const [exporting, setExporting]       = useState(false)
  const [settings, setSettings]         = useState<Settings>(DEFAULT_SETTINGS)

  // 入庫時間篩選
  const [purchaseFrom, setPurchaseFrom] = useState('')
  const [purchaseTo, setPurchaseTo]     = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)

  // 批量模式
  const [batchMode, setBatchMode]       = useState(false)
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen]         = useState(false)
  const [bulkBuyer, setBulkBuyer]       = useState('')
  const [bulkPrice, setBulkPrice]       = useState('')
  const [bulkSelling, setBulkSelling]   = useState(false)

  // 庫存調整 modal
  const [adjustProduct, setAdjustProduct] = useState<any>(null)
  const [adjustDelta, setAdjustDelta]     = useState('0')
  const [adjustReason, setAdjustReason]   = useState('盤點增加')
  const [adjustNote, setAdjustNote]       = useState('')
  const [adjustSaving, setAdjustSaving]   = useState(false)

  const sourcesMap = useMemo(() =>
    Object.fromEntries(sources.map(s => [s.id, s])), [sources]
  )

  useEffect(() => {
    fetchProducts()
    fetch('/api/settings').then(r=>r.json()).then(d=>{ if(d) setSettings(p=>({...p,...d})) }).catch(()=>{})
    fetch('/api/sources').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setSources(d) }).catch(()=>{})
  }, [brand])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?brand=${brand}`)
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }

  async function handleSold(id: string, qty: number, opts?: { buyer?: string; unitPrice?: number; variantId?: string }) {
    const product = products.find(p => p.id === id)
    if (!product) return
    const newSold = product.sold_quantity + qty
    await fetch(`/api/products/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sold_quantity: newSold }),
    })
    if (isWholesale) {
      await fetch('/api/shipment-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, variant_id: opts?.variantId||null, brand:'wholesale', buyer:opts?.buyer||null, quantity:qty, unit_price:opts?.unitPrice||null }),
      }).catch(()=>{})
    } else {
      await fetch('/api/sales-logs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id:id, variant_id:opts?.variantId||null, brand:'mouchi', quantity:qty, unit_price:product.my_selling_price??null, cost_per_unit:product.total_cost_with_handling??null }),
      }).catch(()=>{})
    }
    setProducts(prev => prev.map(p =>
      p.id === id ? { ...p, sold_quantity: newSold, remaining_stock: p.stock_quantity - newSold } : p
    ))
  }

  async function handleSaveProduct(id: string, edits: Record<string, any>) {
    const product = products.find(p => p.id === id)
    if (!product) return
    const merged = { ...product, ...edits }
    const costFields = ['original_cost', 'weight_g', 'packaging_fee', 'service_fee_pct']
    const costChanged = costFields.some(k => k in edits)

    let updates: Record<string, any> = { ...edits }
    if (costChanged) {
      const src = sourcesMap[merged.source]
      const shippingPerKg = src?.shipping_per_kg ?? 280
      const taxPct        = src?.tax_pct ?? 0
      const handlingFee   = isWholesale ? settings.wholesale_handling_fee_pct : settings.handling_fee_pct
      const twd_cost      = (merged.original_cost * (1 + taxPct) + merged.original_cost * merged.service_fee_pct) * merged.exchange_rate
      const shipping_fee  = (merged.weight_g / 1000) * shippingPerKg
      const total_cost    = twd_cost + shipping_fee + merged.packaging_fee
      const total_cost_with_handling = total_cost * (1 + handlingFee)
      updates = { ...updates, twd_cost, shipping_fee, total_cost, total_cost_with_handling }
    }
    const sp  = 'my_selling_price' in edits ? edits.my_selling_price : product.my_selling_price
    const cwh = updates.total_cost_with_handling ?? product.total_cost_with_handling
    if (sp && cwh) updates.profit_margin = (sp - cwh) / sp

    await fetch(`/api/products/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p
      const n = { ...p, ...updates }
      n.remaining_stock = n.stock_quantity - n.sold_quantity
      return n
    }))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function handleClone(id: string) {
    try {
      const res = await fetch(`/api/products/${id}/clone`, { method: 'POST' })
      if (res.ok) {
        const newProduct = await res.json()
        setProducts(prev => [newProduct, ...prev])
      }
    } catch {}
  }

  function openAdjust(id: string) {
    const p = products.find(x => x.id === id)
    if (!p) return
    setAdjustProduct(p)
    setAdjustDelta('0')
    setAdjustReason('盤點增加')
    setAdjustNote('')
  }

  async function handleAdjust() {
    if (!adjustProduct) return
    const delta = parseInt(adjustDelta) || 0
    if (delta === 0) { setAdjustProduct(null); return }
    setAdjustSaving(true)
    try {
      await fetch('/api/stock-adjustments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: adjustProduct.id,
          brand: adjustProduct.brand || brand,
          delta,
          reason: adjustReason,
          note: adjustNote || null,
          date: today(),
        }),
      })
      const newQty = Math.max(0, (adjustProduct.stock_quantity || 0) + delta)
      await fetch(`/api/products/${adjustProduct.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_quantity: newQty }),
      })
      setProducts(prev => prev.map(p => {
        if (p.id !== adjustProduct.id) return p
        const sq = Math.max(0, (p.stock_quantity || 0) + delta)
        return { ...p, stock_quantity: sq, remaining_stock: sq - (p.sold_quantity || 0) }
      }))
      setAdjustProduct(null)
    } finally { setAdjustSaving(false) }
  }

  async function handleBulkSell() {
    if (selectedIds.size === 0) return
    setBulkSelling(true)
    for (const id of Array.from(selectedIds)) {
      const p = products.find(x => x.id === id)
      if (!p || p.remaining_stock === 0) continue
      await handleSold(id, 1, isWholesale
        ? { buyer: bulkBuyer || undefined, unitPrice: parseFloat(bulkPrice) || undefined }
        : undefined
      )
    }
    setBulkSelling(false)
    setSelectedIds(new Set())
    setBatchMode(false)
    setBulkOpen(false)
    setBulkBuyer(''); setBulkPrice('')
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      const match = res.headers.get('Content-Disposition')?.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : 'MOUCHI_庫存.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const filtered = useMemo(() => products.filter(p => {
    if (sourceFilter !== 'all' && p.source !== sourceFilter) return false
    if (!isWholesale && strategyFilter !== 'all' && p.strategy_tag !== strategyFilter) return false

    // Stale = has stock, never sold, 45+ days old
    const daysSince = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0
    const isStale   = (p.remaining_stock ?? 0) > 0 && (p.sold_quantity ?? 0) === 0 && daysSince >= 45

    if (stockFilter === 'stale') { if (!isStale) return false }
    else if (stockFilter !== 'all' && p.stock_status !== stockFilter) return false

    if (search) {
      const q = search.toLowerCase()
      const name = (p.ai_suggested_name || p.product_name || '').toLowerCase()
      const code = (p.product_code || '').toLowerCase()
      if (!name.includes(q) && !code.includes(q)) return false
    }
    // 入庫時間篩選
    if (purchaseFrom && p.created_at && new Date(p.created_at) < new Date(purchaseFrom)) return false
    if (purchaseTo  && p.created_at && new Date(p.created_at) > new Date(purchaseTo + 'T23:59:59Z')) return false
    return true
  }), [products, sourceFilter, strategyFilter, stockFilter, search, isWholesale, purchaseFrom, purchaseTo])

  const stats = useMemo(() => {
    const profitCount = products.filter(p => p.strategy_tag === 'profit').length
    const leadCount   = products.filter(p => p.strategy_tag === 'lead').length
    const tagged      = profitCount + leadCount
    const daysSince   = (p: any) => p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : 0
    const staleCount  = products.filter(p => (p.remaining_stock??0)>0 && (p.sold_quantity??0)===0 && daysSince(p)>=45).length
    return {
      total:      products.length,
      totalStock: products.reduce((s, p) => s + (p.remaining_stock ?? 0), 0),
      lowStock:   products.filter(p => p.stock_status === 'low_stock').length,
      soldOut:    products.filter(p => p.stock_status === 'sold_out').length,
      staleCount, profitCount, leadCount,
      profitPct: tagged > 0 ? Math.round(profitCount / tagged * 100) : null,
      leadPct:   tagged > 0 ? Math.round(leadCount / tagged * 100) : null,
    }
  }, [products])

  const fin = useMemo(() => {
    const revenue       = products.reduce((s, p) => s + (p.my_selling_price ?? 0) * (p.sold_quantity ?? 0), 0)
    const soldCost      = products.reduce((s, p) => s + (p.total_cost_with_handling ?? 0) * (p.sold_quantity ?? 0), 0)
    const netProfit     = revenue - soldCost
    const margin        = revenue > 0 ? netProfit / revenue * 100 : 0
    const inventoryVal  = products.reduce((s, p) => s + (p.total_cost_with_handling ?? 0) * (p.remaining_stock ?? 0), 0)
    return { revenue, netProfit, margin, inventoryVal }
  }, [products])

  const accentBg    = isWholesale ? 'bg-indigo-500' : 'bg-pink-500'
  const accentHover = isWholesale ? 'hover:bg-indigo-600' : 'hover:bg-pink-600'
  const accentFilter = isWholesale ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white'

  const filterBar = (mobile?: boolean) => (
    <div className={`${mobile?'':'bg-white rounded-2xl border border-gray-100 p-4'} flex flex-col gap-3`}>
      {/* Row 1: search + source filters */}
      <div className={`flex ${mobile?'flex-col':'flex-wrap'} gap-3 items-center`}>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="搜尋商品名稱或編號…"
          className={`${mobile?'w-full':'flex-1 min-w-[180px]'} bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-pink-200`} />
        {!mobile && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setSourceFilter('all')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${sourceFilter==='all'?accentFilter:'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
            {sources.map(s => (
              <button key={s.id} onClick={() => setSourceFilter(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${sourceFilter===s.id?accentFilter:'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Row 2: strategy + stock + stale filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {!isWholesale && !mobile && (
          <div className="flex gap-1.5">
            {STRATEGY_OPTS.map(o => (
              <button key={o.v} onClick={() => setStrategyFilter(o.v as StrategyFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${strategyFilter===o.v?accentFilter:'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {o.l}
              </button>
            ))}
          </div>
        )}
        {stats.staleCount > 0 && (
          <button onClick={() => setStockFilter(s => s==='stale'?'all':'stale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${stockFilter==='stale'?'bg-amber-500 text-white':'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}>
            滯銷 {stats.staleCount} 款
          </button>
        )}

        {/* 入庫時間篩選 */}
        <button onClick={() => setShowDateFilter(v=>!v)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${showDateFilter||(purchaseFrom||purchaseTo)?'bg-gray-800 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📅 入庫日期{(purchaseFrom||purchaseTo)?' ✓':''}
        </button>

        {/* 批量模式 */}
        <button onClick={() => { setBatchMode(v=>!v); if(batchMode) setSelectedIds(new Set()) }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${batchMode?'bg-gray-800 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          {batchMode?`☑ 批量 (${selectedIds.size})`:'☐ 批量模式'}
        </button>

        {(stockFilter!=='all'||sourceFilter!=='all'||purchaseFrom||purchaseTo) && (
          <button onClick={() => { setStockFilter('all'); setSourceFilter('all'); setPurchaseFrom(''); setPurchaseTo(''); setShowDateFilter(false) }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-800 text-white hover:bg-gray-700">
            清除篩選 ✕
          </button>
        )}
      </div>

      {/* 入庫時間展開 */}
      {showDateFilter && (
        <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">入庫日期</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">從</label>
            <input type="date" value={purchaseFrom} onChange={e=>setPurchaseFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">到</label>
            <input type="date" value={purchaseTo} onChange={e=>setPurchaseTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs" />
          </div>
          {(purchaseFrom||purchaseTo) && (
            <button onClick={() => { setPurchaseFrom(''); setPurchaseTo('') }}
              className="text-xs text-gray-400 hover:text-gray-600">清除</button>
          )}
        </div>
      )}
    </div>
  )

  // ── Desktop layout ──────────────────────────────────────────────────
  const desktopContent = (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{isWholesale?'批發倉庫存':'庫存管理'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} 款商品・{stats.totalStock} 件在庫</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition disabled:opacity-50">
            📊 {exporting?'匯出中…':'匯出 Excel'}
          </button>
          <Link href="/" className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white ${accentBg} rounded-xl ${accentHover} transition`}>
            + 入庫
          </Link>
        </div>
      </div>

      {/* 財務統計 */}
      <div className="grid grid-cols-3 gap-4">
        <FinCard label="累計銷售額" value={fin.revenue} color="text-gray-800" />
        <FinCard label="累計淨利" value={fin.netProfit} color={fin.netProfit>=0?'text-green-600':'text-red-500'}
          sub={fin.revenue>0?`毛利率 ${fin.margin.toFixed(1)}%`:undefined} />
        <FinCard label="在庫總值（成本）" value={fin.inventoryVal} color="text-indigo-600" sub={`${stats.totalStock} 件在庫`} />
      </div>

      {/* 庫存概況 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="商品款數" value={String(stats.total)} sub={`在庫 ${stats.totalStock} 件`} />
        <StatCard label="低庫存警示" value={String(stats.lowStock)} warn={stats.lowStock>0}
          sub={stats.soldOut>0?`已售完 ${stats.soldOut} 款`:undefined}
          onClick={stats.lowStock>0?()=>setStockFilter('low_stock'):undefined} />
        {isWholesale ? (
          <StatCard label="已售完" value={String(stats.soldOut)} warn={stats.soldOut>0} />
        ) : (
          <StrategyCard profitCount={stats.profitCount} leadCount={stats.leadCount}
            profitPct={stats.profitPct} leadPct={stats.leadPct}
            onClickProfit={()=>setStrategyFilter('profit')}
            onClickLead={()=>setStrategyFilter('lead')} />
        )}
      </div>

      {filterBar()}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">載入中…</div>
        ) : (
          <InventoryTable
            products={filtered}
            sourcesMap={sourcesMap}
            settings={settings}
            isWholesale={isWholesale}
            selectedIds={batchMode ? selectedIds : undefined}
            onToggle={batchMode ? toggleSelect : undefined}
            onSold={handleSold}
            onSave={handleSaveProduct}
            onDelete={handleDelete}
            onClone={handleClone}
            onAdjust={openAdjust}
          />
        )}
      </div>
    </div>
  )

  // ── Mobile layout ───────────────────────────────────────────────────
  const mobileContent = (
    <div className="min-h-screen pb-6">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold text-gray-800">{isWholesale?'批發倉庫存':'庫存總覽'}</h1>
            <p className="text-xs text-gray-400">{stats.total} 款・{stats.totalStock} 件</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleExport} disabled={exporting}
              className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-full disabled:opacity-50">
              {exporting?'匯出中…':'📊 Excel'}
            </button>
            <Link href="/" className={`text-xs font-medium px-3 py-1.5 rounded-full ${isWholesale?'text-indigo-500 bg-indigo-50':'text-pink-500 bg-pink-50'}`}>
              + 入庫
            </Link>
          </div>
        </div>
        <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="搜尋商品名稱或編號…"
          className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm outline-none" />
      </header>

      {/* 財務統計 */}
      <div className="px-4 pt-3 grid grid-cols-3 gap-2">
        <MobileFinCard label="累計銷售" value={fin.revenue} />
        <MobileFinCard label="累計淨利" value={fin.netProfit} green={fin.netProfit>=0} />
        <MobileFinCard label="在庫總值" value={fin.inventoryVal} indigo />
      </div>
      {fin.revenue > 0 && (
        <div className="px-4 pt-1">
          <p className="text-[10px] text-gray-400 text-center">毛利率 {fin.margin.toFixed(1)}%　·　在庫 {stats.totalStock} 件</p>
        </div>
      )}

      {(stats.lowStock>0||stats.soldOut>0||stats.staleCount>0) && (
        <div className="flex gap-2 px-4 pt-2 overflow-x-auto no-scrollbar">
          {stats.lowStock>0 && (
            <button onClick={()=>setStockFilter('low_stock')}
              className="flex-shrink-0 flex-1 bg-amber-50 text-amber-600 text-xs font-medium py-2 rounded-xl">
              ⚠️ 低庫存 {stats.lowStock} 款
            </button>
          )}
          {stats.soldOut>0 && (
            <button onClick={()=>setStockFilter('sold_out')}
              className="flex-shrink-0 flex-1 bg-red-50 text-red-500 text-xs font-medium py-2 rounded-xl">
              🔴 售完 {stats.soldOut} 款
            </button>
          )}
          {stats.staleCount>0 && (
            <button onClick={()=>setStockFilter(s=>s==='stale'?'all':'stale')}
              className={`flex-shrink-0 flex-1 text-xs font-medium py-2 rounded-xl ${stockFilter==='stale'?'bg-amber-500 text-white':'bg-amber-50 text-amber-600'}`}>
              📦 滯銷 {stats.staleCount} 款
            </button>
          )}
        </div>
      )}

      {/* 篩選列 */}
      <div className="px-4 pt-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={()=>setSourceFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${sourceFilter==='all'?(isWholesale?'bg-indigo-400 text-white':'bg-pink-400 text-white'):'bg-white text-gray-600 shadow-sm'}`}>
            全部
          </button>
          {sources.map(s => (
            <button key={s.id} onClick={()=>setSourceFilter(s.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${sourceFilter===s.id?(isWholesale?'bg-indigo-400 text-white':'bg-pink-400 text-white'):'bg-white text-gray-600 shadow-sm'}`}>
              {s.label}
            </button>
          ))}
          <span className="flex-shrink-0 w-1" />
          <button onClick={()=>setShowDateFilter(v=>!v)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${showDateFilter||(purchaseFrom||purchaseTo)?'bg-gray-800 text-white':'bg-white text-gray-600 shadow-sm'}`}>
            📅{(purchaseFrom||purchaseTo)?' ✓':''}
          </button>
          <button onClick={()=>{setBatchMode(v=>!v);if(batchMode)setSelectedIds(new Set())}}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${batchMode?'bg-gray-800 text-white':'bg-white text-gray-600 shadow-sm'}`}>
            {batchMode?`☑ ${selectedIds.size}`:'☐'}
          </button>
        </div>

        {showDateFilter && (
          <div className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
            <input type="date" value={purchaseFrom} onChange={e=>setPurchaseFrom(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
            <span className="text-xs text-gray-400">至</span>
            <input type="date" value={purchaseTo} onChange={e=>setPurchaseTo(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
          </div>
        )}

        {!isWholesale && (
          <div className="flex gap-1.5">
            {STRATEGY_OPTS.map(o => (
              <button key={o.v} onClick={()=>setStrategyFilter(o.v as StrategyFilter)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${strategyFilter===o.v?'bg-pink-400 text-white':'bg-white text-gray-600 shadow-sm'}`}>
                {o.l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📦</p>
            <p className="text-sm">{search?'找不到符合的商品':'還沒有庫存，去入庫吧！'}</p>
            {!search && <Link href="/" className="mt-3 inline-block text-pink-500 text-sm font-medium">前往入庫 →</Link>}
          </div>
        ) : filtered.map(product => (
          <ProductCard key={product.id} product={product} sourcesMap={sourcesMap} isWholesale={isWholesale}
            selected={batchMode && selectedIds.has(product.id)}
            onSold={handleSold} onSave={handleSaveProduct}
            onClone={handleClone} onAdjust={openAdjust}
            onToggle={batchMode ? toggleSelect : undefined} />
        ))}
      </div>

      {(stockFilter!=='all'||sourceFilter!=='all'||purchaseFrom||purchaseTo) && (
        <div className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto px-4">
          <button onClick={()=>{setStockFilter('all');setSourceFilter('all');setPurchaseFrom('');setPurchaseTo('');setShowDateFilter(false)}}
            className="w-full py-2.5 bg-gray-800 text-white text-sm rounded-2xl font-medium">
            清除篩選 ✕
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">{desktopContent}</div>
      <div className="lg:hidden">{mobileContent}</div>

      {/* ── 批量出貨浮動欄 ── */}
      {batchMode && selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3">
          <span className="text-sm">已選 <strong>{selectedIds.size}</strong> 款</span>
          <button onClick={() => setBulkOpen(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-xl ${isWholesale?'bg-indigo-500 hover:bg-indigo-400':'bg-pink-500 hover:bg-pink-400'}`}>
            批量出貨 (各1件)
          </button>
          <button onClick={() => { setSelectedIds(new Set()); setBatchMode(false) }}
            className="text-gray-400 hover:text-white text-xs px-2">✕ 取消</button>
        </div>
      )}

      {/* ── 批量出貨確認 modal ── */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setBulkOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e=>e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">批量出貨確認</h2>
            <p className="text-sm text-gray-500">將對以下 {selectedIds.size} 款商品各出貨 1 件</p>
            <div className="bg-gray-50 rounded-xl px-3 py-2 max-h-32 overflow-y-auto space-y-1">
              {Array.from(selectedIds).map(id => {
                const p = products.find(x=>x.id===id)
                return p ? (
                  <p key={id} className="text-xs text-gray-600">{p.ai_suggested_name||p.product_name}（剩 {p.remaining_stock} 件）</p>
                ) : null
              })}
            </div>
            {isWholesale && (
              <div className="space-y-2">
                <input value={bulkBuyer} onChange={e=>setBulkBuyer(e.target.value)} placeholder="買家名稱（選填）"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300" />
                <input type="number" value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)} placeholder="統一批發價 NT$（選填）"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-300" />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleBulkSell} disabled={bulkSelling}
                className={`flex-1 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 ${isWholesale?'bg-indigo-500 hover:bg-indigo-600':'bg-pink-500 hover:bg-pink-600'}`}>
                {bulkSelling?'出貨中…':'確認批量出貨'}
              </button>
              <button onClick={()=>setBulkOpen(false)} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 庫存調整 modal ── */}
      {adjustProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setAdjustProduct(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e=>e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-bold text-gray-900">庫存盤點調整</h2>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{adjustProduct.ai_suggested_name||adjustProduct.product_name}</p>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">目前庫存</p>
              <p className="text-2xl font-bold text-gray-800">{adjustProduct.remaining_stock ?? 0} 件</p>
              <p className="text-xs text-gray-400 mt-1">進貨 {adjustProduct.stock_quantity} · 已售 {adjustProduct.sold_quantity}</p>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">調整數量（+ 增加 / − 減少）</label>
              <input type="number" value={adjustDelta} onChange={e=>setAdjustDelta(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-center font-bold outline-none focus:border-amber-300" />
              {parseInt(adjustDelta)!==0 && (
                <p className="text-xs text-gray-500 mt-1 text-center">
                  調整後庫存：<strong>{Math.max(0,(adjustProduct.remaining_stock??0)+parseInt(adjustDelta))} 件</strong>
                </p>
              )}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">原因</label>
              <select value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none bg-white focus:border-amber-300">
                {ADJUST_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">備註（選填）</label>
              <input value={adjustNote} onChange={e=>setAdjustNote(e.target.value)} placeholder="備註說明…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-300" />
            </div>

            <div className="flex gap-2">
              <button onClick={handleAdjust} disabled={adjustSaving||parseInt(adjustDelta)===0}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl disabled:opacity-40">
                {adjustSaving?'儲存中…':'確認調整'}
              </button>
              <button onClick={()=>setAdjustProduct(null)} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function fmt(n: number) {
  if (Math.abs(n) >= 10000) return `NT$${(n / 1000).toFixed(1)}k`
  return `NT$${Math.round(n).toLocaleString()}`
}

function FinCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function MobileFinCard({ label, value, green, indigo }: { label: string; value: number; green?: boolean; indigo?: boolean }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-2.5 text-center">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-bold leading-tight ${green!==undefined?(green?'text-green-600':'text-red-500'):indigo?'text-indigo-600':'text-gray-800'}`}>
        {fmt(value)}
      </p>
    </div>
  )
}

function StatCard({ label, value, sub, warn, onClick }: { label: string; value: string; sub?: string; warn?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`bg-white rounded-xl border border-gray-100 p-4 ${onClick?'cursor-pointer hover:border-pink-200 transition-colors':''}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${warn?'text-amber-500':'text-gray-800'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function StrategyCard({ profitCount, leadCount, profitPct, leadPct, onClickProfit, onClickLead }: {
  profitCount: number; leadCount: number; profitPct: number | null; leadPct: number | null
  onClickProfit: () => void; onClickLead: () => void
}) {
  const total = profitCount + leadCount
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-2">商品策略分佈</p>
      {total === 0 ? (
        <p className="text-sm text-gray-300">尚無戰略標籤</p>
      ) : (
        <>
          <div className="flex rounded-full overflow-hidden h-2 mb-2.5">
            {profitPct !== null && <div className="bg-green-400" style={{ width: `${profitPct}%` }} />}
            {leadPct   !== null && <div className="bg-blue-400"  style={{ width: `${leadPct}%` }} />}
          </div>
          <div className="flex gap-3 text-xs">
            <button onClick={onClickProfit} className="flex items-center gap-1 hover:text-green-700">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              <span className="font-semibold text-green-600">{profitCount}</span>
              <span className="text-gray-400">利潤{profitPct!==null?` ${profitPct}%`:''}</span>
            </button>
            <button onClick={onClickLead} className="flex items-center gap-1 hover:text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span className="font-semibold text-blue-600">{leadCount}</span>
              <span className="text-gray-400">引流{leadPct!==null?` ${leadPct}%`:''}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
