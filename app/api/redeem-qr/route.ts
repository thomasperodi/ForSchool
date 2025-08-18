import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { promoId, userId } = await req.json();

    if (!promoId || !userId) {
      return NextResponse.json({ error: 'promoId e userId sono obbligatori.' }, { status: 400 });
    }

    // 1. Verifica promozione esistente e valida
    const { data: promo, error: fetchError } = await supabase
      .from('promozioni')
      .select('*')
      .eq('id', promoId)
      .single();

    if (fetchError || !promo) {
      return NextResponse.json({ error: 'Promozione non trovata.' }, { status: 404 });
    }

    const today = new Date().toISOString();
    if (promo.valid_until && promo.valid_until < today) {
      return NextResponse.json({ error: 'La promozione è scaduta.' }, { status: 403 });
    }

    // 2. Recupera il piano di abbonamento attivo dell'utente
    // Se non ci sono abbonamenti attivi, il piano verrà di default impostato su "free".
    const { data: abbonamenti, error: abbonamentoError } = await supabase
      .from("abbonamenti")
      .select(`
        piani_abbonamento (
          nome
        )
      `)
      .eq("utente_id", userId) // Usa userId per la query
      .eq("stato", "active"); // Filtra solo gli abbonamenti attivi

    if (abbonamentoError) {
      console.error("Errore nel recupero dell'abbonamento per il riscatto:", abbonamentoError.message);
      return NextResponse.json(
        { error: "Errore nel recupero delle informazioni sull'abbonamento." },
        { status: 500 }
      );
    }

    let piano = "free"; // Default al piano "free"
    // Se l'utente ha un abbonamento attivo, imposta il piano sul suo nome.
    if (abbonamenti && abbonamenti.length > 0) {
      piano = abbonamenti[0].piani_abbonamento.nome.toLowerCase();
    }

    // 3. Controlla se l’utente ha già attivato questa promozione oggi,
    // ad eccezione degli utenti con piano "elite".
    if (piano !== "elitè") {
      const { data: existing, error: existingError } = await supabase
        .from('attivazioni_promozioni')
        .select('*')
        .eq('utente_id', userId)
        .eq('promozione_id', promoId)
        // Filtra solo le attivazioni fatte **oggi**
        .gte('data_attivazione', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lt('data_attivazione', new Date(new Date().setHours(24, 0, 0, 0)).toISOString())
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Promozione già attivata da questo utente oggi.' }, { status: 409 });
      }
    }

    // 4. Inserisci nuova attivazione
    const { error: insertError } = await supabase
      .from('attivazioni_promozioni')
      .insert([{ utente_id: userId, promozione_id: promoId }]);

    if (insertError) {
      console.error('Errore inserimento attivazione:', insertError);
      return NextResponse.json({ error: 'Errore durante il salvataggio dell’attivazione.' }, { status: 500 });
    }

    // 5. Incrementa il numero_attivazioni
    const { error: updateError } = await supabase
      .from('promozioni')
      .update({ numero_attivazioni: (promo.numero_attivazioni || 0) + 1 })
      .eq('id', promoId);

    if (updateError) {
      console.error('Errore aggiornamento numero_attivazioni:', updateError);
      return NextResponse.json({ error: 'Errore nell’aggiornamento della promozione.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Promozione riscattata con successo!' }, { status: 200 });

  } catch (err) {
    console.error('Errore generico nel POST /api/promozioni/redeem:', err);
    return NextResponse.json({ error: 'Errore interno del server.' }, { status: 500 });
  }
}