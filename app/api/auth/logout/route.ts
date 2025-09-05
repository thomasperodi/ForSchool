import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  try {
    // 1. Await la createClient() perché è async
    const supabase = await createClient()
    await supabase.auth.signOut()

    const res = NextResponse.json({ ok: true })
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    res.cookies.delete('sk-auth')
    return res
  } catch (err) {
    console.error('Errore logout:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
