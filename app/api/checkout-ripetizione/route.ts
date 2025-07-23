import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Body ricevuto nel backend:', body);

    const { ripetizione_id, studente_id, orario_richiesto, importo } = body;

    if (!ripetizione_id || !studente_id || !orario_richiesto || !importo) {
      console.error('Dati mancanti nel body:', { ripetizione_id, studente_id, orario_richiesto, importo });
      return NextResponse.json({ error: 'Dati mancanti nel body' }, { status: 400 });
    }

    interface Utente {
      stripe_account_id: string | null;
    }

    interface Ripetizione {
      id: string;
      materia: string;
      prezzo_ora: number;
      tutor_id: string;
      utenti: Utente | Utente[];
    }

    // Recupera ripetizione con dati Stripe tutor
    const { data, error } = await supabase
  .from('ripetizioni')
  .select('id, materia, prezzo_ora, tutor_id, utenti(stripe_account_id)')
  .eq('id', ripetizione_id)
  .single();

const ripetizione = data as Ripetizione | null;



    if (error) {
      console.error('Errore recupero ripetizione:', error);
      return NextResponse.json({ error: 'Errore recupero ripetizione' }, { status: 500 });
    }

    if (!ripetizione) {
      console.error('Ripetizione non trovata per id:', ripetizione_id);
      return NextResponse.json({ error: 'Ripetizione non trovata' }, { status: 404 });
    }

    // Estrai stripe_account_id dal tutor
    let tutorStripeAccountId: string | undefined;

    if (Array.isArray(ripetizione.utenti)) {
      tutorStripeAccountId = ripetizione.utenti[0]?.stripe_account_id ?? undefined;
    } else {
      tutorStripeAccountId = ripetizione.utenti?.stripe_account_id ?? undefined;
    }

    if (!tutorStripeAccountId) {
      console.error('Stripe account tutor non trovato:', ripetizione.utenti);
      return NextResponse.json({ error: 'Account Stripe tutor non trovato' }, { status: 400 });
    }

    console.log('Ripetizione trovata:', ripetizione);

    // Crea prenotazione
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

    if (prenErr) {
      console.error('Errore creazione prenotazione:', prenErr);
      return NextResponse.json({ error: 'Errore creazione prenotazione' }, { status: 500 });
    }
    if (!prenotazione) {
      console.error('Prenotazione non creata');
      return NextResponse.json({ error: 'Prenotazione non creata' }, { status: 500 });
    }

    console.log('Prenotazione creata:', prenotazione);

    // Crea sessione Stripe con split payment
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
              unit_amount: Math.round(Number(importo) * 100),
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: 100, // €1 = 100 cent
          transfer_data: {
            destination: tutorStripeAccountId,
          },
        },
        metadata: {
          prenotazione_id: prenotazione.id,
          studente_id,
          ripetizione_id,
          commissione: '1',
          stripe_dest_account: tutorStripeAccountId,
          destinatario_id: ripetizione.tutor_id,
        },
        success_url: `${req.nextUrl.origin}/ripetizioni/pagamento-successo?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.nextUrl.origin}/ripetizioni/pagamento-cancellato`,
      });

      console.log('Sessione Stripe creata con successo:', session.id);

      return NextResponse.json({ checkoutUrl: session.url });
    } catch (stripeErr) {
      console.error('Errore creazione sessione Stripe:', stripeErr);
      return NextResponse.json({ error: 'Errore durante la creazione del pagamento' }, { status: 500 });
    }
  } catch (err) {
    console.error('Errore generale in POST checkout-ripetizione:', err);
    return NextResponse.json({ error: 'Errore parsing o esecuzione' }, { status: 500 });
  }
}
