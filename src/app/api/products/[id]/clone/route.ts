import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data: src, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !src) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = src
  const clone = {
    ...rest,
    product_name:      `${rest.product_name || ''} (複製)`.trim(),
    ai_suggested_name: rest.ai_suggested_name ? `${rest.ai_suggested_name} (複製)` : null,
    sold_quantity:     0,
    product_code:      null,
  }

  const { data, error: err } = await supabase.from('products').insert(clone).select().single()
  if (err) return NextResponse.json({ error: err.message }, { status: 500 })
  return NextResponse.json({ ...data, variants: [] }, { status: 201 })
}
