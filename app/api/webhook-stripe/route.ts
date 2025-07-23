// app/api/stripe-webhook/route.ts
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
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  // Buffer the raw body for Stripe signature verification
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

const prenotazione_id = session.metadata?.prenotazione_id;
const studente_id = session.metadata?.studente_id;
const amount = (session.amount_total ?? 0) / 100;
const commissione = session.metadata?.commissione ?? '1';
const stripe_dest_account = session.metadata?.stripe_dest_account;
const destinatario_id = session.metadata?.destinatario_id;

if (!prenotazione_id || !studente_id) {
  console.warn('⚠️ Metadati mancanti nella sessione Stripe');
  return new NextResponse('Metadati mancanti', { status: 400 });
}

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
      stripe_payment_intent_id: session.payment_intent?.toString() ?? '',
      stripe_checkout_session_id: session.id,
      stripe_dest_account,
      destinatario_id,
      commissione: Number(commissione),
      stripe_flusso: 'checkout',
      stripe_application_fee_amount: 1,
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
  console.error('❌ Errore nella gestione Supabase:', error);
  return new NextResponse('Errore interno Supabase', { status: 500 });
}

  }

  return NextResponse.json({ received: true });
}
