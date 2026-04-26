import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Taiwan Bank open API - cash selling rate
const BOT_URL = 'https://rate.bot.com.tw/xrt/flcsv/0/day'

interface RateRow { currency: string; cashSell: number }

async function fetchBOTRates(): Promise<{ THB: number; JPY: number }> {
  const res = await fetch(BOT_URL, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error('BOT API failed')
  const text = await res.text()

  const rates: Record<string, number> = {}
  for (const line of text.split('\n')) {
    const cols = line.split(',')
    if (cols.length < 13) continue
    const currency = cols[0]?.trim()
    // Format: 幣別, 本行買入, cash_buy, spot_buy, ...x7, 本行賣出, cash_sell(col12), spot_sell...
    const cashSell = parseFloat(cols[12]?.trim() ?? '')
    if (currency && !isNaN(cashSell) && cashSell > 0) rates[currency] = cashSell
  }

  if (!rates['THB'] || !rates['JPY']) throw new Error('Missing THB or JPY in BOT response')
  return { THB: rates['THB'], JPY: rates['JPY'] }
}

export async function GET() {
  try {
    // Check cache (valid for 60 minutes)
    const { data: cached } = await supabase
      .from('exchange_rate_cache')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single() as { data: { thb: number; jpy: number; fetched_at: string } | null; error: unknown }

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime()
      if (age < 60 * 60 * 1000) {
        return NextResponse.json({ THB: cached.thb, JPY: cached.jpy, fetched_at: cached.fetched_at, cached: true })
      }
    }

    // Fetch fresh rates
    const rates = await fetchBOTRates()

    // Save to cache
    await supabase.from('exchange_rate_cache').insert({ thb: rates.THB, jpy: rates.JPY })

    return NextResponse.json({ ...rates, fetched_at: new Date().toISOString(), cached: false })
  } catch (err) {
    // Fallback to last cached value even if stale
    const { data: fallback } = await supabase
      .from('exchange_rate_cache')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single() as { data: { thb: number; jpy: number; fetched_at: string } | null; error: unknown }

    if (fallback) {
      return NextResponse.json({ THB: fallback.thb, JPY: fallback.jpy, fetched_at: fallback.fetched_at, stale: true })
    }

    return NextResponse.json({ error: 'Cannot fetch exchange rates' }, { status: 500 })
  }
}
