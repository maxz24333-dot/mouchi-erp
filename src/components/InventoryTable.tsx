'use client'
import { useState } from 'react'

const SOURCE_LABEL: Record<string, string> = {
  thailand: '🇹🇭 泰國',
  haido:    '🇯🇵 海度',
  mdm:      '🇯🇵 MDM',
  sd:       '🇯🇵 SD',
  other:    '📦 其他',
  korea:    '🇰🇷 韓國',
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
}

export default function InventoryTable({ products, onSold, onUpdatePrice }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [soldId, setSoldId] = useState<string | null>(null)
  const [soldQty, setSoldQty] = useState(1)

  function startEdit(p: any) {
    setEditingId(p.id)
    setEditPrice(String(p.my_selling_price ?? ''))
  }

  function confirmEdit(id: string) {
    const price = parseFloat(editPrice)
    if (price > 0) onUpdatePrice(id, price)
    setEditingId(null)
  }

  function startSold(p: any) {
    setSoldId(p.id)
    setSoldQty(1)
  }

  function confirmSold(id: string) {
    onSold(id, soldQty)
    setSoldId(null)
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
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12"></th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">商品</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">來源</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">成本</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">賣價</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">毛利率</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">庫存</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">戰略</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.map(p => {
            const margin = p.my_selling_price && p.total_cost_with_handling
              ? ((p.my_selling_price - p.total_cost_with_handling) / p.my_selling_price * 100)
              : null
            const strategy = p.strategy_tag ? STRATEGY_CONFIG[p.strategy_tag] : null
            const name = p.ai_suggested_name || p.product_name || '未命名'

            return (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                {/* Thumbnail */}
                <td className="px-4 py-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {p.image_url
                      ? <img src={p.image_url} alt={name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                    }
                  </div>
                </td>

                {/* Name + code */}
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                  <p className="text-xs text-gray-400">{p.product_code || '—'}</p>
                </td>

                {/* Source */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{SOURCE_LABEL[p.source] ?? p.source}</span>
                </td>

                {/* Cost */}
                <td className="px-4 py-3 text-right">
                  <span className="text-sm text-gray-700">NT${p.total_cost_with_handling?.toFixed(0)}</span>
                </td>

                {/* Price (editable) */}
                <td className="px-4 py-3 text-right">
                  {editingId === p.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        autoFocus
                        className="w-20 text-right text-sm border-b border-pink-400 outline-none bg-transparent"
                        onKeyDown={e => { if (e.key === 'Enter') confirmEdit(p.id); if (e.key === 'Escape') setEditingId(null) }}
                      />
                      <button onClick={() => confirmEdit(p.id)} className="text-xs text-pink-600 hover:text-pink-700 font-medium">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      className="text-sm font-semibold text-gray-800 hover:text-pink-600 transition-colors cursor-pointer"
                    >
                      {p.my_selling_price ? `NT$${p.my_selling_price.toLocaleString()}` : <span className="text-gray-300">—</span>}
                    </button>
                  )}
                </td>

                {/* Margin */}
                <td className="px-4 py-3 text-right">
                  {margin !== null ? (
                    <span className={`text-sm font-medium ${margin >= 30 ? 'text-green-600' : margin < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {margin.toFixed(1)}%
                    </span>
                  ) : <span className="text-gray-300 text-sm">—</span>}
                </td>

                {/* Stock */}
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-semibold
                    ${p.stock_status === 'sold_out' ? 'text-red-400' : p.stock_status === 'low_stock' ? 'text-amber-500' : 'text-gray-700'}`}>
                    {p.remaining_stock}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">件</span>
                </td>

                {/* Strategy */}
                <td className="px-4 py-3 text-center">
                  {strategy ? (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${strategy.cls}`}>{strategy.label}</span>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  {soldId === p.id ? (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">−</button>
                      <span className="text-sm w-5 text-center font-medium">{soldQty}</span>
                      <button onClick={() => setSoldQty(v => Math.min(p.remaining_stock, v + 1))} className="w-5 h-5 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">+</button>
                      <button onClick={() => confirmSold(p.id)} className="text-xs text-white bg-pink-500 hover:bg-pink-600 px-2 py-0.5 rounded-lg ml-1">確認</button>
                      <button onClick={() => setSoldId(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startSold(p)}
                      disabled={p.remaining_stock === 0}
                      className="text-xs text-pink-600 hover:text-pink-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      出貨
                    </button>
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
