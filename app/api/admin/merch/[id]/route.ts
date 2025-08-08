import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase.from('prodotti_merch').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message || 'Errore eliminazione prodotto' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Errore eliminazione prodotto' },
      { status: 500 }
    )
  }
}
