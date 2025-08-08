import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface RouteParams {
  params: { id: string }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { error } = await supabase
      .from('eventi')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: err.message || 'Errore eliminazione evento' },
        { status: 500 }
      )
    }
    return NextResponse.json(
      { error: 'Errore eliminazione evento' },
      { status: 500 }
    )
  }
}
