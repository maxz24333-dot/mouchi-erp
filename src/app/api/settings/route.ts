import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getOrCreateSettings() {
  const { data, error } = await supabase.from('settings').select('*').limit(1).single()
  if (data) return data

  // No row exists — insert defaults
  const { data: created, error: insertError } = await supabase
    .from('settings')
    .insert({})
    .select()
    .single()

  if (insertError) throw new Error(insertError.message)
  return created
}

export async function GET() {
  try {
    const data = await getOrCreateSettings()
    return NextResponse.json(data)
  } catch (err) {
    console.error('settings GET error:', err)
    return NextResponse.json(null, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const existing = await getOrCreateSettings()

    const { data, error } = await supabase
      .from('settings')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('settings PATCH error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
