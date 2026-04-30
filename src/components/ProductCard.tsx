'use client'
import { useState, useRef } from 'react'
import type { SourceRow } from '@/types'
const STRATEGY_CONFIG = {
  lead:   { label: '📣 引流品', color: 'bg-blue-100 text-blue-700' },
  profit: { label: '💰 利潤品', color: 'bg-green-100 text-green-700' },
  skip:   { label: '⛔ 放棄',  color: 'bg-red-100 text-red-700' },
}
const STOCK_CONFIG = {
  in_stock:  { color: 'text-green-600' },
  low_stock: { color: 'text-amber-500' },
  sold_out:  { color: 'text-red-400' },
}

interface Props {
  product: any
  sourcesMap: Record<string, SourceRow>
  onSold: (id: string, qty: number) => void
  onSave: (id: string, edits: Record<string, any>) => Promise<void>
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

function isDirty(form: Record<string, string>, product: any) {
  const orig = initForm(product)
  return Object.keys(orig).some(k => form[k] !== orig[k])
}

export default function ProductCard({ product, sourcesMap, onSold, onSave }: Props) {
  const [form, setForm]         = useState<Record<string, string>>(() => initForm(product))
  const [saving, setSaving]     = useState(false)
  const [soldQty, setSoldQty]   = useState(1)
  const [adOpen, setAdOpen]     = useState(false)
  const [soldOpen, setSoldOpen] = useState(false)

  const dirty    = isDirty(form, product)
  const name     = form.ai_suggested_name || form.product_name || '未命名商品'
  const srcInfo  = sourcesMap[product.source]
  const currency = srcInfo?.currency ?? product.source?.toUpperCase() ?? 'JPY'
  const srcLabel = srcInfo?.label ?? product.source ?? '—'
  const strategy = form.strategy_tag ? STRATEGY_CONFIG[form.strategy_tag as keyof typeof STRATEGY_CONFIG] : null
  const stockClr = STOCK_CONFIG[product.stock_status as keyof typeof STOCK_CONFIG]?.color ?? 'text-gray-400'

  const sellingPrice = parseFloat(form.my_selling_price) || null
  const profit = sellingPrice && product.total_cost_with_handling
    ? sellingPrice - product.total_cost_with_handling : null
  const margin = profit !== null && sellingPrice
    ? (profit / sellingPrice * 100).toFixed(1) : null

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(product.id, {
      ai_suggested_name: form.ai_suggested_name || null,
      product_code:      form.product_code,
      product_name:      form.product_name,
      strategy_tag:      form.strategy_tag || null,
      original_cost:     parseFloat(form.original_cost) || product.original_cost,
      weight_g:          parseFloat(form.weight_g) || 0,
      packaging_fee:     parseFloat(form.packaging_fee) || 0,
      service_fee_pct:   (parseFloat(form.service_fee_pct) || 0) / 100,
      my_selling_price:  parseFloat(form.my_selling_price) || null,
      stock_quantity:    parseInt(form.stock_quantity) || 0,
      sold_quantity:     parseInt(form.sold_quantity) || 0,
      notes:             form.notes,
      supplier_copy:     form.supplier_copy,
      ad_copy:           form.ad_copy,
    })
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex gap-3 p-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1 justify-between">
            <input
              value={form.ai_suggested_name}
              onChange={e => set('ai_suggested_name', e.target.value)}
              placeholder="AI販售名稱"
              className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none focus:bg-pink-50 focus:rounded px-1 -ml-1 min-w-0"
            />
            <select
              value={form.strategy_tag}
              onChange={e => set('strategy_tag', e.target.value)}
              className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 border-0 outline-none cursor-pointer ${strategy ? strategy.color : 'bg-gray-100 text-gray-400'}`}
            >
              <option value="">— 戰略</option>
              <option value="profit">💰 利潤品</option>
              <option value="lead">📣 引流品</option>
              <option value="skip">⛔ 放棄</option>
            </select>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-gray-400">{srcLabel}</span>
            <span className="text-xs text-gray-300">·</span>
            <input
              value={form.product_code}
              onChange={e => set('product_code', e.target.value)}
              placeholder="商品編號"
              className="text-xs text-gray-400 bg-transparent outline-none focus:bg-pink-50 focus:rounded px-1 w-24"
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-gray-800">
              NT$<input
                type="number"
                value={form.my_selling_price}
                onChange={e => set('my_selling_price', e.target.value)}
                placeholder="賣價"
                className="inline w-16 bg-transparent outline-none focus:bg-pink-50 focus:rounded px-0.5 font-bold text-gray-800 text-sm"
              />
            </span>
            {profit !== null && (
              <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                毛利 NT${profit.toFixed(0)}{margin ? ` (${margin}%)` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2.5 border-t border-gray-50 pt-2">

        {/* ── 成本資料 ── */}
        <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">成本</p>
          <Row label={`原始成本 (${currency})`}>
            <input type="number" value={form.original_cost} onChange={e => set('original_cost', e.target.value)} className={fi} />
          </Row>
          <Row label="重量 (g)">
            <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)} className={fi} />
          </Row>
          <Row label="包裝費 (NT$)">
            <input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)} className={fi} />
          </Row>
          <Row label="服務費 (%)">
            <input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={fi} />
          </Row>
          <div className="border-t border-gray-200 pt-1.5 mt-1">
            <Row label="台幣成本"><span className="text-xs font-medium text-gray-600">NT${product.twd_cost?.toFixed(0) ?? '—'}</span></Row>
            <Row label="運費"><span className="text-xs font-medium text-gray-600">NT${product.shipping_fee?.toFixed(0) ?? '—'}</span></Row>
            <Row label="落地含手續費"><span className="text-xs font-semibold text-pink-600">NT${product.total_cost_with_handling?.toFixed(0) ?? '—'}</span></Row>
          </div>
        </div>

        {/* ── 庫存 ── */}
        <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">庫存</p>
          <Row label="庫存數量">
            <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className={fi} />
          </Row>
          <Row label="已售數量">
            <input type="number" value={form.sold_quantity} onChange={e => set('sold_quantity', e.target.value)} className={fi} />
          </Row>
          <Row label="剩餘">
            <span className={`text-xs font-semibold ${stockClr}`}>
              {(parseInt(form.stock_quantity)||0) - (parseInt(form.sold_quantity)||0)} 件
            </span>
          </Row>
        </div>

        {/* ── 備註 ── */}
        <div className="bg-gray-50 rounded-xl px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">備註 / 文案</p>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">備註</p>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">供應商文案</p>
            <textarea value={form.supplier_copy} onChange={e => set('supplier_copy', e.target.value)} rows={2}
              className="w-full text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none" />
          </div>
        </div>

        {/* ── 廣告文案 accordion ── */}
        <button type="button" onClick={() => setAdOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl text-xs font-medium text-gray-500 active:bg-gray-100">
          <span>廣告文案 {form.ad_copy ? `(${form.ad_copy.length} 字)` : '（空白）'}</span>
          <span className="text-gray-400">{adOpen ? '▲' : '▼'}</span>
        </button>
        {adOpen && (
          <textarea value={form.ad_copy} onChange={e => set('ad_copy', e.target.value)} rows={8}
            className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-pink-300 resize-none"
            placeholder="廣告文案…" />
        )}

        {/* ── 品名原文 ── */}
        <div className="px-1">
          <p className="text-[10px] text-gray-400 mb-0.5">品名（原文）</p>
          <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
            className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
        </div>

        {/* ── 出貨 + 儲存 ── */}
        <div className="flex gap-2 pt-1">
          {soldOpen ? (
            <div className="flex items-center gap-1.5 flex-1 bg-gray-50 rounded-xl px-2 py-1.5">
              <button type="button" onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="text-gray-500 text-base w-6 text-center">−</button>
              <span className="text-sm font-semibold w-5 text-center">{soldQty}</span>
              <button type="button" onClick={() => setSoldQty(v => Math.min(product.remaining_stock, v + 1))} className="text-gray-500 text-base w-6 text-center">+</button>
              <button type="button"
                onClick={() => { onSold(product.id, soldQty); setSoldQty(1); setSoldOpen(false) }}
                className="flex-1 py-1 bg-pink-500 text-white text-xs rounded-lg font-medium">
                出貨 {soldQty} 件
              </button>
              <button type="button" onClick={() => setSoldOpen(false)} className="text-gray-400 text-xs px-1">✕</button>
            </div>
          ) : (
            <button type="button"
              onClick={() => setSoldOpen(true)}
              disabled={product.remaining_stock === 0}
              className="flex-1 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 active:bg-gray-200 disabled:opacity-40">
              出貨
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving || !dirty}
            className="flex-1 py-2 text-sm font-semibold rounded-xl bg-pink-500 text-white active:bg-pink-600 disabled:opacity-30 transition-opacity">
            {saving ? '儲存中…' : dirty ? '儲存變更' : '已儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-gray-400 shrink-0">{label}</span>
      {children}
    </div>
  )
}

const fi = 'w-20 text-right text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-0.5 outline-none focus:border-pink-300'
