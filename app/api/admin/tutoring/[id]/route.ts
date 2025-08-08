import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const updates: any = {}
    if (typeof body.approvata === 'boolean') updates.disponibile = body.approvata
    const { data, error } = await supabase
      .from('ripetizioni')
      .update(updates)
      .eq('id', params.id)
      .select('id, disponibile')
      .single()
    if (error) throw error
    return NextResponse.json({ id: data.id, approvata: data.disponibile })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore aggiornamento ripetizione' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from('ripetizioni').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore eliminazione ripetizione' }, { status: 500 })
  }
}

