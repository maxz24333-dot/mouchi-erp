import type { Source, Settings } from '@/types'

export interface CostInput {
  source: Source
  originalCost: number
  weightG: number
  packagingFee: number
  serviceFeePct: number
  includeTax: boolean
  exchangeRate: number
  settings: Pick<Settings, 'handling_fee_pct'>
}

export interface CostResult {
  taxedCost: number
  serviceFee: number
  twdCost: number
  shippingFee: number
  totalCost: number
  totalCostWithHandling: number
  profitMargin: (sellingPrice: number) => number
}

export function calcCost(input: CostInput, shippingPerKg: number): CostResult {
  const { source, originalCost, weightG, packagingFee, serviceFeePct, includeTax, exchangeRate } = input

  const taxMultiplier = getTaxMultiplier(source, includeTax)
  const taxedCost = originalCost * taxMultiplier
  const serviceFeeFC = originalCost * serviceFeePct
  const twdCost = (taxedCost + serviceFeeFC) * exchangeRate

  const shippingFee = (weightG / 1000) * shippingPerKg

  const totalCost = twdCost + shippingFee + packagingFee
  const totalCostWithHandling = totalCost * (1 + input.settings.handling_fee_pct)

  return {
    taxedCost,
    serviceFee: serviceFeeFC * exchangeRate,
    twdCost,
    shippingFee,
    totalCost,
    totalCostWithHandling,
    profitMargin: (sellingPrice: number) =>
      sellingPrice > 0 ? (sellingPrice - totalCostWithHandling) / sellingPrice : 0,
  }
}

function getTaxMultiplier(source: Source, includeTax: boolean): number {
  if (source === 'korea') return includeTax ? 1.1 : 1
  if (source === 'haido' || source === 'mdm' || source === 'sd' || source === 'other') return 1.1
  return 1
}

export function calcExchangeRate(source: Source, rates: { THB: number; JPY: number }): number {
  if (source === 'thailand') return rates.THB
  if (source === 'haido' || source === 'mdm' || source === 'sd' || source === 'other') return rates.JPY
  if (source === 'korea') return 1 / 40
  return 1
}

export function suggestStrategy(
  totalCostWithHandling: number,
  sellingPrice: number,
  marketAvg: number | null,
  targetMarginPct: number
): 'lead' | 'profit' | 'skip' {
  const margin = sellingPrice > 0 ? (sellingPrice - totalCostWithHandling) / sellingPrice : 0
  if (margin < 0) return 'skip'
  if (margin < targetMarginPct * 0.7) {
    if (marketAvg && sellingPrice < marketAvg * 0.9) return 'lead'
    return 'skip'
  }
  if (margin >= targetMarginPct * 1.2) return 'profit'
  return 'lead'
}
