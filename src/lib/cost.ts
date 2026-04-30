export interface CostInput {
  originalCost: number
  weightG: number
  packagingFee: number
  serviceFeePct: number
  taxPct: number        // from source.tax_pct (e.g. 0.1 for 10%)
  exchangeRate: number  // already buffered (source.exchange_rate × buffer)
  handlingFeePct: number
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
  const { originalCost, weightG, packagingFee, serviceFeePct, taxPct, exchangeRate, handlingFeePct } = input

  const taxedCost    = originalCost * (1 + taxPct)
  const serviceFeeFC = originalCost * serviceFeePct
  const twdCost      = (taxedCost + serviceFeeFC) * exchangeRate
  const shippingFee  = (weightG / 1000) * shippingPerKg
  const totalCost    = twdCost + shippingFee + packagingFee
  const totalCostWithHandling = totalCost * (1 + handlingFeePct)

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
