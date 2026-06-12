import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const product_id = searchParams.get('product_id')
  const brand      = searchParams.get('brand')
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')

  let q = supabase
    .from('stock_adjustments')
    .select('*, products(ai_suggested_name, product_name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (product_id)              q = q.eq('product_id', product_id)
  if (brand && brand !== 'all') q = q.eq('brand', brand)
  if (from)                    q = q.gte('date', from)
  if (to)                      q = q.lte('date', to)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { data, error } = await supabase.from('stock_adjustments').insert(body).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabase.from('stock_adjustments').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
