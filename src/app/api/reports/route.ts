import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getBrandIds(brand: string): Promise<string[] | null> {
  if (brand === 'all') return null
  const { data } = await supabase.from('products').select('id').eq('brand', brand)
  return (data ?? []).map((p: any) => p.id)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'all'
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')
  const hasDateFilter = !!(from || to)

  try {
    type Row = { date: string; revenue: number; cogs: number; qty: number; name: string }
    const rows: Row[] = []

    // ── Retail: sales_logs ──────────────────────────────────────────
    if (brand === 'all' || brand === 'mouchi') {
      try {
        let q = supabase
          .from('sales_logs')
          .select('created_at, quantity, unit_price, cost_per_unit, products(ai_suggested_name, product_name)')
          .eq('brand', 'mouchi')
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
        const { data, error } = await q
        if (!error) {
          for (const r of (data ?? []) as any[]) {
            rows.push({
              date:    r.created_at,
              revenue: (r.unit_price ?? 0) * r.quantity,
              cogs:    (r.cost_per_unit ?? 0) * r.quantity,
              qty:     r.quantity,
              name:    r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
            })
          }
        }
      } catch { /* sales_logs may not exist yet */ }
    }

    // ── Wholesale: shipment_logs ─────────────────────────────────────
    if (brand === 'all' || brand === 'wholesale') {
      try {
        let q = supabase
          .from('shipment_logs')
          .select('created_at, quantity, unit_price, products(ai_suggested_name, product_name, total_cost_with_handling)')
          .eq('brand', 'wholesale')
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
        const { data, error } = await q
        if (!error) {
          for (const r of (data ?? []) as any[]) {
            rows.push({
              date:    r.created_at,
              revenue: (r.unit_price ?? 0) * r.quantity,
              cogs:    (r.products?.total_cost_with_handling ?? 0) * r.quantity,
              qty:     r.quantity,
              name:    r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
            })
          }
        }
      } catch { /* ignore */ }
    }

    // ── Summary: for 全部 always use products.sold_quantity baseline ──
    // For dated periods, sum from log rows
    let summaryRevenue = 0
    let summaryCogs    = 0
    let summaryQty     = 0
    let usedBaseline   = false

    if (!hasDateFilter) {
      // Always use products table for all-time summary (covers history before logging)
      try {
        let q = supabase
          .from('products_with_stock')
          .select('my_selling_price, total_cost_with_handling, sold_quantity')
        const ids = await getBrandIds(brand)
        if (ids !== null) {
          if (ids.length > 0) q = q.in('id', ids)
          else q = q.in('id', [])
        }
        const { data: prods } = await q
        for (const p of (prods ?? []) as any[]) {
          const qty = p.sold_quantity ?? 0
          summaryRevenue += (p.my_selling_price ?? 0) * qty
          summaryCogs    += (p.total_cost_with_handling ?? 0) * qty
          summaryQty     += qty
        }
        usedBaseline = true
      } catch { /* ignore, fall back to rows */ }
    }

    if (!usedBaseline) {
      summaryRevenue = rows.reduce((s, r) => s + r.revenue, 0)
      summaryCogs    = rows.reduce((s, r) => s + r.cogs, 0)
      summaryQty     = rows.reduce((s, r) => s + r.qty, 0)
    }

    const summaryProfit = summaryRevenue - summaryCogs

    // ── Expenses (same date range) ───────────────────────────────────
    let totalExpenses = 0
    try {
      let eq = supabase.from('expenses').select('amount, date')
      if (brand !== 'all') eq = eq.eq('brand', brand)
      if (from) eq = eq.gte('date', from)
      if (to)   eq = eq.lte('date', to)
      const { data: expData } = await eq
      totalExpenses = (expData ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0)
    } catch { /* expenses table may not exist */ }

    // ── Purchase logs (same date range) ─────────────────────────────
    let totalPurchased = 0
    let purchaseQty    = 0
    try {
      let pq = supabase.from('purchase_logs').select('quantity, unit_cost, date')
      if (brand !== 'all') pq = pq.eq('brand', brand)
      if (from) pq = pq.gte('date', from)
      if (to)   pq = pq.lte('date', to)
      const { data: purData } = await pq
      for (const p of (purData ?? []) as any[]) {
        totalPurchased += (p.unit_cost ?? 0) * (p.quantity ?? 0)
        purchaseQty    += p.quantity ?? 0
      }
    } catch { /* purchase_logs may not exist */ }

    // ── Monthly breakdown (from logs only) ───────────────────────────
    const monthMap: Record<string, { revenue: number; cogs: number; count: number; qty: number }> = {}
    for (const r of rows) {
      const month = r.date.slice(0, 7)
      if (!monthMap[month]) monthMap[month] = { revenue: 0, cogs: 0, count: 0, qty: 0 }
      monthMap[month].revenue += r.revenue
      monthMap[month].cogs    += r.cogs
      monthMap[month].count   += 1
      monthMap[month].qty     += r.qty
    }
    const by_month = Object.entries(monthMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, v]) => ({
        month,
        revenue: v.revenue,
        cogs:    v.cogs,
        profit:  v.revenue - v.cogs,
        count:   v.count,
        qty:     v.qty,
        margin:  v.revenue > 0 ? (v.revenue - v.cogs) / v.revenue : 0,
      }))

    // ── Top products (from logs) ─────────────────────────────────────
    const productMap: Record<string, { name: string; qty: number; revenue: number; cogs: number }> = {}
    for (const r of rows) {
      if (!productMap[r.name]) productMap[r.name] = { name: r.name, qty: 0, revenue: 0, cogs: 0 }
      productMap[r.name].qty     += r.qty
      productMap[r.name].revenue += r.revenue
      productMap[r.name].cogs    += r.cogs
    }
    const top_products = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({ ...p, profit: p.revenue - p.cogs, margin: p.revenue > 0 ? (p.revenue - p.cogs) / p.revenue : 0 }))

    // ── Inventory value (always current) ────────────────────────────
    let inventoryValue = 0
    let totalProcured  = 0
    try {
      let ivq = supabase.from('products_with_stock').select('remaining_stock, total_cost_with_handling, stock_quantity')
      const ids = await getBrandIds(brand)
      if (ids !== null) {
        if (ids.length > 0) ivq = ivq.in('id', ids)
        else ivq = ivq.in('id', [])
      }
      const { data: ivData } = await ivq
      for (const p of (ivData ?? []) as any[]) {
        inventoryValue += (p.total_cost_with_handling ?? 0) * (p.remaining_stock ?? 0)
        totalProcured  += (p.total_cost_with_handling ?? 0) * (p.stock_quantity ?? 0)
      }
    } catch { /* ignore */ }

    return NextResponse.json({
      summary: {
        revenue:          summaryRevenue,
        cogs:             summaryCogs,
        profit:           summaryProfit,
        margin:           summaryRevenue > 0 ? summaryProfit / summaryRevenue : 0,
        qty:              summaryQty,
        expenses:         totalExpenses,
        net_profit:       summaryProfit - totalExpenses,
        inventory_value:  inventoryValue,
        total_procured:   totalProcured,
        purchased_amount: totalPurchased,
        purchased_qty:    purchaseQty,
      },
      by_month,
      top_products,
      used_baseline: usedBaseline,
    })
  } catch (err) {
    console.error('reports error', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
