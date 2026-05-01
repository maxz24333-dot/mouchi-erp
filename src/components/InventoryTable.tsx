'use client'
import { useState, Fragment } from 'react'
import type { SourceRow } from '@/types'
const STRATEGY_CONFIG: Record<string, { label: string; cls: string }> = {
  lead:   { label: '📣 引流', cls: 'bg-blue-50 text-blue-600' },
  profit: { label: '💰 利潤', cls: 'bg-green-50 text-green-700' },
  skip:   { label: '⛔ 放棄', cls: 'bg-red-50 text-red-500' },
}

interface Props {
  products: any[]
  sourcesMap: Record<string, SourceRow>
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

export default function InventoryTable({ products, sourcesMap, onSold, onSave, onDelete }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-sm">尚無商品</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100 text-left">
            <th className="px-3 py-3 w-12"></th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide min-w-[200px]">商品</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24">來源</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">原始成本</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">落地成本</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">賣價</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-right">毛利</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-32 text-center">庫存</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-24 text-center">戰略</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-36 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <ProductRow key={p.id} product={p} sourcesMap={sourcesMap} onSold={onSold} onSave={onSave} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductRow({ product: p, sourcesMap, onSold, onSave, onDelete }: {
  product: any
  sourcesMap: Record<string, SourceRow>
  onSold: (id: string, qty: number) => void
  onSave: (id: string, edits: Record<string, any>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [form, setForm]       = useState<Record<string, string>>(() => initForm(p))
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copyOpen, setCopyOpen] = useState(false)
  const [soldQty, setSoldQty] = useState(1)
  const [soldOpen, setSoldOpen] = useState(false)

  const dirty    = isDirty(form, p)
  const srcInfo  = sourcesMap[p.source]
  const currency = srcInfo?.currency ?? p.source?.toUpperCase() ?? 'JPY'
  const srcLabel = srcInfo?.label ?? p.source ?? '—'
  const strategy = form.strategy_tag ? STRATEGY_CONFIG[form.strategy_tag] : null

  const sellingPrice = parseFloat(form.my_selling_price) || null
  const profit = sellingPrice && p.total_cost_with_handling
    ? sellingPrice - p.total_cost_with_handling : null
  const margin = profit !== null && sellingPrice
    ? profit / sellingPrice * 100 : null
  const marginCls = margin === null ? 'text-gray-300' : margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'

  const stockQty  = parseInt(form.stock_quantity) || 0
  const soldQtyVal = parseInt(form.sold_quantity) || 0
  const remaining = stockQty - soldQtyVal
  const stockCls = remaining === 0 ? 'text-red-400' : remaining <= 3 ? 'text-amber-500' : 'text-gray-700'

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setSaving(true)
    await onSave(p.id, {
      ai_suggested_name: form.ai_suggested_name || null,
      product_code:      form.product_code,
      product_name:      form.product_name,
      strategy_tag:      form.strategy_tag || null,
      original_cost:     parseFloat(form.original_cost) || p.original_cost,
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

  async function handleDelete() {
    if (!window.confirm(`確定刪除「${p.ai_suggested_name || p.product_name || '此商品'}」？`)) return
    setDeleting(true)
    await onDelete(p.id)
    setDeleting(false)
  }

  return (
    <Fragment>
      {/* ── Main row ── */}
      <tr className="border-b border-gray-50 hover:bg-gray-50/40 transition-colors">

        {/* 圖片 */}
        <td className="px-3 py-2">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
            {p.image_url
              ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-base">👗</div>}
          </div>
        </td>

        {/* 商品名稱 */}
        <td className="px-3 py-2">
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

        {/* 原始成本 */}
        <td className="px-3 py-2 text-right">
          <input
            type="number"
            value={form.original_cost}
            onChange={e => set('original_cost', e.target.value)}
            className="w-20 text-right text-gray-600 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded px-1"
          />
          <span className="text-xs text-gray-400 ml-0.5">{currency}</span>
        </td>

        {/* 落地成本 (readonly) */}
        <td className="px-3 py-2 text-right font-medium text-gray-600 text-sm">
          NT${p.total_cost_with_handling?.toFixed(0) ?? '—'}
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
          <div className="flex items-center justify-center gap-1 text-xs">
            <input
              type="number"
              value={form.stock_quantity}
              onChange={e => set('stock_quantity', e.target.value)}
              title="庫存數量"
              className="w-10 text-center text-gray-600 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded"
            />
            <span className="text-gray-300">/</span>
            <input
              type="number"
              value={form.sold_quantity}
              onChange={e => set('sold_quantity', e.target.value)}
              title="已售數量"
              className="w-10 text-center text-gray-400 bg-transparent outline-none focus:bg-white focus:border focus:border-pink-200 focus:rounded"
            />
            <span className={`font-semibold ml-1 ${stockCls}`}>{remaining}</span>
          </div>
          <p className="text-[10px] text-gray-300 mt-0.5">進 / 售 / 剩</p>
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
            {soldOpen ? (
              <>
                <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                <span className="text-xs font-medium w-4 text-center">{soldQty}</span>
                <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                <button onClick={() => { onSold(p.id, soldQty); setSoldOpen(false) }} className="text-xs text-white bg-pink-500 px-1.5 py-0.5 rounded">✓</button>
                <button onClick={() => setSoldOpen(false)} className="text-xs text-gray-400">✕</button>
              </>
            ) : (
              <button
                onClick={() => { setSoldOpen(true); setSoldQty(1) }}
                disabled={p.remaining_stock === 0}
                className="text-xs text-pink-500 hover:text-pink-700 font-medium disabled:text-gray-300 px-2 py-1 rounded hover:bg-pink-50 disabled:cursor-not-allowed"
              >
                出貨
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`text-xs font-medium px-2 py-1 rounded transition-all ${dirty ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-100 text-gray-400 cursor-default'}`}
            >
              {saving ? '…' : dirty ? '儲存' : '✓'}
            </button>
            <button
              onClick={() => setCopyOpen(v => !v)}
              className={`text-xs px-2 py-1 rounded transition-colors ${copyOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="文案 / 備註"
            >
              文案{copyOpen ? '▲' : '▼'}
            </button>
          </div>
        </td>
      </tr>

      {/* ── 文案展開列 ── */}
      {copyOpen && (
        <tr className="bg-blue-50/20 border-b border-blue-100">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-4 gap-5">

              {/* 成本細節 */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">成本細節</h4>
                <CopyField label={`重量 (g)`}>
                  <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)} className={ic} />
                </CopyField>
                <CopyField label="包裝費 (NT$)">
                  <input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)} className={ic} />
                </CopyField>
                <CopyField label="服務費 (%)">
                  <input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={ic} />
                </CopyField>
                <div className="bg-white rounded-lg border border-gray-100 p-2 text-xs space-y-1 text-gray-500">
                  <div className="flex justify-between"><span>台幣成本</span><span className="font-medium">NT${p.twd_cost?.toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>運費</span><span className="font-medium">NT${p.shipping_fee?.toFixed(0)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1"><span>落地含手續費</span><span className="text-pink-600">NT${p.total_cost_with_handling?.toFixed(0)}</span></div>
                </div>
                <CopyField label="品名（原文）">
                  <input value={form.product_name} onChange={e => set('product_name', e.target.value)} className={ic} />
                </CopyField>
              </div>

              {/* 備註 */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">備註</h4>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={8}
                  className={ic + ' resize-none'} placeholder="備註…" />
              </div>

              {/* 供應商文案 */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">供應商文案</h4>
                <textarea value={form.supplier_copy} onChange={e => set('supplier_copy', e.target.value)} rows={8}
                  className={ic + ' resize-none'} placeholder="供應商文案…" />
              </div>

              {/* 廣告文案 */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">廣告文案</h4>
                <textarea value={form.ad_copy} onChange={e => set('ad_copy', e.target.value)} rows={8}
                  className={ic + ' resize-none'} placeholder="廣告文案…" />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-200">
              <button onClick={handleSave} disabled={saving || !dirty}
                className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 transition-colors">
                {saving ? '儲存中…' : dirty ? '儲存所有變更' : '已儲存'}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="ml-auto text-red-400 hover:text-red-600 text-sm hover:bg-red-50 px-4 py-2 rounded-xl transition-colors disabled:opacity-40">
                {deleting ? '刪除中…' : '🗑 刪除此商品'}
              </button>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function CopyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      {children}
    </div>
  )
}

const ic = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 bg-white transition-colors'
