import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const brand      = searchParams.get('brand') || 'all'
  const from       = searchParams.get('from')
  const to         = searchParams.get('to')
  const product_id = searchParams.get('product_id')
  const snapshot   = searchParams.get('snapshot') // YYYY-MM-DD → calculate stock at that date

  const movements: any[] = []

  // ── Purchase logs ────────────────────────────────────────────────────
  try {
    let q = supabase.from('purchase_logs')
      .select('*, products(ai_suggested_name, product_name)')
      .order('date', { ascending: false })
    if (brand !== 'all') q = q.eq('brand', brand)
    if (snapshot)        q = q.lte('date', snapshot)
    else {
      if (from) q = q.gte('date', from)
      if (to)   q = q.lte('date', to)
    }
    if (product_id) q = q.eq('product_id', product_id)
    const { data } = await q
    for (const r of (data ?? []) as any[]) {
      movements.push({
        id: `purchase_${r.id}`,
        type: 'purchase',
        date: r.date,
        product_id: r.product_id,
        product_name: r.products?.ai_suggested_name || r.products?.product_name || r.note || '未知商品',
        brand: r.brand,
        delta: r.quantity,
        quantity: r.quantity,
        unit_cost: r.unit_cost,
        total_value: (r.unit_cost ?? 0) * r.quantity,
        supplier: r.supplier,
        note: r.note,
        source_id: r.id,
        source_table: 'purchase_logs',
      })
    }
  } catch { /* table may not exist */ }

  // ── Retail sales_logs ────────────────────────────────────────────────
  if (brand === 'all' || brand === 'mouchi') {
    try {
      let q = supabase.from('sales_logs')
        .select('*, products(ai_suggested_name, product_name)')
        .order('created_at', { ascending: false })
        .eq('brand', 'mouchi')
      if (snapshot)        q = q.lte('created_at', snapshot + 'T23:59:59Z')
      else {
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
      }
      if (product_id) q = q.eq('product_id', product_id)
      const { data } = await q
      for (const r of (data ?? []) as any[]) {
        movements.push({
          id: `sale_${r.id}`,
          type: 'sale',
          date: r.created_at?.slice(0, 10),
          product_id: r.product_id,
          product_name: r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
          brand: 'mouchi',
          delta: -r.quantity,
          quantity: r.quantity,
          unit_price: r.unit_price,
          total_value: (r.unit_price ?? 0) * r.quantity,
          source_id: r.id,
          source_table: 'sales_logs',
        })
      }
    } catch {}
  }

  // ── Wholesale shipment_logs ──────────────────────────────────────────
  if (brand === 'all' || brand === 'wholesale') {
    try {
      let q = supabase.from('shipment_logs')
        .select('*, products(ai_suggested_name, product_name)')
        .order('created_at', { ascending: false })
        .eq('brand', 'wholesale')
      if (snapshot)        q = q.lte('created_at', snapshot + 'T23:59:59Z')
      else {
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
      }
      if (product_id) q = q.eq('product_id', product_id)
      const { data } = await q
      for (const r of (data ?? []) as any[]) {
        movements.push({
          id: `shipment_${r.id}`,
          type: 'wholesale_sale',
          date: r.created_at?.slice(0, 10),
          product_id: r.product_id,
          product_name: r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
          brand: 'wholesale',
          delta: -r.quantity,
          quantity: r.quantity,
          unit_price: r.unit_price,
          total_value: (r.unit_price ?? 0) * r.quantity,
          buyer: r.buyer,
          source_id: r.id,
          source_table: 'shipment_logs',
        })
      }
    } catch {}
  }

  // ── Stock adjustments ────────────────────────────────────────────────
  try {
    let q = supabase.from('stock_adjustments')
      .select('*, products(ai_suggested_name, product_name)')
      .order('date', { ascending: false })
    if (brand !== 'all')   q = q.eq('brand', brand)
    if (snapshot)          q = q.lte('date', snapshot)
    else {
      if (from) q = q.gte('date', from)
      if (to)   q = q.lte('date', to)
    }
    if (product_id) q = q.eq('product_id', product_id)
    const { data } = await q
    for (const r of (data ?? []) as any[]) {
      movements.push({
        id: `adj_${r.id}`,
        type: 'adjustment',
        date: r.date,
        product_id: r.product_id,
        product_name: r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
        brand: r.brand,
        delta: r.delta,
        quantity: Math.abs(r.delta),
        reason: r.reason,
        note: r.note,
        source_id: r.id,
        source_table: 'stock_adjustments',
      })
    }
  } catch {}

  // Sort newest first
  movements.sort((a, b) => (b.date || '').substring(0, 10).localeCompare((a.date || '').substring(0, 10)))

  // ── Snapshot mode: compute stock per product ─────────────────────────
  if (snapshot) {
    const map: Record<string, { product_name: string; brand: string; stock: number }> = {}
    for (const m of movements) {
      if (!m.product_id) continue
      if (!map[m.product_id]) map[m.product_id] = { product_name: m.product_name, brand: m.brand, stock: 0 }
      map[m.product_id].stock += m.delta
    }
    const snap = Object.entries(map)
      .map(([product_id, v]) => ({ product_id, ...v }))
      .sort((a, b) => b.stock - a.stock)
    return NextResponse.json({ type: 'snapshot', snapshot_date: snapshot, data: snap })
  }

  return NextResponse.json({ type: 'movements', data: movements })
}
