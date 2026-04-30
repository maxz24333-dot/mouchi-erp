const BOT_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/day'

/** Fetch all available rates from Taiwan BOT (cash sell). Returns { JPY: 0.237, THB: 0.91, KRW: 0.023, ... } */
async function fetchBOTRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch(BOT_URL, { cache: 'no-store' })
    if (!res.ok) return {}
    const text = await res.text()
    const rates: Record<string, number> = {}
    for (const line of text.split('\n')) {
      const cols = line.split(',')
      if (cols.length < 13) continue
      const currency = cols[0]?.trim().toUpperCase()
      const cashSell = parseFloat(cols[12]?.trim() ?? '')
      if (currency && !isNaN(cashSell) && cashSell > 0) rates[currency] = cashSell
    }
    return rates
  } catch {
    return {}
  }
}

/** Fetch a single currency → TWD from fawazahmed0 CDN (free, any currency) */
async function fetchFawazRate(currency: string): Promise<number | null> {
  const lower = currency.toLowerCase()
  if (lower === 'twd' || lower === 'ntd') return 1
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${lower}.json`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const rate = data[lower]?.twd
    return typeof rate === 'number' && rate > 0 ? rate : null
  } catch {
    return null
  }
}

/**
 * Batch fetch TWD rates for a list of currencies.
 * Prefers Taiwan BOT rates; falls back to fawazahmed0 for currencies not in BOT.
 */
export async function fetchBatchRatesToTWD(currencies: string[]): Promise<Record<string, number>> {
  const unique = [...new Set(currencies.map(c => c.toUpperCase()))]
  const result: Record<string, number> = {}

  const botRates = await fetchBOTRates()

  const fawazNeeded = unique.filter(c => c !== 'TWD' && c !== 'NTD' && !botRates[c])
  const fawazResults = await Promise.all(
    fawazNeeded.map(c => fetchFawazRate(c).then(r => ({ c, r })))
  )

  for (const c of unique) {
    if (c === 'TWD' || c === 'NTD') { result[c] = 1; continue }
    if (botRates[c])                { result[c] = botRates[c]; continue }
    const f = fawazResults.find(x => x.c === c)
    if (f?.r)                       { result[c] = f.r }
  }
  return result
}

/** Convenience: fetch a single currency rate to TWD */
export async function fetchRateToTWD(currency: string): Promise<number | null> {
  const rates = await fetchBatchRatesToTWD([currency])
  return rates[currency.toUpperCase()] ?? null
}
