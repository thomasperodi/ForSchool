import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  // Esempio: crea un post broadcast (categoria = 'broadcast')
  const { data, error } = await supabase.from('forum_post').insert([{ titolo: 'Broadcast', contenuto: message, categoria: 'broadcast' }]).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

