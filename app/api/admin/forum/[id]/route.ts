import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from('forum_post').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message || 'Errore eliminazione post' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Errore eliminazione post' }, { status: 500 })
  }
}

