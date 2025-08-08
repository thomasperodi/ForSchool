import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Salva la prenotazione e restituisce il link WhatsApp al tutor
export async function POST(req: NextRequest) {
  try {
    const { ripetizione_id, studente_id, orario_richiesto } = await req.json()
    if (!ripetizione_id || !studente_id || !orario_richiesto) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 })
    }

    // Recupera dati ripetizione per ottenere telefono tutor e materia
    const { data: rip, error: errRip } = await supabase
      .from('ripetizioni')
      .select('id, materia, descrizione, prezzo_ora, tutor_id, telefono')
      .eq('id', ripetizione_id)
      .single()
    if (errRip || !rip) throw errRip || new Error('Ripetizione non trovata')

    // Recupera dati studente per nome/email
    const { data: stud, error: errStud } = await supabase
      .from('utenti')
      .select('id, nome, email')
      .eq('id', studente_id)
      .single()
    if (errStud || !stud) throw errStud || new Error('Studente non trovato')

    // Salva prenotazione (senza pagamento)
    const { error: errIns } = await supabase
      .from('prenotazioni_ripetizioni')
      .insert([{ ripetizione_id, studente_id, orario_richiesto, stato: 'in attesa' }])
    if (errIns) throw errIns

    // Prepara URL WhatsApp (usa numero internazionale senza + opzionale)
    const raw = (rip.telefono || '').replace(/\D/g, '')
    if (!raw) return NextResponse.json({ error: 'Telefono tutor non disponibile' }, { status: 400 })

    const msg = `Ciao! Sono ${stud.nome} (${stud.email}). Vorrei prenotare una ripetizione di ${rip.materia} per il ${orario_richiesto.replace('T',' alle ')}. Grazie!`
    const whatsappUrl = `https://wa.me/${raw}?text=${encodeURIComponent(msg)}`
    return NextResponse.json({ ok: true, whatsappUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore prenotazione'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


