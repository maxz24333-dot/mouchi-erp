import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') || 'all'
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')

  try {
    type Row = { date: string; revenue: number; cogs: number; qty: number; name: string; brand: string }
    const rows: Row[] = []

    if (brand === 'all' || brand === 'mouchi') {
      let q = supabase
        .from('sales_logs')
        .select('created_at, quantity, unit_price, cost_per_unit, products(ai_suggested_name, product_name)')
        .eq('brand', 'mouchi')
      if (from) q = q.gte('created_at', from)
      if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
      const { data } = await q
      for (const r of (data ?? []) as any[]) {
        rows.push({
          date:    r.created_at,
          revenue: (r.unit_price ?? 0) * r.quantity,
          cogs:    (r.cost_per_unit ?? 0) * r.quantity,
          qty:     r.quantity,
          name:    r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
          brand:   'mouchi',
        })
      }
    }

    if (brand === 'all' || brand === 'wholesale') {
      let q = supabase
        .from('shipment_logs')
        .select('created_at, quantity, unit_price, products(ai_suggested_name, product_name, total_cost_with_handling)')
        .eq('brand', 'wholesale')
      if (from) q = q.gte('created_at', from)
      if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
      const { data } = await q
      for (const r of (data ?? []) as any[]) {
        rows.push({
          date:    r.created_at,
          revenue: (r.unit_price ?? 0) * r.quantity,
          cogs:    (r.products?.total_cost_with_handling ?? 0) * r.quantity,
          qty:     r.quantity,
          name:    r.products?.ai_suggested_name || r.products?.product_name || '未知商品',
          brand:   'wholesale',
        })
      }
    }

    const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
    const totalCogs    = rows.reduce((s, r) => s + r.cogs, 0)
    const totalProfit  = totalRevenue - totalCogs
    const totalQty     = rows.reduce((s, r) => s + r.qty, 0)

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

    return NextResponse.json({
      summary: {
        revenue: totalRevenue,
        cogs:    totalCogs,
        profit:  totalProfit,
        margin:  totalRevenue > 0 ? totalProfit / totalRevenue : 0,
        qty:     totalQty,
      },
      by_month,
      top_products,
    })
  } catch (err) {
    console.error('reports error', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
