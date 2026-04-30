'use client'
import { useState } from 'react'

const SOURCE_LABEL: Record<string, string> = {
  thailand: '🇹🇭 泰國', haido: '🇯🇵 海度', mdm: '🇯🇵 MDM',
  sd: '🇯🇵 SD', other: '📦 其他', korea: '🇰🇷 韓國',
}
const CURRENCY_LABEL: Record<string, string> = {
  thailand: 'THB', haido: 'JPY', mdm: 'JPY', sd: 'JPY', other: 'JPY', korea: 'KRW',
}
const STRATEGY_CONFIG: Record<string, { label: string; cls: string }> = {
  lead:   { label: '📣 引流', cls: 'bg-blue-50 text-blue-600' },
  profit: { label: '💰 利潤', cls: 'bg-green-50 text-green-700' },
  skip:   { label: '⛔ 放棄', cls: 'bg-red-50 text-red-500' },
}

interface Props {
  products: any[]
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

export default function InventoryTable({ products, onSold, onSave, onDelete }: Props) {
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [soldId, setSoldId]         = useState<string | null>(null)
  const [soldQty, setSoldQty]       = useState(1)

  function startEdit(p: any) {
    setEditingId(editingId === p.id ? null : p.id)
    setForm(initForm(p))
    setSoldId(null)
  }

  async function confirmSave(p: any) {
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
    setEditingId(null)
  }

  async function confirmDelete(p: any) {
    if (!window.confirm(`確定刪除「${p.ai_suggested_name || p.product_name || '此商品'}」？`)) return
    setDeletingId(p.id)
    await onDelete(p.id)
    setDeletingId(null)
    if (editingId === p.id) setEditingId(null)
  }

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

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
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-20 text-center">庫存</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-20 text-center">戰略</th>
            <th className="px-3 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide w-28 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const profit = p.my_selling_price && p.total_cost_with_handling
              ? p.my_selling_price - p.total_cost_with_handling : null
            const margin = profit !== null && p.my_selling_price
              ? profit / p.my_selling_price * 100 : null
            const strategy   = p.strategy_tag ? STRATEGY_CONFIG[p.strategy_tag] : null
            const name       = p.ai_suggested_name || p.product_name || '未命名'
            const isEditing  = editingId === p.id
            const marginCls  = margin === null ? 'text-gray-400' : margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'
            const currency   = CURRENCY_LABEL[p.source] ?? 'JPY'

            return (
              <>
                {/* ── Main row ─────────────────────────────────────── */}
                <tr
                  key={p.id}
                  className={`border-b border-gray-50 transition-colors ${isEditing ? 'bg-blue-50/30' : 'hover:bg-gray-50/60'}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt={name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-base">👗</div>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-800 leading-snug">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.product_code || '—'}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{SOURCE_LABEL[p.source] ?? p.source}</td>
                  <td className="px-3 py-2.5 text-right text-gray-500">
                    {p.original_cost} <span className="text-xs">{currency}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-700">
                    NT${p.total_cost_with_handling?.toFixed(0) ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                    {p.my_selling_price ? `NT$${p.my_selling_price.toLocaleString()}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {profit !== null ? (
                      <div>
                        <p className={`font-semibold ${marginCls}`}>NT${profit.toFixed(0)}</p>
                        <p className={`text-xs ${marginCls} opacity-70`}>{margin!.toFixed(1)}%</p>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`font-semibold ${p.stock_status === 'sold_out' ? 'text-red-400' : p.stock_status === 'low_stock' ? 'text-amber-500' : 'text-gray-700'}`}>
                      {p.remaining_stock}
                    </span>
                    <span className="text-xs text-gray-400 ml-0.5">件</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {strategy
                      ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategy.cls}`}>{strategy.label}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {soldId === p.id ? (
                        <>
                          <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                          <span className="text-sm w-4 text-center font-medium">{soldQty}</span>
                          <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                          <button onClick={() => { onSold(p.id, soldQty); setSoldId(null) }} className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-lg">✓</button>
                          <button onClick={() => setSoldId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                        </>
                      ) : (
                        <button onClick={() => { setSoldId(p.id); setSoldQty(1) }} disabled={p.remaining_stock === 0}
                          className="text-xs text-pink-500 hover:text-pink-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed px-2 py-1 rounded hover:bg-pink-50">
                          出貨
                        </button>
                      )}
                      <button onClick={() => startEdit(p)}
                        className={`text-xs font-medium px-2 py-1 rounded transition-colors ${isEditing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {isEditing ? '收起' : '編輯'}
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ── Edit panel (full-width row) ───────────────────── */}
                {isEditing && (
                  <tr key={`${p.id}-edit`} className="bg-gray-50/80 border-b-2 border-blue-100">
                    <td colSpan={10} className="px-6 py-5">
                      <div className="grid grid-cols-4 gap-6">

                        {/* Col 1: 商品資料 */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">商品資料</h4>
                          <Field label="AI 販售名">
                            <input value={form.ai_suggested_name} onChange={e => set('ai_suggested_name', e.target.value)} className={ic} />
                          </Field>
                          <Field label="商品編號">
                            <input value={form.product_code} onChange={e => set('product_code', e.target.value)} className={ic} />
                          </Field>
                          <Field label="品名（原文）">
                            <input value={form.product_name} onChange={e => set('product_name', e.target.value)} className={ic} />
                          </Field>
                          <Field label="戰略定位">
                            <select value={form.strategy_tag} onChange={e => set('strategy_tag', e.target.value)} className={ic}>
                              <option value="">— 未設定</option>
                              <option value="profit">💰 利潤品</option>
                              <option value="lead">📣 引流品</option>
                              <option value="skip">⛔ 放棄</option>
                            </select>
                          </Field>
                          <Field label="備註">
                            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} className={ic + ' resize-none'} />
                          </Field>
                        </div>

                        {/* Col 2: 成本 */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">成本資料</h4>
                          <Field label={`原始成本 (${currency})`}>
                            <input type="number" value={form.original_cost} onChange={e => set('original_cost', e.target.value)} className={ic} />
                          </Field>
                          <Field label="重量 (g)">
                            <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)} className={ic} />
                          </Field>
                          <Field label="包裝費 (NT$)">
                            <input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)} className={ic} />
                          </Field>
                          <Field label="服務費 (%)">
                            <input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={ic} />
                          </Field>
                          <div className="bg-white rounded-xl border border-gray-100 p-3 text-xs space-y-1.5 text-gray-500">
                            <p className="font-semibold text-gray-400 mb-1">系統計算（儲存後更新）</p>
                            <div className="flex justify-between"><span>台幣成本</span><span className="font-medium text-gray-700">NT${p.twd_cost?.toFixed(0)}</span></div>
                            <div className="flex justify-between"><span>運費</span><span className="font-medium text-gray-700">NT${p.shipping_fee?.toFixed(0)}</span></div>
                            <div className="flex justify-between font-semibold text-gray-600 border-t pt-1.5"><span>落地含手續費</span><span>NT${p.total_cost_with_handling?.toFixed(0)}</span></div>
                          </div>
                        </div>

                        {/* Col 3: 庫存 / 定價 */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">庫存 / 定價</h4>
                          <Field label="我的賣價 (NT$)">
                            <input type="number" value={form.my_selling_price} onChange={e => set('my_selling_price', e.target.value)} className={ic} />
                          </Field>
                          <Field label="庫存數量">
                            <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className={ic} />
                          </Field>
                          <Field label="已售數量">
                            <input type="number" value={form.sold_quantity} onChange={e => set('sold_quantity', e.target.value)} className={ic} />
                          </Field>
                          <Field label="供應商文案">
                            <textarea value={form.supplier_copy} onChange={e => set('supplier_copy', e.target.value)} rows={6} className={ic + ' resize-none'} />
                          </Field>
                        </div>

                        {/* Col 4: 廣告文案 */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">廣告文案</h4>
                          <textarea
                            value={form.ad_copy}
                            onChange={e => set('ad_copy', e.target.value)}
                            rows={14}
                            className={ic + ' resize-none h-full min-h-[200px]'}
                            placeholder="廣告文案…"
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-200">
                        <button onClick={() => confirmSave(p)} disabled={saving}
                          className="px-6 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
                          {saving ? '儲存中…' : '儲存'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="px-5 py-2 bg-white border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
                          取消
                        </button>
                        <div className="ml-auto">
                          <button onClick={() => confirmDelete(p)} disabled={deletingId === p.id}
                            className="px-4 py-2 text-red-400 hover:text-red-600 text-sm hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
                            {deletingId === p.id ? '刪除中…' : '🗑 刪除此商品'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {children}
    </div>
  )
}

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-pink-300 bg-white transition-colors'
