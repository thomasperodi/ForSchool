// app/api/checkout-ripetizione/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // aggiornato per corrispondere al tipo richiesto
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ripetizione_id, studente_id, orario_richiesto } = body;

  // 1. Prendi dati ripetizione
  const { data: ripetizione, error: ripErr } = await supabase
    .from('ripetizioni')
    .select('id, materia, prezzo_ora, tutor_id')
    .eq('id', ripetizione_id)
    .single();

  if (ripErr || !ripetizione) {
    return NextResponse.json({ error: 'Ripetizione non trovata' }, { status: 400 });
  }

  if (!ripetizione.prezzo_ora) {
    return NextResponse.json({ error: 'Prezzo non definito' }, { status: 400 });
  }

  // 2. Crea prenotazione in attesa
  const { data: prenotazione, error: prenErr } = await supabase
    .from('prenotazioni_ripetizioni')
    .insert({
      ripetizione_id,
      studente_id,
      orario_richiesto,
      stato: 'in attesa',
      data_prenotazione: new Date().toISOString(),
    })
    .select()
    .single();

  if (prenErr || !prenotazione) {
    return NextResponse.json({ error: 'Errore creazione prenotazione' }, { status: 500 });
  }

  // 3. Crea sessione Stripe Checkout
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Ripetizione: ${ripetizione.materia}`,
            },
            unit_amount: Math.round(Number(ripetizione.prezzo_ora) * 100), // in centesimi
          },
          quantity: 1,
        },
      ],
      metadata: {
        prenotazione_id: prenotazione.id,
        studente_id,
        ripetizione_id,
      },
      success_url: `${req.nextUrl.origin}/ripetizioni/pagamento-successo?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/ripetizioni/pagamento-cancellato`,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Errore creazione sessione Stripe:', err);
    return NextResponse.json({ error: 'Errore durante la creazione del pagamento' }, { status: 500 });
  }
}
