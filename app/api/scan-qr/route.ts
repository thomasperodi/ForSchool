import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { promoId, userId } = await req.json();

    if (!promoId || !userId) {
      return NextResponse.json({ error: 'promoId e userId sono obbligatori.' }, { status: 400 });
    }

    // 1. Verifica promozione esistente (non blocca se scaduta)
    const { data: promo, error: fetchError } = await supabase
      .from('promozioni')
      .select('*')
      .eq('id', promoId)
      .single();

    if (fetchError || !promo) {
      return NextResponse.json({ error: 'Promozione non trovata.' }, { status: 404 });
    }

    // 2. Inserisci nuova scansione
    const { error: insertError } = await supabase
      .from('scansioni_promozioni')
      .insert([{ utente_id: userId, promozione_id: promoId }]);

    if (insertError) {
      console.error('Errore inserimento scansione:', insertError);
      return NextResponse.json({ error: 'Errore durante il salvataggio della scansione.' }, { status: 500 });
    }

    // 3. Incrementa il numero_scan nella tabella promozioni
    const { error: updateError } = await supabase
      .from('promozioni')
      .update({ numero_scan: (promo.numero_scan || 0) + 1 })
      .eq('id', promoId);

    if (updateError) {
      console.error('Errore aggiornamento numero_scan:', updateError);
      return NextResponse.json({ error: 'Errore nell’aggiornamento della promozione.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Scansione registrata con successo!' }, { status: 200 });

  } catch (err) {
    console.error('Errore generico:', err);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}
