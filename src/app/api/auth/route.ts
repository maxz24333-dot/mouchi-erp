import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'mouchi_auth'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    const expected = process.env.SITE_PASSWORD

    if (!expected || password !== expected) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE, btoa(password), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(COOKIE)
  return res
}
