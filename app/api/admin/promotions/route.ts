import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('promozioni')
      .select('id,name,valid_until,numero_scan')
    if (error) throw error

    const mapped = (data || []).map(p => ({
      id: p.id,
      nome: p.name,
      scansioni: Number(p.numero_scan ?? 0),
      attiva: Boolean(p.valid_until ? new Date(p.valid_until) >= new Date() : true),
    }))

    return NextResponse.json(mapped)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Errore lettura promozioni' }, { status: 500 })
  }
}

