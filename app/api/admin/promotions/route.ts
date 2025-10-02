import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('promozioni')
      .select(`
        id,
        name,
        valid_until,
        numero_scan,
        numero_attivazioni,
        prezzo,
        locali (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const mapped = (data || []).map(p => {
      const locale = Array.isArray(p.locali) ? p.locali[0] : p.locali
      const prezzo = Number(p.prezzo ?? 0)
      const attivazioni = Number(p.numero_attivazioni ?? 0)
      return {
        id: p.id,
        nome: p.name,
        scansioni: Number(p.numero_scan ?? 0),
        numero_attivazioni: attivazioni,
        prezzo,
        guadagno: prezzo * attivazioni * 0.1,
        locale: locale ? { id: locale.id, nome: locale.name } : null,
        attiva: p.valid_until ? new Date(p.valid_until) >= new Date() : true,
      }
    })

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('Errore lettura promozioni:', err)
    const message =
      err instanceof Error ? err.message : 'Errore lettura promozioni'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
