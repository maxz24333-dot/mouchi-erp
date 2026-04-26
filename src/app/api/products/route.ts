import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { uploadToR2 } from '@/lib/r2'

export async function GET() {
  const { data, error } = await supabase
    .from('products_with_stock')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image, image_mime_type, ...product } = body

    let imageUrl: string | null = null

    if (image) {
      try {
        imageUrl = await uploadToR2(image, image_mime_type || 'image/jpeg')
      } catch (uploadErr) {
        console.error('R2 upload failed:', uploadErr)
        // Continue without image rather than blocking entry
      }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, image_url: imageUrl })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
