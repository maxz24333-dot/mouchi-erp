'use client'
import { useState } from 'react'

const SOURCE_LABEL: Record<string, string> = {
  thailand: '🇹🇭 泰國', haido: '🇯🇵 海度', mdm: '🇯🇵 MDM',
  sd: '🇯🇵 SD', other: '📦 其他', korea: '🇰🇷 韓國',
}
const CURRENCY_LABEL: Record<string, string> = {
  thailand: 'THB', haido: 'JPY', mdm: 'JPY', sd: 'JPY', other: 'JPY', korea: 'KRW',
}
const STRATEGY_CONFIG = {
  lead:   { label: '📣 引流品', color: 'bg-blue-100 text-blue-700' },
  profit: { label: '💰 利潤品', color: 'bg-green-100 text-green-700' },
  skip:   { label: '⛔ 放棄',  color: 'bg-red-100 text-red-700' },
}
const STOCK_CONFIG = {
  in_stock:  { label: '庫存充足', color: 'text-green-600' },
  low_stock: { label: '庫存偏低', color: 'text-amber-500' },
  sold_out:  { label: '已售完',  color: 'text-red-400' },
}

interface Props {
  product: any
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

export default function ProductCard({ product, onSold, onSave }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)
  const [soldQty, setSoldQty]   = useState(1)

  const name     = product.ai_suggested_name || product.product_name || '未命名商品'
  const profit   = product.my_selling_price && product.total_cost_with_handling
    ? product.my_selling_price - product.total_cost_with_handling : null
  const margin   = profit !== null && product.my_selling_price
    ? (profit / product.my_selling_price * 100).toFixed(1) : null
  const strategy  = product.strategy_tag ? STRATEGY_CONFIG[product.strategy_tag as keyof typeof STRATEGY_CONFIG] : null
  const stockInfo = STOCK_CONFIG[product.stock_status as keyof typeof STOCK_CONFIG]
  const currency  = CURRENCY_LABEL[product.source] ?? 'JPY'

  function startEdit() {
    setForm(initForm(product))
    setEditing(true)
    setExpanded(true)
  }

  function set(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })) }

  async function confirmSave() {
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
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Main row */}
      <button type="button" onClick={() => { setExpanded(v => !v); setEditing(false) }}
        className="w-full flex gap-3 p-3 text-left active:bg-gray-50">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{name}</p>
            {strategy && <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${strategy.color}`}>{strategy.label}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{SOURCE_LABEL[product.source]} · {product.product_code || '—'}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm font-bold text-gray-800">NT${product.my_selling_price?.toLocaleString() ?? '—'}</span>
            {profit !== null && (
              <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                毛利 NT${profit.toFixed(0)}{margin ? ` (${margin}%)` : ''}
              </span>
            )}
            <span className={`text-xs ml-auto ${stockInfo.color}`}>剩 {product.remaining_stock} 件</span>
          </div>
        </div>
      </button>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-3">
          {!editing ? (
            <>
              {/* Read-only detail */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-gray-50 rounded-xl p-2.5">
                <Row label="原始成本" value={`${product.original_cost} ${currency}`} />
                <Row label="匯率" value={product.exchange_rate?.toFixed(4)} />
                <Row label="台幣成本" value={`NT$${product.twd_cost?.toFixed(0)}`} />
                <Row label="運費" value={`NT$${product.shipping_fee?.toFixed(0)}`} />
                <Row label="落地含手續費" value={`NT$${product.total_cost_with_handling?.toFixed(0)}`} accent />
                <Row label="重量" value={`${product.weight_g}g`} />
                <Row label="進貨" value={`${product.stock_quantity} 件`} />
                <Row label="已售" value={`${product.sold_quantity} 件`} />
              </div>
              {product.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 whitespace-pre-wrap">{product.notes}</p>}
              {product.ad_copy && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">廣告文案</p>
                  <p className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 whitespace-pre-wrap max-h-32 overflow-y-auto">{product.ad_copy}</p>
                </div>
              )}
              <button type="button" onClick={startEdit}
                className="w-full py-2 bg-blue-50 text-blue-600 text-sm rounded-xl font-medium active:bg-blue-100">編輯資料</button>
              {product.remaining_stock > 0 && (
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                    <button type="button" onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="text-gray-500 text-lg w-6 text-center">−</button>
                    <span className="text-sm font-semibold w-4 text-center">{soldQty}</span>
                    <button type="button" onClick={() => setSoldQty(v => Math.min(product.remaining_stock, v + 1))} className="text-gray-500 text-lg w-6 text-center">+</button>
                  </div>
                  <button type="button" onClick={() => { onSold(product.id, soldQty); setSoldQty(1) }}
                    className="flex-1 py-2 bg-pink-500 text-white text-sm rounded-xl font-medium active:bg-pink-600">
                    出貨 {soldQty} 件
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Edit form */
            <div className="space-y-3">
              <Section title="商品資料">
                <Field label="AI販售名"><input value={form.ai_suggested_name} onChange={e => set('ai_suggested_name', e.target.value)} className={ic} /></Field>
                <Field label="商品編號"><input value={form.product_code} onChange={e => set('product_code', e.target.value)} className={ic} /></Field>
                <Field label="品名原文"><input value={form.product_name} onChange={e => set('product_name', e.target.value)} className={ic} /></Field>
                <Field label="戰略">
                  <select value={form.strategy_tag} onChange={e => set('strategy_tag', e.target.value)} className={ic}>
                    <option value="">—</option>
                    <option value="profit">💰 利潤品</option>
                    <option value="lead">📣 引流品</option>
                    <option value="skip">⛔ 放棄</option>
                  </select>
                </Field>
              </Section>

              <Section title={`成本 (${currency})`}>
                <Field label={`原始成本 (${currency})`}><input type="number" value={form.original_cost} onChange={e => set('original_cost', e.target.value)} className={ic} /></Field>
                <Field label="重量 (g)"><input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)} className={ic} /></Field>
                <Field label="包裝費 (NT$)"><input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)} className={ic} /></Field>
                <Field label="服務費 (%)"><input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={ic} /></Field>
                <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
                  台幣成本 NT${product.twd_cost?.toFixed(0)} · 運費 NT${product.shipping_fee?.toFixed(0)} · 落地 NT${product.total_cost_with_handling?.toFixed(0)} (儲存後更新)
                </div>
              </Section>

              <Section title="庫存 / 定價">
                <Field label="我的賣價"><input type="number" value={form.my_selling_price} onChange={e => set('my_selling_price', e.target.value)} className={ic} /></Field>
                <Field label="庫存數量"><input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className={ic} /></Field>
                <Field label="已售數量"><input type="number" value={form.sold_quantity} onChange={e => set('sold_quantity', e.target.value)} className={ic} /></Field>
              </Section>

              <Section title="文案">
                <Field label="備註"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={ic + ' resize-none'} /></Field>
                <Field label="供應商文案"><textarea value={form.supplier_copy} onChange={e => set('supplier_copy', e.target.value)} rows={3} className={ic + ' resize-none'} /></Field>
                <Field label="廣告文案"><textarea value={form.ad_copy} onChange={e => set('ad_copy', e.target.value)} rows={4} className={ic + ' resize-none'} /></Field>
              </Section>

              <div className="flex gap-2">
                <button type="button" onClick={confirmSave} disabled={saving}
                  className="flex-1 py-2.5 bg-pink-500 text-white text-sm rounded-xl font-medium active:bg-pink-600 disabled:opacity-50">
                  {saving ? '儲存中…' : '儲存'}
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm rounded-xl">取消</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value?: string | null; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-1">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${accent ? 'text-pink-600' : 'text-gray-700'}`}>{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {children}
    </div>
  )
}

const ic = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 bg-white'
