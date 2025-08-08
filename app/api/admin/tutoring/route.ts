import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ripetizioni')
      .select('id, tutor_id, materia, data_pubblicazione, prezzo_ora, disponibile')
    if (error) throw error

    // pagamento: da tabella pagamenti con tipo_acquisto='ripetizione' e riferimento_id = ripetizione.id
    const ids = (data || []).map(r => r.id)
    let pagate: Set<string> = new Set()
    if (ids.length > 0) {
      const { data: pays, error: errP } = await supabase
        .from('pagamenti')
        .select('riferimento_id, stato, tipo_acquisto')
        .in('riferimento_id', ids)
      if (errP) throw errP
      pagate = new Set((pays || []).filter(p => p.tipo_acquisto === 'ripetizione' && p.stato === 'pagato').map(p => p.riferimento_id))
    }

    // Nome tutor da tabella utenti
    const tutorIds = Array.from(new Set((data || []).map(r => r.tutor_id).filter(Boolean)))
    const tutorsMap: Record<string, string> = {}
    if (tutorIds.length > 0) {
      const { data: tutors, error: errT } = await supabase
        .from('utenti')
        .select('id,nome')
        .in('id', tutorIds)
      if (errT) throw errT
      for (const t of tutors || []) tutorsMap[t.id] = t.nome
    }

    const mapped = (data || []).map(r => ({
      id: r.id,
      tutor: tutorsMap[String(r.tutor_id)] || r.tutor_id || 'Tutor',
      materia: r.materia,
      orario: r.data_pubblicazione || '',
      approvata: r.disponibile ?? false,
      pagata: pagate.has(r.id),
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message || 'Errore lettura ripetizioni' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Errore lettura ripetizioni' }, { status: 500 })
  }
}

