import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const updates: { disponibile?: boolean } = {}
    if (typeof body.approvata === 'boolean') updates.disponibile = body.approvata

    const { data, error } = await supabase
      .from('ripetizioni')
      .update(updates)
      .eq('id', id)
      .select('id, disponibile')
      .single()

    if (error) throw error

    return NextResponse.json({ id: data.id, approvata: data.disponibile })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message || 'Errore aggiornamento ripetizione' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Errore aggiornamento ripetizione' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase.from('ripetizioni').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message || 'Errore eliminazione ripetizione' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Errore eliminazione ripetizione' },
      { status: 500 }
    )
  }
}
