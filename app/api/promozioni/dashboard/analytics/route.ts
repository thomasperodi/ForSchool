import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const locale_id = searchParams.get('locale_id')

  if (!locale_id) {
    return NextResponse.json(
      { error: "locale_id is required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .rpc('get_all_promo_stats', { p_locale_id: locale_id })

  if (error) {
    // Loggare errore completo su console server
    console.error("Errore supabase RPC:", error)

    // Rispondere con dettagli errore (anche codice e hint se disponibili)
    return NextResponse.json(
      {
        error: error.message,
        details: error.details || null,
        hint: error.hint || null,
        code: error.code || null
      },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
