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
  onUpdatePrice: (id: string, price: number) => void
  onUpdateNotes: (id: string, notes: string) => Promise<void>
  onUpdateAdCopy: (id: string, adCopy: string) => Promise<void>
  onAddStock: (id: string, qty: number) => Promise<void>
}

export default function ProductCard({ product, onSold, onUpdatePrice, onUpdateNotes, onUpdateAdCopy, onAddStock }: Props) {
  const [expanded, setExpanded]       = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice]       = useState(String(product.my_selling_price ?? ''))
  const [soldQty, setSoldQty]         = useState(1)
  const [addStockQty, setAddStockQty] = useState(1)
  const [showAddStock, setShowAddStock] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesVal, setNotesVal]       = useState(product.notes || '')
  const [editingAdCopy, setEditingAdCopy] = useState(false)
  const [adCopyVal, setAdCopyVal]     = useState(product.ad_copy || '')
  const [showAdCopy, setShowAdCopy]   = useState(false)

  const name      = product.ai_suggested_name || product.product_name || '未命名商品'
  const profit    = product.my_selling_price && product.total_cost_with_handling
    ? product.my_selling_price - product.total_cost_with_handling : null
  const margin    = product.profit_margin ? (product.profit_margin * 100).toFixed(1) : null
  const strategy  = product.strategy_tag ? STRATEGY_CONFIG[product.strategy_tag as keyof typeof STRATEGY_CONFIG] : null
  const stockInfo = STOCK_CONFIG[product.stock_status as keyof typeof STOCK_CONFIG]
  const currency  = CURRENCY_LABEL[product.source] ?? 'JPY'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Main row */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex gap-3 p-3 text-left active:bg-gray-50"
      >
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url
            ? <img src={product.image_url} alt={name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>
          }
        </div>

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
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm font-bold text-gray-800">
              NT${product.my_selling_price?.toLocaleString() ?? '—'}
            </span>
            {profit !== null && (
              <span className={`text-xs font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                毛利 NT${profit.toFixed(0)}{margin ? ` (${margin}%)` : ''}
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-gray-50 rounded-xl p-2.5">
            <Row label="原始成本" value={`${product.original_cost} ${currency}`} />
            <Row label="匯率" value={product.exchange_rate?.toFixed(4)} />
            <Row label="台幣成本" value={`NT$${product.twd_cost?.toFixed(0)}`} />
            <Row label="運費" value={`NT$${product.shipping_fee?.toFixed(0)}`} />
            <Row label="落地含手續費" value={`NT$${product.total_cost_with_handling?.toFixed(0)}`} accent />
            <Row label="重量" value={`${product.weight_g}g`} />
            <Row label="進貨量" value={`${product.stock_quantity} 件`} />
            <Row label="已售" value={`${product.sold_quantity} 件`} />
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-gray-400 mb-1">備註</p>
            {editingNotes ? (
              <div className="space-y-1.5">
                <textarea
                  value={notesVal}
                  onChange={e => setNotesVal(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none h-16 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => { await onUpdateNotes(product.id, notesVal); setEditingNotes(false) }}
                    className="flex-1 py-1.5 bg-pink-500 text-white text-xs rounded-xl font-medium"
                  >儲存</button>
                  <button type="button" onClick={() => setEditingNotes(false)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-xl">取消</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingNotes(true)}
                className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 min-h-[36px] cursor-pointer active:bg-gray-100 whitespace-pre-wrap"
              >
                {notesVal || <span className="text-gray-300">點擊新增備註…</span>}
              </div>
            )}
          </div>

          {/* Ad copy toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdCopy(v => !v)}
              className="text-xs text-gray-500 font-medium flex items-center gap-1"
            >
              {showAdCopy ? '▾' : '▸'} 商品文案
            </button>
            {showAdCopy && (
              <div className="mt-1.5">
                {editingAdCopy ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={adCopyVal}
                      onChange={e => setAdCopyVal(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none h-32 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => { await onUpdateAdCopy(product.id, adCopyVal); setEditingAdCopy(false) }}
                        className="flex-1 py-1.5 bg-pink-500 text-white text-xs rounded-xl font-medium"
                      >儲存</button>
                      <button type="button" onClick={() => setEditingAdCopy(false)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-xl">取消</button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingAdCopy(true)}
                    className="text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2 min-h-[40px] cursor-pointer active:bg-gray-100 whitespace-pre-wrap max-h-40 overflow-y-auto"
                  >
                    {adCopyVal || <span className="text-gray-300">尚無文案，點擊編輯…</span>}
                  </div>
                )}
              </div>
            )}
          </div>

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
                  onClick={() => { onUpdatePrice(product.id, parseFloat(newPrice)); setEditingPrice(false) }}
                  className="px-3 py-2 bg-pink-500 text-white text-sm rounded-xl font-medium"
                >確認</button>
                <button type="button" onClick={() => setEditingPrice(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">取消</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditingPrice(true)}
                className="flex-1 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl font-medium active:bg-gray-200"
              >修改賣價</button>
            )}
          </div>

          {/* Add stock */}
          <div className="flex gap-2 items-center">
            {showAddStock ? (
              <>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                  <button type="button" onClick={() => setAddStockQty(v => Math.max(1, v - 1))} className="text-gray-500 text-lg w-6 text-center">−</button>
                  <span className="text-sm font-semibold w-6 text-center">{addStockQty}</span>
                  <button type="button" onClick={() => setAddStockQty(v => v + 1)} className="text-gray-500 text-lg w-6 text-center">+</button>
                </div>
                <button
                  type="button"
                  onClick={async () => { await onAddStock(product.id, addStockQty); setShowAddStock(false) }}
                  className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-xl font-medium active:bg-blue-600"
                >補貨 {addStockQty} 件</button>
                <button type="button" onClick={() => setShowAddStock(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-xl">取消</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddStock(true)}
                className="flex-1 py-2 bg-blue-50 text-blue-600 text-sm rounded-xl font-medium active:bg-blue-100"
              >+ 補貨</button>
            )}
          </div>

          {/* Sold action */}
          {product.remaining_stock > 0 && (
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                <button type="button" onClick={() => setSoldQty(v => Math.max(1, v - 1))} className="text-gray-500 text-lg w-6 text-center">−</button>
                <span className="text-sm font-semibold w-4 text-center">{soldQty}</span>
                <button type="button" onClick={() => setSoldQty(v => Math.min(product.remaining_stock, v + 1))} className="text-gray-500 text-lg w-6 text-center">+</button>
              </div>
              <button
                type="button"
                onClick={() => { onSold(product.id, soldQty); setSoldQty(1) }}
                className="flex-1 py-2 bg-pink-500 text-white text-sm rounded-xl font-medium active:bg-pink-600"
              >出貨 {soldQty} 件</button>
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
