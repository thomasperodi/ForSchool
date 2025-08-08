import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

type LocaleRecord = {
  id: string
  user_id: string | null
  name: string
  category: string
  address: string | null
  image_url: string | null
  latitudine: number | null
  longitudine: number | null
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('locali')
      .select('id,user_id,name,category,address,image_url,latitudine,longitudine')
    if (error) throw error

    const rows: LocaleRecord[] = data || []
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean) as string[]))
    const usersMap: Record<string, { id: string; nome: string; email: string }> = {}
    if (userIds.length > 0) {
      const { data: utenti, error: errU } = await supabase
        .from('utenti')
        .select('id,nome,email')
        .in('id', userIds)
      if (errU) throw errU
      for (const u of utenti || []) usersMap[u.id] = { id: u.id, nome: u.nome, email: u.email }
    }

    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      address: r.address,
      image_url: r.image_url,
      latitudine: r.latitudine,
      longitudine: r.longitudine,
      user: r.user_id ? usersMap[r.user_id] ?? null : null,
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore lettura locali'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, address, user_id, image_url, latitudine, longitudine } = body as {
      name: string; category: string; address?: string; user_id?: string; image_url?: string | null; latitudine?: number | null; longitudine?: number | null
    }
    if (!name || !category || !user_id) return NextResponse.json({ error: 'name, category e user_id sono obbligatori' }, { status: 400 })

    const { data, error } = await supabase
      .from('locali')
      .insert([{ name, category, address: address ?? null, user_id, image_url: image_url ?? null, latitudine: latitudine ?? null, longitudine: longitudine ?? null }])
      .select('id,name,category,address,image_url,latitudine,longitudine,user_id')
      .single()
    if (error) throw error

    // Include eventuale user assegnato
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
    const message = err instanceof Error ? err.message : 'Errore creazione locale'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


