import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products_with_stock')
      .select('my_selling_price, total_cost_with_handling, stock_quantity, sold_quantity, remaining_stock, strategy_tag, created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const products = data ?? []
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const thisMonth = products.filter(p => p.created_at >= monthStart)

    const totalRevenue = products.reduce((s: number, p: any) =>
      s + (p.my_selling_price ?? 0) * p.sold_quantity, 0)
    const totalCost = products.reduce((s: number, p: any) =>
      s + p.total_cost_with_handling * p.sold_quantity, 0)
    const totalProfit = totalRevenue - totalCost
    const overallMargin = totalRevenue > 0 ? totalProfit / totalRevenue : 0

    const monthRevenue = thisMonth.reduce((s: number, p: any) =>
      s + (p.my_selling_price ?? 0) * p.sold_quantity, 0)
    const monthCost = thisMonth.reduce((s: number, p: any) =>
      s + p.total_cost_with_handling * p.sold_quantity, 0)

    return NextResponse.json({
      total_products: products.length,
      total_stock: products.reduce((s: number, p: any) => s + p.remaining_stock, 0),
      low_stock_count: products.filter((p: any) => p.remaining_stock > 0 && p.remaining_stock < 3).length,
      sold_out_count: products.filter((p: any) => p.remaining_stock === 0 && p.stock_quantity > 0).length,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      overall_margin: overallMargin,
      month_revenue: monthRevenue,
      month_profit: monthRevenue - monthCost,
      strategy_counts: {
        lead: products.filter((p: any) => p.strategy_tag === 'lead').length,
        profit: products.filter((p: any) => p.strategy_tag === 'profit').length,
        skip: products.filter((p: any) => p.strategy_tag === 'skip').length,
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
