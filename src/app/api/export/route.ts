import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

const SOURCE_LABEL: Record<string, string> = {
  thailand: '泰國',
  haido: '日本(海度)',
  mdm: '日本(MDM)',
  korea: '韓國',
  other: '其他',
}

const STRATEGY_LABEL: Record<string, string> = {
  lead: '引流品',
  profit: '利潤品',
  skip: '放棄',
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products_with_stock')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((p: any) => ({
      '商品編號': p.product_code ?? '',
      '品名': p.product_name ?? '',
      '販售名': p.ai_suggested_name ?? '',
      '來源': SOURCE_LABEL[p.source] ?? p.source ?? '',
      '原始成本': p.original_price ?? '',
      '幣別': p.currency ?? '',
      '台幣成本': p.twd_cost ?? '',
      '運費(元)': p.shipping_cost ?? '',
      '包裝費(元)': p.packaging_fee ?? '',
      '服務費(元)': p.service_fee ?? '',
      '成本總計(含手續費)': p.total_cost_with_handling ?? '',
      '我的賣價': p.my_selling_price ?? '',
      '毛利率%': p.my_selling_price && p.total_cost_with_handling
        ? (((p.my_selling_price - p.total_cost_with_handling) / p.my_selling_price) * 100).toFixed(1)
        : '',
      '市場行情低': p.market_price_low ?? '',
      '市場行情高': p.market_price_high ?? '',
      '市場行情均': p.market_price_avg ?? '',
      '進貨量': p.stock_quantity ?? '',
      '銷貨量': p.sold_quantity ?? '',
      '庫存量': p.remaining_stock ?? '',
      '戰略標籤': STRATEGY_LABEL[p.strategy_tag] ?? p.strategy_tag ?? '',
      '備註': p.notes ?? '',
      '入庫日期': p.created_at ? new Date(p.created_at).toLocaleDateString('zh-TW') : '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '庫存總表')

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 12 },
      { wch: 10 }, { wch: 6 },  { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 8 },  { wch: 8 },  { wch: 8 },  { wch: 10 },
      { wch: 20 }, { wch: 12 },
    ]

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const date = new Date().toLocaleDateString('zh-TW').replace(/\//g, '-')

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''MOUCHI_%E5%BA%AB%E5%AD%98_${date}.xlsx`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
