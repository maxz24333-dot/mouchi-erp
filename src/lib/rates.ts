/**
 * Fetch TWD exchange rate for any currency using fawazahmed0 CDN (free, no API key).
 * Returns how many TWD per 1 unit of the given currency.
 */
export async function fetchRateToTWD(currency: string): Promise<number | null> {
  const curr = currency.trim().toLowerCase()
  if (curr === 'twd' || curr === 'ntd') return 1
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${curr}.json`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    const rate = data[curr]?.twd
    return typeof rate === 'number' && rate > 0 ? rate : null
  } catch {
    return null
  }
}
