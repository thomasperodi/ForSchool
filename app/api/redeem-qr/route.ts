import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { promoId } = await req.json();

    if (!promoId) {
      return NextResponse.json({ error: 'L\'ID della promozione è richiesto.' }, { status: 400 });
    }

    // 1. Verifica l'esistenza e la validità della promozione
    const { data: promo, error: fetchError } = await supabase
      .from('promozioni')
      .select('*')
      .eq('id', promoId)
      .single();

    if (fetchError || !promo) {
      return NextResponse.json({ error: 'Promozione non trovata.' }, { status: 404 });
    }

    const today = new Date().toISOString();
    if (promo.validUntil && promo.validUntil < today) {
      return NextResponse.json({ error: 'La promozione è scaduta.' }, { status: 403 });
    }

    // 2. Esegui la transazione: incrementa il numero di attivazioni
    const { error: updateError } = await supabase
      .from('promozioni')
      .update({ numero_attivazioni: promo.numero_attivazioni + 1 })
      .eq('id', promoId);

    if (updateError) {
      console.error('Errore nell\'aggiornamento del database:', updateError);
      return NextResponse.json({ error: 'Impossibile aggiornare la promozione.' }, { status: 500 });
    }

    // 3. Rispondi al client con un messaggio di successo
    return NextResponse.json({ success: true, message: 'Promozione riscattata con successo!' }, { status: 200 });

  } catch (err) {
    console.error('Errore generico dell\'API:', err);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}