import { NextResponse } from 'next/server'

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)



export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale_id = url.searchParams.get('locale_id');

  if (!locale_id) {
    return NextResponse.json({ error: 'locale_id è obbligatorio nei parametri' }, { status: 400 });
  }

  // 1) Prendo le promozioni
  const { data: promozioni, error: promoError } = await supabaseAdmin
    .from('promozioni')
    .select('*')
    .eq('locale_id', locale_id)
    .order('created_at', { ascending: false });

  if (promoError) return NextResponse.json({ error: promoError.message }, { status: 500 });

  // 2) Listo i file nella cartella locali/[locale_id]
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from('skoolly')
    .list(`locali/${locale_id}`, {
      limit: 100,
      offset: 0,
    });

  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

  // 3) Filtro solo immagini con estensione jpg, jpeg, png
  const imageFiles = files?.filter(file => /\.(jpg|jpeg|png)$/i.test(file.name)) ?? [];

  // 4) Creo URL pubblici per ogni immagine
  const imagesUrls = imageFiles.map(file =>
    supabaseAdmin.storage.from('skoolly').getPublicUrl(`locali/${locale_id}/${file.name}`).data.publicUrl
  );

  // 5) Associo array immagini a ogni promozione
  const promozioniConImmagini = promozioni?.map(promo => ({
    ...promo,
    images_urls: imagesUrls,
  }));

  return NextResponse.json(promozioniConImmagini);
}




export async function POST(request: Request) {
  const body = await request.json()

  const {
    locale_id,
    name,
    description,
    valid_until,
  } = body

  if (!locale_id || !name) {
    return NextResponse.json({ error: 'locale_id e name sono obbligatori' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('promozioni')
    .insert({
      locale_id,
      name,
      description,
      valid_until,
      numero_attivazioni: 0,
      numero_scan: 0
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
