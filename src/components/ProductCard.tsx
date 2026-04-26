'use client'
import { useState } from 'react'

interface Product {
  id: string
  created_at: string
  image_url: string | null
  source: string
  product_code: string
  product_name: string
  ai_suggested_name: string | null
  original_cost: number
  total_cost_with_handling: number
  my_selling_price: number | null
  profit_margin: number | null
  strategy_tag: 'lead' | 'profit' | 'skip' | null
  stock_quantity: number
  sold_quantity: number
  remaining_stock: number
  stock_status: 'in_stock' | 'low_stock' | 'sold_out'
  market_price_low: number | null
  market_price_high: number | null
  exchange_rate: number
  notes: string
}

const SOURCE_LABEL: Record<string, string> = {
  thailand: '🇹🇭 泰國',
  haido:    '🇯🇵 海度',
  mdm:      '🇯🇵 MDM',
  sd:       '🇯🇵 SD',
  other:    '📦 其他',
  korea:    '🇰🇷 韓國',
}

const STRATEGY_CONFIG = {
  lead:   { label: '📣 引流品', color: 'bg-blue-100 text-blue-700' },
  profit: { label: '💰 利潤品', color: 'bg-green-100 text-green-700' },
  skip:   { label: '⛔ 放棄', color: 'bg-red-100 text-red-700' },
}

const STOCK_CONFIG = {
  in_stock:  { label: '庫存充足', color: 'text-green-600' },
  low_stock: { label: '庫存偏低', color: 'text-amber-500' },
  sold_out:  { label: '已售完', color: 'text-red-400' },
}

interface Props {
  product: Product
  onSold: (id: string, qty: number) => void
  onUpdatePrice: (id: string, price: number) => void
}

export default function ProductCard({ product, onSold, onUpdatePrice }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState(String(product.my_selling_price ?? ''))
  const [soldQty, setSoldQty] = useState(1)

  const name = product.ai_suggested_name || product.product_name || '未命名商品'
  const margin = product.profit_margin ? (product.profit_margin * 100).toFixed(1) : null
  const strategy = product.strategy_tag ? STRATEGY_CONFIG[product.strategy_tag] : null
  const stockInfo = STOCK_CONFIG[product.stock_status]

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex gap-3 p-3 text-left active:bg-gray-50"
      >
        {/* Image */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">{name}</p>
            {strategy && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${strategy.color}`}>
                {strategy.label}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{SOURCE_LABEL[product.source]} · {product.product_code || '—'}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm font-bold text-gray-800">
              NT${product.my_selling_price?.toLocaleString() ?? '—'}
            </span>
            {margin && (
              <span className={`text-xs font-medium ${parseFloat(margin) >= 30 ? 'text-green-600' : 'text-amber-500'}`}>
                毛利 {margin}%
              </span>
            )}
            <span className={`text-xs ml-auto ${stockInfo.color}`}>
              剩 {product.remaining_stock} 件
            </span>
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2 space-y-3">
          {/* Cost breakdown */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Row label="落地成本" value={`NT$${product.total_cost_with_handling.toFixed(0)}`} />
            <Row label="匯率" value={product.exchange_rate.toFixed(4)} />
            {product.market_price_low && product.market_price_high && (
              <Row label="市場行情" value={`NT$${product.market_price_low}–${product.market_price_high}`} />
            )}
            <Row label="進貨量" value={`${product.stock_quantity} 件`} />
            <Row label="已售" value={`${product.sold_quantity} 件`} />
            <Row label={stockInfo.label} value={`${product.remaining_stock} 件`} accent />
          </div>

          {product.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1.5">{product.notes}</p>
          )}

          {/* Edit price */}
          <div className="flex gap-2 items-center">
            {editingPrice ? (
              <>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  className="flex-1 text-sm border border-pink-300 rounded-xl px-3 py-2 outline-none"
                  placeholder="新賣價"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePrice(product.id, parseFloat(newPrice))
                    setEditingPrice(false)
                  }}
                  className="px-3 py-2 bg-pink-500 text-white text-sm rounded-xl font-medium"
                >
                  確認
                </button>
                <button type="button" onClick={() => setEditingPrice(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">
                  取消
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditingPrice(true)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl font-medium active:bg-gray-200"
              >
                修改賣價
              </button>
            )}
          </div>

          {/* Sold action */}
          {product.remaining_stock > 0 && (
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                <button type="button" onClick={() => setSoldQty(v => Math.max(1, v - 1))}
                  className="text-gray-500 text-lg w-6 text-center">−</button>
                <span className="text-sm font-semibold w-4 text-center">{soldQty}</span>
                <button type="button" onClick={() => setSoldQty(v => Math.min(product.remaining_stock, v + 1))}
                  className="text-gray-500 text-lg w-6 text-center">+</button>
              </div>
              <button
                type="button"
                onClick={() => { onSold(product.id, soldQty); setSoldQty(1) }}
                className="flex-1 py-2 bg-pink-500 text-white text-sm rounded-xl font-medium active:bg-pink-600"
              >
                出貨 {soldQty} 件
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium ${accent ? 'text-pink-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
