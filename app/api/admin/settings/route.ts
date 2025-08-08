import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Esempio salvataggio in una tabella 'impostazioni' (creala se non esiste) con singola riga id='global'
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { commissione, domini, brand } = body
    const { error } = await supabase
      .from('impostazioni')
      .upsert({ id: 'global', commissione, domini, brand }, { onConflict: 'id' })
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore salvataggio impostazioni' }, { status: 500 })
  }
}

