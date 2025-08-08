import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('forum_post')
      .select('id,titolo,contenuto')
    if (error) throw error

    // Conteggio commenti
    const ids = (data || []).map(p => p.id)
    let counts: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: comm, error: errC } = await supabase
        .from('forum_commenti')
        .select('post_id')
        .in('post_id', ids)
      if (errC) throw errC
      counts = (comm || []).reduce((acc: Record<string, number>, c: any) => { acc[c.post_id] = (acc[c.post_id] || 0) + 1; return acc }, {})
    }

    const mapped = (data || []).map(p => ({ id: p.id, titolo: p.titolo, messaggi: counts[p.id] || 0, segnalato: false }))
    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore lettura forum' }, { status: 500 })
  }
}

