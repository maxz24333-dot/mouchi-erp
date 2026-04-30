import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchRateToTWD } from '@/lib/rates'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if ('label'           in body) updates.label           = body.label
    if ('currency'        in body) updates.currency        = String(body.currency).toUpperCase()
    if ('tax_pct'         in body) updates.tax_pct         = parseFloat(body.tax_pct) / 100
    if ('shipping_per_kg' in body) updates.shipping_per_kg = parseFloat(body.shipping_per_kg)
    if ('search_country'  in body) updates.search_country  = String(body.search_country).toLowerCase()

    // If currency changed, immediately refresh rate
    if ('currency' in body) {
      const rate = await fetchRateToTWD(String(body.currency))
      if (rate) {
        updates.exchange_rate = rate
        updates.exchange_rate_updated_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('sources')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('sources').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
