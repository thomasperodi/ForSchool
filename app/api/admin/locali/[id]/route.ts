import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { name, category, address, image_url, latitudine, longitudine, user_id } = body as {
      name?: string; category?: string; address?: string | null; image_url?: string | null; latitudine?: number | null; longitudine?: number | null; user_id?: string | null
    }
    const updates: Record<string, unknown> = {}
    if (typeof name === 'string') updates.name = name
    if (typeof category === 'string') updates.category = category
    if (address !== undefined) updates.address = address
    if (image_url !== undefined) updates.image_url = image_url
    if (latitudine !== undefined) updates.latitudine = latitudine
    if (longitudine !== undefined) updates.longitudine = longitudine
    if (user_id !== undefined) updates.user_id = user_id

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })

    const { data, error } = await supabase
      .from('locali')
      .update(updates)
      .eq('id', params.id)
      .select('id,name,category,address,image_url,latitudine,longitudine,user_id')
      .single()
    if (error) throw error

    let user = null as null | { id: string; nome: string; email: string }
    if (data.user_id) {
      const { data: u } = await supabase.from('utenti').select('id,nome,email').eq('id', data.user_id).single()
      if (u) user = { id: u.id, nome: u.nome, email: u.email }
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      category: data.category,
      address: data.address,
      image_url: data.image_url,
      latitudine: data.latitudine,
      longitudine: data.longitudine,
      user,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore aggiornamento locale'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase.from('locali').delete().eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore eliminazione locale'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


