
import { NextRequest, NextResponse } from "next/server";

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { locale_id, images } = body as { locale_id: string; images: string[] }
    if (!locale_id || !images || !images.length) {
      return NextResponse.json({ error: 'locale_id e immagini obbligatorie' }, { status: 400 })
    }

    const uploadedUrls: string[] = []

    for (let i = 0; i < images.length; i++) {
      const base64 = images[i]
      const base64Data = base64.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const filename = `locali/${locale_id}/${Date.now()}_${i}.png`

const { data, error } = await supabaseAdmin.storage.from('skoolly').upload(filename, buffer, {
  contentType: 'image/png',
  upsert: false,
})
if (error) throw error

const url = supabaseAdmin.storage.from('skoolly').getPublicUrl(filename).data.publicUrl

const { error: errInsert } = await supabaseAdmin
  .from('locali_immagini')
  .insert([{ locale_id, filename }])
if (errInsert) throw errInsert

uploadedUrls.push(url)

    }

    return NextResponse.json({ uploadedUrls })
  } catch (err) {
    console.error('Errore upload immagini:', err) // <--- qui il log dettagliato
    const message = err instanceof Error ? err.message : 'Errore upload immagini'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
