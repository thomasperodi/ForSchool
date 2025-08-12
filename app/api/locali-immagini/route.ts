// app/api/locali-immagini/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClientAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale_id = searchParams.get('locale_id');
    if (!locale_id) {
      return NextResponse.json({ error: "locale_id query param is required" }, { status: 400 });
    }

    // Listo i file nella cartella locali/[locale_id]
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('skoolly')
      .list(`locali/${locale_id}`, {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    // Filtro solo immagini jpg, jpeg, png
    const imageFiles = files?.filter(file => /\.(jpg|jpeg|png)$/i.test(file.name)) ?? [];

    // Creo URL pubblici per ogni immagine
    const imagesUrls = imageFiles.map(file =>
      supabaseAdmin.storage.from('skoolly').getPublicUrl(`locali/${locale_id}/${file.name}`).data.publicUrl
    );

    return NextResponse.json({ images: imagesUrls });
  } catch (error) {
    console.error("Errore API locali-immagini:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
