'use client'
import { useState, Fragment } from 'react'
import type { SourceRow, ProductVariant, Settings } from '@/types'
import { calcCost } from '@/lib/cost'
const STRATEGY_CONFIG: Record<string, { label: string; cls: string }> = {
  lead:   { label: '📣 引流', cls: 'bg-blue-50 text-blue-600' },
  profit: { label: '💰 利潤', cls: 'bg-green-50 text-green-700' },
  skip:   { label: '⛔ 放棄', cls: 'bg-red-50 text-red-500' },
}

interface Props {
  products: any[]
  sourcesMap: Record<string, SourceRow>
  settings: Settings
  onSold: (id: string, qty: number) => void
  onSave: (id: string, edits: Record<string, any>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function initForm(p: any) {
  return {
    ai_suggested_name: p.ai_suggested_name ?? '',
    product_code:      p.product_code ?? '',
    product_name:      p.product_name ?? '',
    strategy_tag:      p.strategy_tag ?? '',
    original_cost:     String(p.original_cost ?? ''),
    weight_g:          String(p.weight_g ?? ''),
    packaging_fee:     String(p.packaging_fee ?? ''),
    service_fee_pct:   String(((p.service_fee_pct ?? 0) * 100).toFixed(1)),
    my_selling_price:  String(p.my_selling_price ?? ''),
    stock_quantity:    String(p.stock_quantity ?? ''),
    sold_quantity:     String(p.sold_quantity ?? ''),
    notes:             p.notes ?? '',
    supplier_copy:     p.supplier_copy ?? '',
    ad_copy:           p.ad_copy ?? '',
  }
}

function isDirty(form: Record<string, string>, p: any) {
  const orig = initForm(p) as Record<string, string>
  return Object.keys(orig).some(k => form[k] !== orig[k])
}

export default function InventoryTable({ products, sourcesMap, settings, onSold, onSave, onDelete }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-sm">尚無商品</p>
      </div>
    )
  }

  return (
    <div className="inventory-scroll w-full overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="sticky left-0 z-20 bg-gray-50 px-3 py-3 w-12"></th>
            <th className="sticky left-12 z-20 bg-gray-50 px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide min-w-[200px] border-r border-gray-200">商品</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">來源</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-32 text-right">原始成本</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">落地成本</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">賣價</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">毛利</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-32 text-center">庫存</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-40">備註</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24 text-center">戰略</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-36 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <ProductRow key={p.id} product={p} sourcesMap={sourcesMap} settings={settings} onSold={onSold} onSave={onSave} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductRow({ product: p, sourcesMap, settings, onSold, onSave, onDelete }: {
  product: any
  sourcesMap: Record<string, SourceRow>
  settings: Settings
  onSold: (id: string, qty: number) => void
  onSave: (id: string, edits: Record<string, any>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [form, setForm]         = useState<Record<string, string>>(() => initForm(p))
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [variantOpen, setVariantOpen] = useState(false)
  const [soldQty, setSoldQty]   = useState(1)
  const [soldOpen, setSoldOpen] = useState(false)

  // variants
  const [variants, setVariants] = useState<ProductVariant[]>(p.variants ?? [])
  const [newLabel, setNewLabel] = useState('')
  const [newStock, setNewStock] = useState('1')
  const [addingV, setAddingV]   = useState(false)
  const [soldVariantId, setSoldVariantId] = useState<string>('')
  const [soldVariantQty, setSoldVariantQty] = useState(1)

  const hasVariants = variants.length > 0

  const dirty    = isDirty(form, p)
  const srcInfo  = sourcesMap[p.source]
  const currency = srcInfo?.currency ?? p.source?.toUpperCase() ?? 'JPY'
  const srcLabel = srcInfo?.label ?? p.source ?? '—'
  const strategy = form.strategy_tag ? STRATEGY_CONFIG[form.strategy_tag] : null

  // live cost computation — recalculates whenever form changes
  const liveCost = (parseFloat(form.original_cost) > 0 && p.exchange_rate)
    ? calcCost({
        originalCost:   parseFloat(form.original_cost) || 0,
        weightG:        parseFloat(form.weight_g) || 0,
        packagingFee:   parseFloat(form.packaging_fee) || 0,
        serviceFeePct:  (parseFloat(form.service_fee_pct) || 0) / 100,
        taxPct:         srcInfo?.tax_pct ?? 0,
        exchangeRate:   p.exchange_rate,
        handlingFeePct: settings.handling_fee_pct,
      }, srcInfo?.shipping_per_kg ?? 280)
    : null

  const sellingPrice = parseFloat(form.my_selling_price) || null
  const totalCostWH  = liveCost?.totalCostWithHandling ?? p.total_cost_with_handling ?? 0
  const profit  = sellingPrice && totalCostWH ? sellingPrice - totalCostWH : null
  const margin  = profit !== null && sellingPrice ? profit / sellingPrice * 100 : null
  const marginCls = margin === null ? 'text-gray-300' : margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'

  const totalStock    = hasVariants ? variants.reduce((s, v) => s + v.stock_quantity, 0) : (parseInt(form.stock_quantity) || 0)
  const totalSold     = hasVariants ? variants.reduce((s, v) => s + v.sold_quantity,  0) : (parseInt(form.sold_quantity)  || 0)
  const totalRemaining = totalStock - totalSold
  const stockCls = totalRemaining === 0 ? 'text-red-400' : totalRemaining <= 3 ? 'text-amber-500' : 'text-gray-700'

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setSaving(true)
    const sp = parseFloat(form.my_selling_price) || null
    await onSave(p.id, {
      ai_suggested_name: form.ai_suggested_name || null,
      product_code:      form.product_code,
      product_name:      form.product_name,
      strategy_tag:      form.strategy_tag || null,
      original_cost:     parseFloat(form.original_cost) || p.original_cost,
      weight_g:          parseFloat(form.weight_g) || 0,
      packaging_fee:     parseFloat(form.packaging_fee) || 0,
      service_fee_pct:   (parseFloat(form.service_fee_pct) || 0) / 100,
      my_selling_price:  sp,
      ...(liveCost && {
        twd_cost:                 liveCost.twdCost,
        shipping_fee:             liveCost.shippingFee,
        total_cost:               liveCost.totalCost,
        total_cost_with_handling: liveCost.totalCostWithHandling,
        profit_margin:            sp && sp > 0 ? liveCost.profitMargin(sp) : null,
      }),
      ...(!hasVariants && {
        stock_quantity: parseInt(form.stock_quantity) || 0,
        sold_quantity:  parseInt(form.sold_quantity)  || 0,
      }),
      notes:         form.notes,
      supplier_copy: form.supplier_copy,
      ad_copy:       form.ad_copy,
    })
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm(`確定刪除「${p.ai_suggested_name || p.product_name || '此商品'}」？`)) return
    setDeleting(true)
    await onDelete(p.id)
    setDeleting(false)
  }

  async function handleAddVariant() {
    if (!newLabel.trim()) return
    setAddingV(true)
    const res = await fetch(`/api/products/${p.id}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel.trim(), stock_quantity: parseInt(newStock) || 0 }),
    })
    if (res.ok) {
      const v = await res.json()
      setVariants(prev => [...prev, v])
      setNewLabel(''); setNewStock('1')
      // sync form totals
      const newVariants = [...variants, v]
      setForm(prev => ({
        ...prev,
        stock_quantity: String(newVariants.reduce((s, vv) => s + vv.stock_quantity, 0)),
        sold_quantity:  String(newVariants.reduce((s, vv) => s + vv.sold_quantity, 0)),
      }))
    }
    setAddingV(false)
  }

  async function handleDeleteVariant(vid: string) {
    await fetch(`/api/products/${p.id}/variants/${vid}`, { method: 'DELETE' })
    setVariants(prev => {
      const next = prev.filter(v => v.id !== vid)
      setForm(f => ({
        ...f,
        stock_quantity: String(next.reduce((s, v) => s + v.stock_quantity, 0)),
        sold_quantity:  String(next.reduce((s, v) => s + v.sold_quantity, 0)),
      }))
      return next
    })
  }

  async function handleVariantStockChange(vid: string, field: 'stock_quantity' | 'sold_quantity', val: number) {
    setVariants(prev => prev.map(v => v.id === vid ? { ...v, [field]: val } : v))
  }

  async function saveVariantStock(vid: string) {
    const v = variants.find(vv => vv.id === vid)
    if (!v) return
    await fetch(`/api/products/${p.id}/variants/${vid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_quantity: v.stock_quantity, sold_quantity: v.sold_quantity }),
    })
    setForm(prev => ({
      ...prev,
      stock_quantity: String(variants.reduce((s, vv) => s + vv.stock_quantity, 0)),
      sold_quantity:  String(variants.reduce((s, vv) => s + vv.sold_quantity, 0)),
    }))
  }

  async function handleVariantSell() {
    if (!soldVariantId || soldVariantQty < 1) return
    const v = variants.find(vv => vv.id === soldVariantId)
    if (!v) return
    const newSold = v.sold_quantity + soldVariantQty
    const res = await fetch(`/api/products/${p.id}/variants/${soldVariantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sold_quantity: newSold }),
    })
    if (res.ok) {
      setVariants(prev => prev.map(vv => vv.id === soldVariantId ? { ...vv, sold_quantity: newSold } : vv))
      setSoldOpen(false); setSoldVariantId(''); setSoldVariantQty(1)
    }
  }

  return (
    <Fragment>
      {/* ── Main row ── */}
      <tr className="group border-b border-gray-50 hover:bg-gray-50/40 transition-colors">

        {/* 圖片 */}
        <td className="sticky left-0 z-[1] bg-white group-hover:bg-gray-50/40 px-3 py-2 transition-colors">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
            {p.image_url
              ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-base">👗</div>}
          </div>
        </td>

        {/* 商品名稱 */}
        <td className="sticky left-12 z-[1] bg-white group-hover:bg-gray-50/40 px-3 py-2 border-r border-gray-200 transition-colors">
          <input
            value={form.ai_suggested_name}
            onChange={e => set('ai_suggested_name', e.target.value)}
            placeholder="AI販售名稱"
            className="w-full font-medium text-gray-800 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1 -ml-1"
          />
          <input
            value={form.product_code}
            onChange={e => set('product_code', e.target.value)}
            placeholder="商品編號"
            className="w-full text-xs text-gray-400 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1 -ml-1 mt-0.5"
          />
        </td>

        {/* 來源 */}
        <td className="px-3 py-2 text-gray-500 text-xs">{srcLabel}</td>

        {/* 原始成本 + 重量 + 包裝費 */}
        <td className="px-3 py-2 text-right">
          <div className="flex items-baseline justify-end gap-0.5">
            <input
              type="number"
              value={form.original_cost}
              onChange={e => set('original_cost', e.target.value)}
              className="w-20 text-right text-gray-600 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1"
            />
            <span className="text-xs text-gray-400">{currency}</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-0.5">
            <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)}
              title="重量 (g)"
              className="w-12 text-right text-[10px] text-gray-400 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-0.5" />
            <span className="text-[10px] text-gray-300">g</span>
            <input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)}
              title="包裝費 (NT$)"
              className="w-10 text-right text-[10px] text-gray-400 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-0.5" />
            <span className="text-[10px] text-gray-300">箱</span>
          </div>
        </td>

        {/* 落地成本 (即時計算) */}
        <td className="px-3 py-2 text-right font-medium text-gray-600 text-sm">
          NT${(liveCost?.totalCostWithHandling ?? p.total_cost_with_handling)?.toFixed(0) ?? '—'}
        </td>

        {/* 賣價 */}
        <td className="px-3 py-2 text-right">
          <span className="text-xs text-gray-400">NT$</span>
          <input
            type="number"
            value={form.my_selling_price}
            onChange={e => set('my_selling_price', e.target.value)}
            className="w-16 text-right font-semibold text-gray-800 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1"
          />
        </td>

        {/* 毛利 */}
        <td className="px-3 py-2 text-right">
          {profit !== null ? (
            <div>
              <p className={`font-semibold ${marginCls}`}>NT${profit.toFixed(0)}</p>
              <p className={`text-xs ${marginCls} opacity-70`}>{margin!.toFixed(1)}%</p>
            </div>
          ) : <span className="text-gray-300">—</span>}
        </td>

        {/* 庫存 */}
        <td className="px-3 py-2 text-center">
          {hasVariants ? (
            <div>
              <p className={`font-semibold text-sm ${stockCls}`}>{totalRemaining} 件</p>
              <p className="text-[10px] text-gray-400">{variants.length} 規格・進 {totalStock}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-center gap-1 text-xs">
                <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)}
                  title="庫存數量" className="w-10 text-center text-gray-600 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded" />
                <span className="text-gray-300">/</span>
                <input type="number" value={form.sold_quantity} onChange={e => set('sold_quantity', e.target.value)}
                  title="已售數量" className="w-10 text-center text-gray-400 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded" />
                <span className={`font-semibold ml-1 ${stockCls}`}>{totalRemaining}</span>
              </div>
              <p className="text-[10px] text-gray-300 mt-0.5">進 / 售 / 剩</p>
            </div>
          )}
        </td>

        {/* 備註 */}
        <td className="px-3 py-2">
          <input
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="尺碼、規格…"
            className="w-full text-xs text-gray-500 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1 -ml-1"
          />
        </td>

        {/* 戰略 */}
        <td className="px-3 py-2 text-center">
          <select
            value={form.strategy_tag}
            onChange={e => set('strategy_tag', e.target.value)}
            className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer ${strategy ? strategy.cls : 'bg-gray-100 text-gray-400'}`}
          >
            <option value="">— 未設</option>
            <option value="profit">💰 利潤</option>
            <option value="lead">📣 引流</option>
            <option value="skip">⛔ 放棄</option>
          </select>
        </td>

        {/* 操作 */}
        <td className="px-3 py-2 text-center">
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {/* 出貨 — 無規格版 */}
            {!hasVariants && (soldOpen ? (
              <>
                <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                <span className="text-xs font-medium w-4 text-center">{soldQty}</span>
                <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                <button onClick={() => { onSold(p.id, soldQty); setSoldOpen(false) }} className="text-xs text-white bg-pink-500 px-1.5 py-0.5 rounded">✓</button>
                <button onClick={() => setSoldOpen(false)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <button onClick={() => { setSoldOpen(true); setSoldQty(1) }}
                disabled={totalRemaining === 0}
                className="text-xs text-pink-500 hover:text-pink-700 font-medium disabled:text-gray-300 px-2 py-1 rounded hover:bg-pink-50 disabled:cursor-not-allowed">
                出貨
              </button>
            ))}
            <button onClick={handleSave} disabled={saving || !dirty}
              className={`text-xs font-medium px-2 py-1 rounded transition-all ${dirty ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-100 text-gray-400 cursor-default'}`}>
              {saving ? '…' : dirty ? '儲存' : '✓'}
            </button>
            <button onClick={() => { setVariantOpen(v => !v); setCopyOpen(false) }}
              className={`text-xs px-2 py-1 rounded transition-colors ${variantOpen ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              規格{variantOpen ? '▲' : '▼'}
            </button>
            <button onClick={() => { setCopyOpen(v => !v); setVariantOpen(false) }}
              className={`text-xs px-2 py-1 rounded transition-colors ${copyOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              文案{copyOpen ? '▲' : '▼'}
            </button>
          </div>
        </td>
      </tr>

      {/* ── 規格管理展開列 ── */}
      {variantOpen && (
        <tr className="bg-purple-50/30 border-b border-purple-100">
          <td colSpan={11} className="px-6 py-3">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">規格庫存管理</p>

              {/* 出貨（規格版）— 選規格再出貨 */}
              {hasVariants && (
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-purple-100">
                  <span className="text-xs text-gray-500">出貨：</span>
                  <select value={soldVariantId} onChange={e => setSoldVariantId(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-purple-300 bg-white">
                    <option value="">選擇規格</option>
                    {variants.map(v => (
                      <option key={v.id} value={v.id} disabled={v.stock_quantity - v.sold_quantity <= 0}>
                        {v.label}（剩 {v.stock_quantity - v.sold_quantity} 件）
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setSoldVariantQty(v => Math.max(1, v - 1))} className="w-6 h-6 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                  <span className="text-xs font-medium w-4 text-center">{soldVariantQty}</span>
                  <button onClick={() => setSoldVariantQty(v => v + 1)} className="w-6 h-6 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                  <button onClick={handleVariantSell} disabled={!soldVariantId}
                    className="text-xs text-white bg-pink-500 px-3 py-1 rounded-lg disabled:opacity-40">
                    確認出貨
                  </button>
                </div>
              )}

              {/* 規格列表 */}
              <div className="space-y-1.5">
                {variants.map(v => {
                  const rem = v.stock_quantity - v.sold_quantity
                  const cls = rem === 0 ? 'text-red-400' : rem <= 2 ? 'text-amber-500' : 'text-green-600'
                  return (
                    <div key={v.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-gray-100">
                      <span className="text-sm font-medium text-gray-700 w-24 shrink-0">{v.label}</span>
                      <span className="text-[10px] text-gray-400">進貨</span>
                      <input type="number" value={v.stock_quantity}
                        onChange={e => handleVariantStockChange(v.id, 'stock_quantity', parseInt(e.target.value) || 0)}
                        onBlur={() => saveVariantStock(v.id)}
                        className="w-14 text-center text-sm text-gray-600 border-b border-gray-200 outline-none focus:border-purple-400 bg-transparent" />
                      <span className="text-[10px] text-gray-400">已售</span>
                      <input type="number" value={v.sold_quantity}
                        onChange={e => handleVariantStockChange(v.id, 'sold_quantity', parseInt(e.target.value) || 0)}
                        onBlur={() => saveVariantStock(v.id)}
                        className="w-14 text-center text-sm text-gray-400 border-b border-gray-200 outline-none focus:border-purple-400 bg-transparent" />
                      <span className="text-[10px] text-gray-400">剩</span>
                      <span className={`text-sm font-bold w-8 ${cls}`}>{rem}</span>
                      <button onClick={() => handleDeleteVariant(v.id)}
                        className="ml-auto text-[10px] text-red-400 hover:text-red-600 px-2 py-0.5 rounded hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* 新增規格 */}
              <div className="flex items-center gap-2 pt-1">
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="規格名稱（如 S / 紅色）"
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-300 bg-white w-40" />
                <input type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
                  placeholder="進貨數"
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-300 bg-white w-16 text-center" />
                <button onClick={handleAddVariant} disabled={addingV || !newLabel.trim()}
                  className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-40">
                  {addingV ? '新增中…' : '＋ 新增規格'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* ── 廣告文案展開列 ── */}
      {copyOpen && (
        <tr className="bg-blue-50/20 border-b border-blue-100">
          <td colSpan={11} className="px-6 py-4">
            <div className="flex gap-6 items-start">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">成本細節</p>
                <div className="flex gap-3">
                  <SmallField label="服務費 (%)">
                    <input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={sic} />
                  </SmallField>
                  <SmallField label="品名原文">
                    <input value={form.product_name} onChange={e => set('product_name', e.target.value)} className={sic + ' w-44'} />
                  </SmallField>
                </div>
                <p className="text-[10px] text-gray-400">
                  台幣 NT${(liveCost?.twdCost ?? p.twd_cost)?.toFixed(0) ?? '—'} · 運費 NT${(liveCost?.shippingFee ?? p.shipping_fee)?.toFixed(0) ?? '—'} · 落地 <span className="text-pink-500 font-semibold">NT${(liveCost?.totalCostWithHandling ?? p.total_cost_with_handling)?.toFixed(0) ?? '—'}</span>
                </p>
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">廣告文案</p>
                <textarea value={form.ad_copy} onChange={e => set('ad_copy', e.target.value)} rows={5}
                  className={ic + ' resize-none'} placeholder="廣告文案…" />
              </div>
              <div className="flex flex-col gap-2 pt-5 shrink-0">
                <button onClick={handleSave} disabled={saving || !dirty}
                  className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors">
                  {saving ? '儲存中…' : dirty ? '儲存' : '已儲存'}
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-red-400 hover:text-red-600 text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
                  {deleting ? '刪除中…' : '🗑 刪除'}
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function SmallField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      {children}
    </div>
  )
}

const ic  = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 bg-white transition-colors'
const sic = 'w-20 text-xs border-b border-gray-200 px-1 py-0.5 outline-none focus:border-pink-400 bg-transparent transition-colors'
