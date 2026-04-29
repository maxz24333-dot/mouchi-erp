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
  onUpdatePrice: (id: string, price: number) => void
  onUpdateNotes: (id: string, notes: string) => Promise<void>
  onUpdateAdCopy: (id: string, adCopy: string) => Promise<void>
  onAddStock: (id: string, qty: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function InventoryTable({
  products, onSold, onUpdatePrice, onUpdateNotes, onUpdateAdCopy, onAddStock, onDelete,
}: Props) {
  const [expandedId, setExpandedId]         = useState<string | null>(null)
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editPrice, setEditPrice]           = useState('')
  const [soldId, setSoldId]                 = useState<string | null>(null)
  const [soldQty, setSoldQty]               = useState(1)
  const [addStockId, setAddStockId]         = useState<string | null>(null)
  const [addStockQty, setAddStockQty]       = useState(1)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [editNotes, setEditNotes]           = useState('')
  const [editingAdCopyId, setEditingAdCopyId] = useState<string | null>(null)
  const [editAdCopy, setEditAdCopy]         = useState('')
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  function startEditPrice(p: any) {
    setEditingPriceId(p.id)
    setEditPrice(String(p.my_selling_price ?? ''))
  }

  function confirmEditPrice(id: string) {
    const price = parseFloat(editPrice)
    if (price > 0) onUpdatePrice(id, price)
    setEditingPriceId(null)
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id)
    setEditingNotesId(null)
    setEditingAdCopyId(null)
    setAddStockId(null)
  }

  async function confirmDelete(p: any) {
    if (!window.confirm(`確定刪除「${p.ai_suggested_name || p.product_name || '此商品'}」？`)) return
    setDeletingId(p.id)
    await onDelete(p.id)
    setDeletingId(null)
    if (expandedId === p.id) setExpandedId(null)
  }

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
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">商品</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">來源</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">落地成本</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">賣價</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">毛利</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">庫存</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">戰略</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => {
            const profit = p.my_selling_price && p.total_cost_with_handling
              ? p.my_selling_price - p.total_cost_with_handling : null
            const margin = p.my_selling_price && p.total_cost_with_handling
              ? ((p.my_selling_price - p.total_cost_with_handling) / p.my_selling_price * 100) : null
            const strategy  = p.strategy_tag ? STRATEGY_CONFIG[p.strategy_tag] : null
            const name      = p.ai_suggested_name || p.product_name || '未命名'
            const isExpanded = expandedId === p.id
            const currency  = CURRENCY_LABEL[p.source] ?? 'JPY'
            const marginColor = margin === null ? '' : margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'

            return (
              <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-pink-50/20' : ''}`}>
                <td className="px-4 py-3" colSpan={isExpanded ? 0 : 1}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                    }
                  </div>
                </td>

                <td className="px-4 py-3 max-w-[220px]">
                  <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400">{p.product_code || '—'}</p>
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      <Detail label="原始成本" value={`${p.original_cost} ${currency}`} />
                      <Detail label="匯率" value={p.exchange_rate?.toFixed(4)} />
                      <Detail label="台幣成本" value={`NT$${p.twd_cost?.toFixed(0)}`} />
                      <Detail label="運費" value={`NT$${p.shipping_fee?.toFixed(0)}`} />
                      <Detail label="落地含手續費" value={`NT$${p.total_cost_with_handling?.toFixed(0)}`} bold />
                      <Detail label="重量" value={`${p.weight_g}g`} />
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 align-top">
                  <span className="text-sm text-gray-600">{SOURCE_LABEL[p.source] ?? p.source}</span>
                  {isExpanded && (
                    <div className="mt-3 flex gap-1.5">
                      {addStockId === p.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setAddStockQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                          <span className="text-xs w-5 text-center font-medium">{addStockQty}</span>
                          <button onClick={() => setAddStockQty(v => v + 1)} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                          <button
                            onClick={async () => { await onAddStock(p.id, addStockQty); setAddStockId(null) }}
                            className="text-xs text-white bg-blue-500 px-2 py-0.5 rounded-lg"
                          >補貨</button>
                          <button onClick={() => setAddStockId(null)} className="text-xs text-gray-400">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddStockId(p.id); setAddStockQty(1) }}
                          className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100"
                        >+ 補貨</button>
                      )}
                      <button
                        onClick={() => confirmDelete(p)}
                        disabled={deletingId === p.id}
                        className="text-xs text-red-400 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >{deletingId === p.id ? '…' : '刪除'}</button>
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 text-right align-top">
                  <span className="text-sm text-gray-700">NT${p.total_cost_with_handling?.toFixed(0)}</span>
                  {isExpanded && p.notes !== undefined && (
                    <div className="mt-3 text-left">
                      <p className="text-xs text-gray-400 mb-1">備註</p>
                      {editingNotesId === p.id ? (
                        <div className="space-y-1">
                          <textarea
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none h-16"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button onClick={async () => { await onUpdateNotes(p.id, editNotes); setEditingNotesId(null) }}
                              className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-lg">儲存</button>
                            <button onClick={() => setEditingNotesId(null)} className="text-xs text-gray-400">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setEditingNotesId(p.id); setEditNotes(p.notes || '') }}
                          className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 min-h-[40px] cursor-pointer hover:bg-gray-100 whitespace-pre-wrap"
                        >
                          {p.notes || <span className="text-gray-300">點擊新增…</span>}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 text-right align-top">
                  {editingPriceId === p.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        autoFocus
                        className="w-20 text-right text-sm border-b border-pink-400 outline-none bg-transparent"
                        onKeyDown={e => { if (e.key === 'Enter') confirmEditPrice(p.id); if (e.key === 'Escape') setEditingPriceId(null) }}
                      />
                      <button onClick={() => confirmEditPrice(p.id)} className="text-xs text-pink-600 font-medium">✓</button>
                      <button onClick={() => setEditingPriceId(null)} className="text-xs text-gray-400">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditPrice(p)}
                      className="text-sm font-semibold text-gray-800 hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      {p.my_selling_price ? `NT$${p.my_selling_price.toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </button>
                  )}
                  {isExpanded && (
                    <div className="mt-3 text-left">
                      <p className="text-xs text-gray-400 mb-1">商品文案</p>
                      {editingAdCopyId === p.id ? (
                        <div className="space-y-1">
                          <textarea
                            value={editAdCopy}
                            onChange={e => setEditAdCopy(e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300 resize-none h-28"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button onClick={async () => { await onUpdateAdCopy(p.id, editAdCopy); setEditingAdCopyId(null) }}
                              className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-lg">儲存</button>
                            <button onClick={() => setEditingAdCopyId(null)} className="text-xs text-gray-400">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setEditingAdCopyId(p.id); setEditAdCopy(p.ad_copy || '') }}
                          className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 min-h-[40px] max-h-32 overflow-y-auto cursor-pointer hover:bg-gray-100 whitespace-pre-wrap"
                        >
                          {p.ad_copy || <span className="text-gray-300">尚無文案，點擊編輯…</span>}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-3 text-right align-top">
                  {profit !== null && margin !== null ? (
                    <div>
                      <p className={`text-sm font-semibold ${marginColor}`}>NT${profit.toFixed(0)}</p>
                      <p className={`text-xs ${marginColor} opacity-70`}>{margin.toFixed(1)}%</p>
                    </div>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                </td>

                <td className="px-4 py-3 text-center align-top">
                  <span className={`text-sm font-semibold ${p.stock_status === 'sold_out' ? 'text-red-400' : p.stock_status === 'low_stock' ? 'text-amber-500' : 'text-gray-700'}`}>
                    {p.remaining_stock}
                  </span>
                  <span className="text-xs text-gray-400 ml-0.5">件</span>
                  {isExpanded && (
                    <p className="text-xs text-gray-400 mt-1">進貨 {p.stock_quantity} 已售 {p.sold_quantity}</p>
                  )}
                </td>

                <td className="px-4 py-3 text-center align-top">
                  {strategy
                    ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategy.cls}`}>{strategy.label}</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>

                <td className="px-4 py-3 text-center align-top">
                  <div className="flex flex-col items-center gap-1.5">
                    {soldId === p.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">−</button>
                        <span className="text-sm w-5 text-center font-medium">{soldQty}</span>
                        <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-xs hover:bg-gray-200">+</button>
                        <button onClick={() => { onSold(p.id, soldQty); setSoldId(null) }} className="text-xs text-white bg-pink-500 px-2 py-0.5 rounded-lg ml-1">確認</button>
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
                      onClick={() => toggleExpand(p.id)}
                      className={`text-xs px-2 py-0.5 rounded-lg font-medium transition-colors ${isExpanded ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >{isExpanded ? '收起' : '詳情'}</button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Detail({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium text-gray-700 ${bold ? 'text-gray-800' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
