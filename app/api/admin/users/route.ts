import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1') // pagina 1 di default
    const limit = parseInt(url.searchParams.get('limit') || '20') // 20 utenti per pagina
    const offset = (page - 1) * limit

    const { data, error } = await supabase
      .from('utenti')
      .select('id,nome,email,ruolo,notifiche,scuola_id')
      .range(offset, offset + limit - 1) // range per paginazione

    if (error) throw error

    const utenti = data || []
    const scuolaIds = Array.from(new Set(utenti.map(u => u.scuola_id).filter(Boolean) as string[]))

    const scuoleMap: Record<string, { id: string; nome: string | null }> = {}
    if (scuolaIds.length > 0) {
      const { data: scuole, error: errScuole } = await supabase
        .from('scuole')
        .select('id,nome')
        .in('id', scuolaIds)
      if (errScuole) throw errScuole
      for (const s of scuole || []) {
        scuoleMap[s.id] = { id: s.id, nome: s.nome }
      }
    }

    const mapped = utenti.map(u => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      ruolo: u.ruolo,
      isActive: u.notifiche ?? true,
      scuola: u.scuola_id ? (scuoleMap[u.scuola_id] || { id: u.scuola_id, nome: null }) : null,
    }))

    return NextResponse.json({
      page,
      limit,
      count: mapped.length,
      utenti: mapped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore lettura utenti'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, email, ruolo } = body
    if (!nome || !email || !ruolo) {
      return NextResponse.json({ error: 'nome, email, ruolo sono obbligatori' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('utenti')
      .insert([{ nome, email, ruolo }])
      .select('id,nome,email,ruolo')
      .single()

    if (error) throw error

    const created = { ...data, isActive: true }
    return NextResponse.json(created)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore creazione utente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
