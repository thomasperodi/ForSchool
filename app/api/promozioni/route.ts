import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  // Torna tutte le promozioni (per esempio potresti aggiungere filtro su locale_id)
  const { data, error } = await supabase
    .from('promozioni')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  const {
    locale_id,
    name,
    description,
    valid_until,
  } = body

  if (!locale_id || !name) {
    return NextResponse.json({ error: 'locale_id e name sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('promozioni')
    .insert({
      locale_id,
      name,
      description,
      valid_until,
      numero_attivazioni: 0,
      numero_scan: 0
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
