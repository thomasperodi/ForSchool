import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('prodotti_merch')
      .select('id,nome,prezzo')
    if (error) throw error

    // Varianti per prodotto
    const ids = (data || []).map(p => p.id)
    let variantiCount: Record<string, number> = {}
    let ordiniCount: Record<string, number> = {}
    if (ids.length > 0) {
      const { data: varianti, error: errV } = await supabase.from('varianti_prodotto_merch').select('prodotto_id').in('prodotto_id', ids)
      if (errV) throw errV
      variantiCount = (varianti || []).reduce((acc: Record<string, number>, v: { prodotto_id: string }) => { acc[v.prodotto_id] = (acc[v.prodotto_id] || 0) + 1; return acc }, {})

      const { data: ordini, error: errO } = await supabase.from('ordini_merch').select('prodotto_id').in('prodotto_id', ids)
      if (errO) throw errO
      ordiniCount = (ordini || []).reduce((acc: Record<string, number>, o: { prodotto_id: string }) => { acc[o.prodotto_id] = (acc[o.prodotto_id] || 0) + 1; return acc }, {})
    }

    const mapped = (data || []).map((p: { id: string; nome: string; prezzo: number }) => ({
      id: p.id,
      nome: p.nome,
      prezzo: Number(p.prezzo ?? 0),
      varianti: variantiCount[p.id] || 0,
      ordini: ordiniCount[p.id] || 0,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore lettura prodotti'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

