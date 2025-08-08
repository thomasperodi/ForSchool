import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { nome, ruolo } = body
    const updates: Record<string, unknown> = {}
    if (typeof nome === 'string') updates.nome = nome
    if (typeof ruolo === 'string') updates.ruolo = ruolo

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('utenti')
      .update(updates)
      .eq('id', params.id)
      .select('id,nome,email,ruolo,notifiche,scuola_id')
      .single()

    if (error) throw error

    // Includi dati scuola aggiornati
    let scuola: { id: string; nome: string | null } | null = null
    if (data?.scuola_id) {
      const { data: sc, error: errS } = await supabase.from('scuole').select('id,nome').eq('id', data.scuola_id).single()
      if (!errS && sc) scuola = { id: sc.id, nome: sc.nome }
    }

    return NextResponse.json({ id: data.id, nome: data.nome, email: data.email, ruolo: data.ruolo, isActive: data.notifiche ?? true, scuola })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore aggiornamento utente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from('utenti').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore eliminazione utente' }, { status: 500 })
  }
}

