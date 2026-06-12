import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

  try {
    const wb = XLSX.utils.book_new()

    // ── Sheet 1: 出貨紀錄 ────────────────────────────────────────────
    const salesRows: any[] = []
    if (brand === 'all' || brand === 'mouchi') {
      try {
        let q = supabase.from('sales_logs')
          .select('*, products(ai_suggested_name, product_name)')
          .order('created_at', { ascending: false })
          .eq('brand', 'mouchi')
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
        const { data } = await q
        for (const r of (data ?? []) as any[]) {
          salesRows.push({
            '日期': r.created_at?.slice(0, 10),
            '商品': r.products?.ai_suggested_name || r.products?.product_name || '',
            '數量': r.quantity,
            '售價': r.unit_price ?? '',
            '成本': r.cost_per_unit ?? '',
            '毛利': r.unit_price && r.cost_per_unit ? Math.round((r.unit_price - r.cost_per_unit) * r.quantity) : '',
            '品牌': 'MOUCHI零售',
          })
        }
      } catch {}
    }
    if (brand === 'all' || brand === 'wholesale') {
      try {
        let q = supabase.from('shipment_logs')
          .select('*, products(ai_suggested_name, product_name, total_cost_with_handling)')
          .order('created_at', { ascending: false })
          .eq('brand', 'wholesale')
        if (from) q = q.gte('created_at', from)
        if (to)   q = q.lte('created_at', to + 'T23:59:59Z')
        const { data } = await q
        for (const r of (data ?? []) as any[]) {
          salesRows.push({
            '日期': r.created_at?.slice(0, 10),
            '商品': r.products?.ai_suggested_name || r.products?.product_name || '',
            '數量': r.quantity,
            '售價': r.unit_price ?? '',
            '成本': r.products?.total_cost_with_handling ?? '',
            '毛利': r.unit_price && r.products?.total_cost_with_handling
              ? Math.round((r.unit_price - r.products.total_cost_with_handling) * r.quantity) : '',
            '品牌': '批發倉',
            '買家': r.buyer ?? '',
          })
        }
      } catch {}
    }

    // ── Sheet 2: 進貨紀錄 ────────────────────────────────────────────
    const purRows: any[] = []
    try {
      let q = supabase.from('purchase_logs')
        .select('*, products(ai_suggested_name, product_name)')
        .order('date', { ascending: false })
      if (brand !== 'all') q = q.eq('brand', brand)
      if (from) q = q.gte('date', from)
      if (to)   q = q.lte('date', to)
      const { data } = await q
      for (const r of (data ?? []) as any[]) {
        purRows.push({
          '日期': r.date,
          '商品': r.products?.ai_suggested_name || r.products?.product_name || r.note || '',
          '數量': r.quantity,
          '單件成本 NT$': r.unit_cost ?? '',
          '合計 NT$': r.unit_cost ? Math.round(r.unit_cost * r.quantity) : '',
          '供應商': r.supplier ?? '',
          '品牌': r.brand,
        })
      }
    } catch {}

    // ── Sheet 3: 開銷紀錄 ────────────────────────────────────────────
    const expRows: any[] = []
    try {
      let q = supabase.from('expenses').select('*').order('date', { ascending: false })
      if (brand !== 'all') q = q.eq('brand', brand)
      if (from) q = q.gte('date', from)
      if (to)   q = q.lte('date', to)
      const { data } = await q
      for (const e of (data ?? []) as any[]) {
        expRows.push({
          '日期': e.date,
          '類別': e.category,
          '金額 NT$': e.amount,
          '備註': e.note ?? '',
          '品牌': e.brand,
        })
      }
    } catch {}

    // ── Sheet 4: 庫存總覽 ────────────────────────────────────────────
    const invRows: any[] = []
    try {
      let q = supabase.from('products_with_stock').select('*').order('created_at', { ascending: false })
      const ids = await getBrandIds(brand)
      if (ids !== null) {
        if (ids.length > 0) q = q.in('id', ids)
        else q = q.in('id', [])
      }
      const { data } = await q
      for (const p of (data ?? []) as any[]) {
        invRows.push({
          '商品名': p.ai_suggested_name || p.product_name || '',
          '編號': p.product_code ?? '',
          '落地成本': p.total_cost_with_handling ?? '',
          '賣價': p.my_selling_price ?? '',
          '毛利率': p.profit_margin != null ? `${(p.profit_margin * 100).toFixed(1)}%` : '',
          '進貨量': p.stock_quantity ?? '',
          '已售': p.sold_quantity ?? '',
          '庫存': p.remaining_stock ?? '',
          '在庫值': p.total_cost_with_handling && p.remaining_stock
            ? Math.round(p.total_cost_with_handling * p.remaining_stock) : '',
        })
      }
    } catch {}

    // Append sheets (skip if empty)
    const addSheet = (name: string, rows: any[], cols: { wch: number }[]) => {
      if (rows.length === 0) return
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = cols
      XLSX.utils.book_append_sheet(wb, ws, name)
    }

    addSheet('出貨紀錄', salesRows, [{ wch:12},{wch:28},{wch:8},{wch:10},{wch:10},{wch:10},{wch:10},{wch:12}])
    addSheet('進貨紀錄', purRows,   [{ wch:12},{wch:28},{wch:8},{wch:12},{wch:12},{wch:16},{wch:10}])
    addSheet('開銷紀錄', expRows,   [{ wch:12},{wch:12},{wch:12},{wch:20},{wch:10}])
    addSheet('庫存總覽', invRows,   [{ wch:28},{wch:12},{wch:12},{wch:10},{wch:10},{wch:8},{wch:8},{wch:8},{wch:12}])

    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 提示: '此期間無資料' }]), '報表')
    }

    const buf  = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const date = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''MOUCHI_%E5%A0%B1%E8%A1%A8_${date}.xlsx`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
