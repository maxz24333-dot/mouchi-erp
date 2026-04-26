'use client'
import type { CostResult } from '@/lib/cost'

interface Props {
  cost: CostResult | null
  sellingPrice: number
  marketLow: number | null
  marketHigh: number | null
  marketAvg: number | null
  ecommerceCount: number
  socialLow: number | null
  socialHigh: number | null
  socialAvg: number | null
  socialCount: number
  isBranded: boolean
  marketStage: string | null
  marketStageAdvice: string | null
  aiName: string | null
  loading: boolean
}

export default function CostResultCard({
  cost, sellingPrice,
  marketLow, marketHigh, marketAvg, ecommerceCount,
  socialLow, socialHigh, socialAvg, socialCount,
  isBranded,
  marketStage, marketStageAdvice,
  aiName, loading,
}: Props) {
  const margin = cost && sellingPrice > 0 ? cost.profitMargin(sellingPrice) : null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 text-sm">AI 智能結果</h3>

      {/* AI 販售名 */}
      <div>
        <p className="text-xs text-gray-400 mb-1">AI 建議販售名</p>
        {loading ? (
          <div className="skeleton h-5 w-3/4" />
        ) : (
          <p className="text-sm font-medium text-gray-800">{aiName ?? '—'}</p>
        )}
      </div>

      {/* 市場行情 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-xs text-gray-400">市場行情參考</p>
          {!loading && isBranded && (
            <span className="text-xs bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full font-medium">精確品牌</span>
          )}
          {!loading && !isBranded && (marketLow || socialLow) && (
            <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">類似品項</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-1.5">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        ) : marketLow && marketHigh ? (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-gray-400 w-8 shrink-0">電商</span>
              <span className="text-sm text-gray-800">
                NT${marketLow.toLocaleString()} – NT${marketHigh.toLocaleString()}
                {marketAvg && <span className="text-gray-400 ml-1">(均 {marketAvg.toLocaleString()})</span>}
              </span>
              {ecommerceCount > 0 && (
                <span className="text-xs text-gray-400 ml-auto shrink-0">{ecommerceCount} 家</span>
              )}
            </div>
            {socialLow && socialHigh ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-gray-400 w-8 shrink-0">社群</span>
                <span className="text-sm text-gray-800">
                  NT${socialLow.toLocaleString()} – NT${socialHigh.toLocaleString()}
                  {socialAvg && <span className="text-gray-400 ml-1">(均 {socialAvg.toLocaleString()})</span>}
                </span>
                {socialCount > 0 && (
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{socialCount} 則</span>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-gray-400">尚未取得</p>
        )}
      </div>

      {/* 產品生命週期 */}
      {!loading && marketStage && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">{marketStage}</span>
          {marketStageAdvice && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              marketStageAdvice === '建議放棄'
                ? 'bg-red-100 text-red-600'
                : marketStageAdvice === '引流品'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-green-100 text-green-700'
            }`}>{marketStageAdvice}</span>
          )}
        </div>
      )}

      {/* 成本分解 */}
      {cost && (
        <div className="border-t pt-3 space-y-1.5">
          <Row label="台幣成本" value={`NT$${cost.twdCost.toFixed(0)}`} />
          <Row label="空運費" value={`NT$${cost.shippingFee.toFixed(0)}`} />
          <Row label="成本總計" value={`NT$${cost.totalCost.toFixed(0)}`} bold />
          <Row label="含手續費" value={`NT$${cost.totalCostWithHandling.toFixed(0)}`} bold accent />
          {margin !== null && sellingPrice > 0 && (
            <Row
              label="利潤"
              value={`NT$${(sellingPrice - cost.totalCostWithHandling).toFixed(0)}`}
              bold
              accent={sellingPrice > cost.totalCostWithHandling}
              warn={sellingPrice <= cost.totalCostWithHandling}
            />
          )}
          {margin !== null && (
            <Row
              label="毛利率"
              value={`${(margin * 100).toFixed(1)}%`}
              bold
              accent={margin >= 0.3}
              warn={margin < 0}
            />
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, bold, accent, warn }: {
  label: string; value: string; bold?: boolean; accent?: boolean; warn?: boolean
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} ${accent ? 'text-pink-600' : ''} ${warn ? 'text-red-500' : ''}`}>
        {value}
      </span>
    </div>
  )
}
