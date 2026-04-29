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
  lead:   { label: '📣 引流', cls: 'bg-blue-50 text-blue-700' },
  profit: { label: '💰 利潤', cls: 'bg-green-50 text-green-700' },
  skip:   { label: '⛔ 放棄', cls: 'bg-red-50 text-red-600' },
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
    setEditingId(p.id)
    setForm(initForm(p))
    setSoldId(null)
  }

  function cancelEdit() { setEditingId(null) }

  async function confirmSave(p: any) {
    setSaving(true)
    const edits: Record<string, any> = {
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
    }
    await onSave(p.id, edits)
    setSaving(false)
    setEditingId(null)
  }

  async function confirmDelete(p: any) {
    if (!window.confirm(`確定刪除「${p.ai_suggested_name || p.product_name || '此商品'}」？`)) return
    setDeletingId(p.id)
    await onDelete(p.id)
    setDeletingId(null)
  }

  function set(key: string, val: string) { setForm(prev => ({ ...prev, [key]: val })) }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-sm">尚無商品</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-12"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">商品</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">來源</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">落地成本</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">賣價</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">毛利</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">庫存</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">戰略</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const profit = p.my_selling_price && p.total_cost_with_handling
              ? p.my_selling_price - p.total_cost_with_handling : null
            const margin = profit !== null && p.my_selling_price
              ? (profit / p.my_selling_price * 100) : null
            const strategy   = p.strategy_tag ? STRATEGY_CONFIG[p.strategy_tag] : null
            const name       = p.ai_suggested_name || p.product_name || '未命名'
            const isEditing  = editingId === p.id
            const marginColor = margin === null ? '' : margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'
            const currency   = CURRENCY_LABEL[p.source] ?? 'JPY'

            return (
              <tr key={p.id} className={`border-b border-gray-50 ${isEditing ? 'align-top bg-blue-50/20' : 'hover:bg-gray-50/50 transition-colors'}`}>
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                    }
                  </div>
                </td>

                {/* Name — edit: ai_suggested_name, product_code, product_name */}
                <td className="px-4 py-3 max-w-[220px]">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input value={form.ai_suggested_name} onChange={e => set('ai_suggested_name', e.target.value)}
                        placeholder="AI販售名" className={inputCls} />
                      <input value={form.product_code} onChange={e => set('product_code', e.target.value)}
                        placeholder="商品編號" className={inputCls} />
                      <input value={form.product_name} onChange={e => set('product_name', e.target.value)}
                        placeholder="品名原文" className={inputCls} />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                      <p className="text-xs text-gray-400">{p.product_code || '—'}</p>
                    </>
                  )}
                </td>

                {/* Source */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{SOURCE_LABEL[p.source] ?? p.source}</span>
                  {isEditing && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-gray-400 mt-1">原始成本 ({currency})</p>
                      <input type="number" value={form.original_cost} onChange={e => set('original_cost', e.target.value)} className={inputCls} />
                      <p className="text-xs text-gray-400">重量 (g)</p>
                      <input type="number" value={form.weight_g} onChange={e => set('weight_g', e.target.value)} className={inputCls} />
                      <p className="text-xs text-gray-400">包裝費 (NT$)</p>
                      <input type="number" value={form.packaging_fee} onChange={e => set('packaging_fee', e.target.value)} className={inputCls} />
                      <p className="text-xs text-gray-400">服務費 (%)</p>
                      <input type="number" value={form.service_fee_pct} onChange={e => set('service_fee_pct', e.target.value)} className={inputCls} />
                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-1.5 space-y-0.5">
                        <p>台幣成本: <span className="text-gray-600">NT${p.twd_cost?.toFixed(0)}</span></p>
                        <p>運費: <span className="text-gray-600">NT${p.shipping_fee?.toFixed(0)}</span></p>
                        <p className="font-medium text-gray-600">落地含手續費: NT${p.total_cost_with_handling?.toFixed(0)}</p>
                        <p className="text-gray-300 text-[10px]">※ 系統重新計算後更新</p>
                      </div>
                    </div>
                  )}
                </td>

                {/* Cost (read-only) */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-700">NT${p.total_cost_with_handling?.toFixed(0)}</span>
                  {isEditing && (
                    <div className="mt-2 space-y-1.5 text-left">
                      <p className="text-xs text-gray-400">我的賣價</p>
                      <input type="number" value={form.my_selling_price} onChange={e => set('my_selling_price', e.target.value)} className={inputCls} />
                      <p className="text-xs text-gray-400">庫存數量</p>
                      <input type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className={inputCls} />
                      <p className="text-xs text-gray-400">已售數量</p>
                      <input type="number" value={form.sold_quantity} onChange={e => set('sold_quantity', e.target.value)} className={inputCls} />
                    </div>
                  )}
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {p.my_selling_price ? `NT$${p.my_selling_price.toLocaleString()}` : <span className="text-gray-300">—</span>}
                  </span>
                  {isEditing && (
                    <div className="mt-2 space-y-1.5 text-left">
                      <p className="text-xs text-gray-400">戰略</p>
                      <select value={form.strategy_tag} onChange={e => set('strategy_tag', e.target.value)} className={inputCls}>
                        <option value="">—</option>
                        <option value="profit">💰 利潤品</option>
                        <option value="lead">📣 引流品</option>
                        <option value="skip">⛔ 放棄</option>
                      </select>
                      <p className="text-xs text-gray-400">備註</p>
                      <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputCls + ' resize-none'} />
                    </div>
                  )}
                </td>

                {/* Margin */}
                <td className="px-4 py-3 text-right">
                  {profit !== null && margin !== null ? (
                    <div>
                      <p className={`text-sm font-semibold ${marginColor}`}>NT${profit.toFixed(0)}</p>
                      <p className={`text-xs ${marginColor} opacity-70`}>{margin.toFixed(1)}%</p>
                    </div>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                  {isEditing && (
                    <div className="mt-2 text-left space-y-1.5">
                      <p className="text-xs text-gray-400">供應商文案</p>
                      <textarea value={form.supplier_copy} onChange={e => set('supplier_copy', e.target.value)} rows={3} className={inputCls + ' resize-none'} />
                    </div>
                  )}
                </td>

                {/* Stock */}
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-semibold ${p.stock_status === 'sold_out' ? 'text-red-400' : p.stock_status === 'low_stock' ? 'text-amber-500' : 'text-gray-700'}`}>
                    {p.remaining_stock}
                  </span>
                  <span className="text-xs text-gray-400 ml-0.5">件</span>
                  {isEditing && (
                    <div className="mt-2 text-left space-y-1.5">
                      <p className="text-xs text-gray-400">廣告文案</p>
                      <textarea value={form.ad_copy} onChange={e => set('ad_copy', e.target.value)} rows={5} className={inputCls + ' resize-none'} />
                    </div>
                  )}
                </td>

                {/* Strategy */}
                <td className="px-4 py-3 text-center">
                  {strategy
                    ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategy.cls}`}>{strategy.label}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  {isEditing ? (
                    <div className="flex flex-col gap-1.5 items-center">
                      <button
                        onClick={() => confirmSave(p)}
                        disabled={saving}
                        className="w-16 text-xs text-white bg-pink-500 hover:bg-pink-600 px-2 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      >{saving ? '…' : '儲存'}</button>
                      <button onClick={cancelEdit} className="w-16 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg">取消</button>
                      <button
                        onClick={() => confirmDelete(p)}
                        disabled={deletingId === p.id}
                        className="w-16 text-xs text-red-400 bg-red-50 hover:bg-red-100 px-2 py-1.5 rounded-lg disabled:opacity-50"
                      >{deletingId === p.id ? '…' : '刪除'}</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 items-center">
                      {soldId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                          <span className="text-sm w-5 text-center font-medium">{soldQty}</span>
                          <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                          <button onClick={() => { onSold(p.id, soldQty); setSoldId(null) }} className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-lg ml-1">✓</button>
                          <button onClick={() => setSoldId(null)} className="text-xs text-gray-400">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setSoldId(p.id); setSoldQty(1) }}
                          disabled={p.remaining_stock === 0}
                          className="text-xs text-pink-600 hover:text-pink-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                        >出貨</button>
                      )}
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg font-medium transition-colors"
                      >編輯</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const inputCls = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 bg-white'
