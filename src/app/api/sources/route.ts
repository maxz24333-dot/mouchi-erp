import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchBatchRatesToTWD, fetchRateToTWD } from '@/lib/rates'

const RATE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const { data: sources, error } = await supabase
    .from('sources')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sources?.length) return NextResponse.json([])

  // Find sources with stale or missing exchange rates
  const stale = sources.filter(s => {
    if (!s.exchange_rate_updated_at) return true
    return Date.now() - new Date(s.exchange_rate_updated_at).getTime() > RATE_TTL_MS
  })

  if (stale.length === 0) return NextResponse.json(sources)

  // Batch-fetch rates for all unique stale currencies
  const currencies = [...new Set(stale.map((s: any) => s.currency as string))]
  const rates = await fetchBatchRatesToTWD(currencies)

  const now = new Date().toISOString()
  const updated = sources.map((s: any) => ({ ...s }))

  await Promise.all(
    stale.map(async (s: any) => {
      const rate = rates[s.currency.toUpperCase()]
      if (!rate) return
      const idx = updated.findIndex((u: any) => u.id === s.id)
      if (idx >= 0) {
        updated[idx].exchange_rate = rate
        updated[idx].exchange_rate_updated_at = now
      }
      await supabase
        .from('sources')
        .update({ exchange_rate: rate, exchange_rate_updated_at: now })
        .eq('id', s.id)
    })
  )

  return NextResponse.json(updated)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { label, currency, tax_pct, shipping_per_kg, search_country } = body

    const id = label
      .toLowerCase()
      .replace(/[^\w一-鿿]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20) + '-' + Date.now().toString(36)

    const exchange_rate = await fetchRateToTWD(currency)

    const { data, error } = await supabase
      .from('sources')
      .insert({
        id,
        label,
        currency: currency.toUpperCase(),
        tax_pct: parseFloat(tax_pct) / 100,
        shipping_per_kg: parseFloat(shipping_per_kg),
        search_country: search_country.toLowerCase(),
        exchange_rate,
        exchange_rate_updated_at: exchange_rate ? new Date().toISOString() : null,
        sort_order: 99,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
