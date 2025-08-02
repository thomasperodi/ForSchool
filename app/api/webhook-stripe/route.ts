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
  const buf = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get('stripe-signature')!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, signature, endpointSecret);
  } catch (err) {
    console.error('❌ Stripe webhook signature validation failed', err);
    return new NextResponse(`Webhook Error`, { status: 400 });
  }

  try {
    switch (event.type) {
      // === CHECKOUT SESSION COMPLETED ===
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;
        const paymentIntentId = session.payment_intent?.toString() ?? null;
        const subscriptionId = session.subscription?.toString() ?? null;
        const amount = (session.amount_total ?? 0) / 100;
        const commission = session.metadata?.commissione
          ? Number(session.metadata.commissione)
          : undefined;

        const { prenotazione_id, studente_id, utente_id: utenteMeta, destinatario_id, stripe_dest_account } =
          session.metadata ?? {};

        // CASO 1: RIPETIZIONE
        if (prenotazione_id && studente_id) {
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
              commission,
              stripe_flusso: 'checkout',
              stripe_application_fee_amount:
                commission !== undefined ? Math.round(commission * 100) : null,
            })
            .select()
            .single();
          if (payErr) throw payErr;
          const { error: prenErr } = await supabase
            .from('prenotazioni_ripetizioni')
            .update({ pagamento_id: pagamento.id, stato: 'pagato', data_pagamento: new Date().toISOString() })
            .eq('id', prenotazione_id);
          if (prenErr) throw prenErr;
          break;
        }

        // CASO 2: MERCH
        const { data: pagamentoExist } = await supabase
          .from('pagamenti')
          .select('*')
          .eq('stripe_checkout_session_id', sessionId)
          .eq('stato', 'pending')
          .maybeSingle();
        if (pagamentoExist) {
          const { error: updErr } = await supabase
            .from('pagamenti')
            .update({ stato: 'pagato', stripe_payment_intent_id: paymentIntentId, timestamp: new Date().toISOString() })
            .eq('id', pagamentoExist.id);
          if (updErr) throw updErr;
          if (pagamentoExist.tipo_acquisto === 'merch' && pagamentoExist.riferimento_id) {
            await supabase.from('ordini_merch').update({ stato: 'pagato' }).eq('id', pagamentoExist.riferimento_id);
          }
        }

        // CASO 3: ABBONAMENTO (pagamento iniziale via Checkout)
        if (subscriptionId && utenteMeta) {
          const { data: abbo, error: abErr } = await supabase
            .from('abbonamenti')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          const riferimentoUuid = abErr || !abbo ? null : abbo.id;
          await supabase.from('pagamenti').insert({
            utente_id: utenteMeta,
            importo: amount,
            metodo: 'carta',
            tipo_acquisto: 'abbonamento',
            riferimento_id: riferimentoUuid ?? subscriptionId,
            stato: 'pagato',
            timestamp: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntentId,
            stripe_checkout_session_id: sessionId,
            abbonamento_id: riferimentoUuid,
          });
        }
        break;
      }

      // === SUBSCRIPTION CREATED / UPDATED ===
case 'customer.subscription.created': {
  const subscription = event.data.object as Stripe.Subscription;

  console.log('📦 Subscription creata:', subscription.id, subscription);

  const customerId = subscription.customer as string;

  // Recupera utente da Supabase tramite stripe_customer_id
  const { data: utente, error: utErr } = await supabase
    .from('utenti')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (utErr || !utente) {
    console.error('❌ Nessun utente trovato per customer:', customerId);
    break;
  }

  interface SubscriptionWithDiscount extends Stripe.Subscription {
    discount?: {
      promotion_code?: string;
    } | null;
  }

  const subscriptionWithDiscount = subscription as SubscriptionWithDiscount;
  let ambassadorCode: string | null = null;

  if (subscriptionWithDiscount.discount?.promotion_code) {
    const promoCodeId = subscriptionWithDiscount.discount.promotion_code;

    try {
      const promotion = await stripe.promotionCodes.retrieve(promoCodeId);
      ambassadorCode = promotion.code;
      console.log('🎟️ Codice Ambassador:', ambassadorCode);
    } catch (err) {
      console.error('Errore recupero promotion code:', err);
    }
  }

  // Recupera il price_id
  const priceId = subscription.items.data[0].price.id;

  // Recupera il nome dell'abbonamento da Stripe
  let abbonamentoNome: string | null = null;
  try {
    const price = await stripe.prices.retrieve(priceId);

    if (price.nickname) {
      // Usa il nickname se presente
      abbonamentoNome = price.nickname;
    } else if (typeof price.product === 'string') {
      // Se non ha nickname, recupera il prodotto per avere il nome
      const product = await stripe.products.retrieve(price.product);
      abbonamentoNome = product.name;
    }
  } catch (err) {
    console.error('Errore recupero nome abbonamento da Stripe:', err);
  }

  // Prepara i dati per inserimento abbonamento
  const insertAbbo = {
    utente_id: utente.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    nome: abbonamentoNome, // 👈 Inserisci il nome qui
    stato: subscription.status,
    data_inizio_periodo: new Date(subscription.start_date * 1000).toISOString(),
    data_fine_periodo: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0]?.current_period_end * 1000).toISOString()
      : null,
  };

  const { data: abbo, error: insErr } = await supabase
    .from('abbonamenti')
    .insert(insertAbbo)
    .select()
    .single();

  if (insErr) {
    console.error('Errore inserimento abbonamento:', insErr);
    break;
  }
  console.log('✅ Abbonamento registrato:', subscription.id);

  if (abbo) {
    const inizio = insertAbbo.data_inizio_periodo;
    const fine =
      insertAbbo.data_fine_periodo ??
      new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

    const { error: uaErr } = await supabase.from('utente_abbonamenti').insert({
      utente_id: utente.id,
      abbonamento_id: abbo.id,
      data_inizio: inizio,
      data_fine: fine,
      stato: 'attivo',
      sconto_applicato: null,
      ambassador_code: ambassadorCode,
    });

    if (uaErr) {
      console.error('Errore inserimento utente_abbonamenti:', uaErr);
    } else {
      console.log('✅ utente_abbonamenti creato');
    }
  }
  break;
}








case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription;

  const { data: user, error: userErr } = await supabase
    .from('utenti')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();
  if (userErr || !user) {
    console.warn('⚠️ Utente non trovato per customer ID', subscription.customer);
    return new NextResponse('Utente non collegato', { status: 400 });
  }

  const item = subscription.items.data[0];
  const dataInizio = item?.current_period_start
    ? new Date(item.current_period_start * 1000).toISOString()
    : null;
  const dataFine = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const subData = {
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price?.id || 'unknown',
    stato: subscription.status,
    data_inizio_periodo: dataInizio,
    data_fine_periodo: dataFine,
    data_fine_prova: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    data_cancellazione: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    quantita: item?.quantity ?? 1,
    utente_id: user.id,
  };

  const { error: upsertErr } = await supabase
    .from('abbonamenti')
    .upsert(subData, { onConflict: 'stripe_subscription_id' });
  if (upsertErr) throw upsertErr;

  const { error: uaErr } = await supabase
  .from('utente_abbonamenti')
  .upsert([{
    utente_id: user.id,
    abbonamento_id: subData.stripe_subscription_id,
    data_inizio: dataInizio,
    data_fine: dataFine ?? new Date(Date.now() + 30*24*3600*1000).toISOString(),
    stato: subscription.status === 'canceled' ? 'annullato' : 'attivo',
  }], {
    onConflict: 'utente_abbonamenti_utente_id_abbonamento_id_key',
  });


  if (uaErr) console.error('Errore upsert utente_abbonamenti:', uaErr);

  console.log(`✅ Abbonamento sincronizzato: ${subscription.id}`);
  break;
}


      // === SUBSCRIPTION DELETED ===
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error: delErr } = await supabase
          .from('abbonamenti')
          .update({
            stato: 'canceled',
            data_cancellazione: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        if (delErr) throw delErr;
        console.log(`✅ Abbonamento cancellato: ${subscription.id}`);
        break;
      }

      // === INVOICE PAYMENT SUCCEEDED ===
case 'invoice.payment_succeeded': {
  const rawInvoice = event.data.object as Stripe.Invoice;
  if (typeof rawInvoice.id !== 'string') {
    console.error('🔴 Invoice.id mancante:', rawInvoice);
    break;
  }
  const invoiceId = rawInvoice.id;
  console.debug('➡️ Invoice webhook ricevuta:', invoiceId);

  // Recupera l'Invoice completa e espandi payments
  const invoice = await stripe.invoices.retrieve(invoiceId, {
    expand: ['payments']
  });

  // Estrai subscriptionId dalla struttura parent
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === 'string'
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null;

  if (!subscriptionId) {
    console.warn(`⚠️ Nessuna subscription collegata a invoice ${invoiceId}`);
    break;
  }

  // Estrai il primo pagamento collegato all'Invoice
  const firstPayment = invoice.payments?.data?.[0];
if (!firstPayment || firstPayment.payment?.type !== 'payment_intent') {
  console.error('🔴 Nessun pagamento valido associato alla fattura:', { payments: invoice.payments });
  break;
}

const paymentIntentId = firstPayment.payment.payment_intent;
if (!paymentIntentId) {
  console.error('🔴 ID del PaymentIntent mancante nel pagamento:', firstPayment);
  break;
}

console.debug('paymentIntentId:', paymentIntentId);

// Recupera il PaymentIntent per leggere i metadata (es. ambassador_code)
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
const ambassadorCode = paymentIntent.metadata?.ambassador_code;
let ambassadorId: string | null = null;

// Recupera abbonamento in DB Supabase
const { data: abbo, error: abbErr } = await supabase
  .from('abbonamenti')
  .select('id, utente_id')
  .eq('stripe_subscription_id', subscriptionId)
  .single();

if (abbErr || !abbo) {
  console.error('❌ Abbonamento non trovato per subscriptionId:', subscriptionId);
  break;
}

// Se ambassadorCode presente, recupera utente ambassador
if (ambassadorCode) {
  const { data: amb, error: ambErr } = await supabase
    .from('utenti')
    .select('id')
    .eq('ambassador_code', ambassadorCode)
    .single();

  if (!ambErr && amb) {
    ambassadorId = amb.id;
  } else {
    console.warn(`⚠️ Ambassador non trovato per codice "${ambassadorCode}"`);
  }
}

// Calcola importi (1 € all’ambasciatore se valido)
const total = (invoice.amount_paid ?? 0) / 100;
const ambassadorAmount = ambassadorId ? 1 : 0;
const platformAmount = total - ambassadorAmount;

// Inserisci pagamento Piattaforma
await supabase.from('pagamenti').insert({
  utente_id: abbo.utente_id,
  importo: platformAmount,
  metodo: 'carta',
  tipo_acquisto: 'abbonamento',
  riferimento_id: abbo.id,
  stato: 'pagato',
  stripe_payment_intent_id: paymentIntentId,
  abbonamento_id: abbo.id,
  stripe_flusso: 'subscription',
  stripe_checkout_session_id: invoiceId,
});

// Inserisci pagamento Ambassador (solo se c’è un ambassador valido)
if (ambassadorId) {
  await supabase.from('pagamenti').insert({
    utente_id: abbo.utente_id,
    importo: ambassadorAmount,
    metodo: 'carta',
    tipo_acquisto: 'abbonamento',
    riferimento_id: abbo.id,
    stato: 'pagato',
    stripe_payment_intent_id: paymentIntentId,
    abbonamento_id: abbo.id,
    ambassador_id: ambassadorId,
    stripe_flusso: 'ambassador_fee',
    stripe_checkout_session_id: invoiceId,
  });
}

// Aggiorna abbonamento con stato e data fine periodo
await supabase
  .from('abbonamenti')
  .update({
    stato: 'active',
    data_fine_periodo: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
  })
  .eq('stripe_subscription_id', subscriptionId);

console.log(`✅ Pagamento abbonamento registrato per subscription ${subscriptionId}`);
break;

}








      // === INVOICE PAYMENT FAILED ===
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        let subscriptionId: string | null = null;
        if (invoice.parent?.type === 'subscription_details') {
          const details = invoice.parent.subscription_details;
          if (details && typeof details.subscription === 'string') subscriptionId = details.subscription;
          else if (details?.subscription && typeof details.subscription === 'object' && 'id' in details.subscription)
            subscriptionId = details.subscription.id;
        }
        if (subscriptionId) {
          const { data: abbo, error: abbErr } = await supabase
            .from('abbonamenti')
            .select('id, utente_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();
          if (abbErr || !abbo) {
            console.error('❌ Abbonamento non trovato per invoice failed:', subscriptionId);
            throw new Error('Abbonamento non trovato.');
          }
          await supabase.from('pagamenti').insert({
            utente_id: abbo.utente_id,
            importo: (invoice.amount_due ?? 0) / 100,
            metodo: 'carta',
            tipo_acquisto: 'abbonamento',
            riferimento_id: abbo.id,
            stato: 'fallito',
            timestamp: new Date().toISOString(),
            stripe_payment_intent_id: null,
            abbonamento_id: abbo.id,
          });
          await supabase
            .from('abbonamenti')
            .update({ stato: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);
        }
        break;
      }

      default:
        console.debug(`⚠️ Evento non gestito: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('❌ Errore nella gestione evento Stripe', err);
    return new NextResponse('Errore interno', { status: 500 });
  }
}
