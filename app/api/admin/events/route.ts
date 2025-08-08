import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('eventi')
      .select('id, nome, data, descrizione, locandina_url')

    if (error) throw error

    // Calcolo iscritti da tabella biglietti (eventi -> biglietti evento_id)
    const ids = (data || []).map(e => e.id)
    let iscrittiByEvento: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: biglietti, error: errB } = await supabase
        .from('biglietti')
        .select('evento_id')
        .in('evento_id', ids)
      if (errB) throw errB
      iscrittiByEvento = (biglietti || []).reduce((acc: Record<string, number>, b: any) => {
        acc[b.evento_id] = (acc[b.evento_id] || 0) + 1
        return acc
      }, {})
    }

    const mapped = (data || []).map(e => ({
      id: e.id,
      titolo: e.nome,
      data: e.data,
      luogo: e.descrizione ?? '',
      iscritti: iscrittiByEvento[e.id] || 0,
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore lettura eventi' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { titolo, data, luogo } = body
    if (!titolo || !data) return NextResponse.json({ error: 'titolo e data obbligatori' }, { status: 400 })

    const { data: inserted, error } = await supabase
      .from('eventi')
      .insert([{ nome: titolo, data, descrizione: luogo }])
      .select('id, nome, data, descrizione')
      .single()
    if (error) throw error

    return NextResponse.json({ id: inserted.id, titolo: inserted.nome, data: inserted.data, luogo: inserted.descrizione ?? '', iscritti: 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore creazione evento' }, { status: 500 })
  }
}

