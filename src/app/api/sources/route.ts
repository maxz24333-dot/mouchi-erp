import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchRateToTWD } from '@/lib/rates'

export async function GET() {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
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
