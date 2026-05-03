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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  try {
    const { id, vid } = await params
    const body = await req.json()
    const updates: Record<string, unknown> = {}
    if ('label'          in body) updates.label          = body.label
    if ('stock_quantity' in body) updates.stock_quantity = Number(body.stock_quantity)
    if ('sold_quantity'  in body) updates.sold_quantity  = Number(body.sold_quantity)
    if ('sort_order'     in body) updates.sort_order     = Number(body.sort_order)

    const { data, error } = await supabase
      .from('product_variants')
      .update(updates)
      .eq('id', vid)
      .eq('product_id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await syncProductTotals(id)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { id, vid } = await params
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', vid)
    .eq('product_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncProductTotals(id)
  return NextResponse.json({ ok: true })
}
