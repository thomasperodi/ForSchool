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


// Funzione di attesa con retry per il pagamento pending
async function waitForPagamento(sessionId: string, retries = 5, delay = 500): Promise<{
  id: string;
  stripe_checkout_session_id: string;
  stato: string;
  tipo_acquisto: string;
  riferimento_id: string;
} | null> {

  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from('pagamenti')
      .select('*')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('stato', 'pending')
      .maybeSingle();

    if (data && !error) return data;

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return null;
}

export async function POST(req: NextRequest) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const rawBody = await req.arrayBuffer();
  const bodyBuffer = Buffer.from(rawBody);
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(bodyBuffer, signature, endpointSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Errore validazione Stripe webhook:', errorMessage);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const sessionId = session.id;
    const paymentIntentId = session.payment_intent?.toString() ?? '';
    const amount = (session.amount_total ?? 0) / 100;
    const commissione = session.metadata?.commissione ?? '1';
    const stripe_dest_account = session.metadata?.stripe_dest_account ?? null;
    const destinatario_id = session.metadata?.destinatario_id ?? null;

    const prenotazione_id = session.metadata?.prenotazione_id ?? null;
    const studente_id = session.metadata?.studente_id ?? null;

    // ➤ CASO 1: RIPETIZIONE
    if (prenotazione_id && studente_id) {
      try {
        const { data: pagamento, error: payErr } = await supabase
          .from('pagamenti')
          .insert({
            utente_id: studente_id,
            importo: amount,
            metodo: 'carta',
            tipo_acquisto: 'ripetizione',
            riferimento_id: prenotazione_id,
            stato: 'pagato',
            timestamp: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId,
            stripe_checkout_session_id: sessionId,
            stripe_dest_account,
            destinatario_id,
            commissione: Number(commissione),
            stripe_flusso: 'checkout',
            stripe_application_fee_amount: Math.round(Number(commissione) * 100),
          })
          .select()
          .single();

        if (payErr) throw payErr;

        const { error: prenErr } = await supabase
          .from('prenotazioni_ripetizioni')
          .update({
            pagamento_id: pagamento.id,
            stato: 'pagato',
            data_pagamento: new Date().toISOString(),
          })
          .eq('id', prenotazione_id);

        if (prenErr) throw prenErr;

        return NextResponse.json({ received: true });
      } catch (error) {
        console.error('❌ Errore nella gestione ripetizione:', error);
        return new NextResponse('Errore interno Supabase', { status: 500 });
      }
    }

    // ➤ CASO 2: MERCH - aggiorna pagamento pending
    try {
      const pagamentoExist = await waitForPagamento(sessionId);

      if (!pagamentoExist) {
        console.warn('⚠️ Nessun pagamento pending trovato per session:', sessionId);
        return new NextResponse('Pagamento non trovato', { status: 404 });
      }

      const { error: updateError } = await supabase
        .from('pagamenti')
        .update({
          stato: 'pagato',
          stripe_payment_intent_id: paymentIntentId,
          timestamp: new Date().toISOString(),
        })
        .eq('id', pagamentoExist.id);

      if (updateError) throw updateError;

      // ➕ Aggiorna stato ordine_merch (se presente)
      if (pagamentoExist.tipo_acquisto === 'merch' && pagamentoExist.riferimento_id) {
        await supabase
          .from('ordini_merch')
          .update({ stato: 'pagato' })
          .eq('id', pagamentoExist.riferimento_id);
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error('❌ Errore aggiornamento pagamento pending:', error);
      return new NextResponse('Errore interno Supabase', { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
