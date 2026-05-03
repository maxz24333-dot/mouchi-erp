import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function syncProductTotals(productId: string) {
  const { data } = await supabase
    .from('product_variants')
    .select('stock_quantity, sold_quantity')
    .eq('product_id', productId)
  if (!data) return
  const stock = data.reduce((s, v) => s + (v.stock_quantity ?? 0), 0)
  const sold  = data.reduce((s, v) => s + (v.sold_quantity  ?? 0), 0)
  await supabase.from('products').update({ stock_quantity: stock, sold_quantity: sold }).eq('id', productId)
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { label, stock_quantity = 0, sort_order = 99 } = await req.json()
    if (!label) return NextResponse.json({ error: 'label required' }, { status: 400 })

    const { data, error } = await supabase
      .from('product_variants')
      .insert({ product_id: id, label, stock_quantity, sold_quantity: 0, sort_order })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await syncProductTotals(id)
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
