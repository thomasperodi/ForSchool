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
    
        console.log('Webhook ricevuto:', event.type, sessionId, amount);
    
        const commission = session.metadata?.commissione
          ? Number(session.metadata.commissione)
          : undefined;
    
        const {
          prenotazione_id,
          studente_id,
          utente_id: utenteMeta,
          destinatario_id,
          stripe_dest_account,
          riferimento_id,
          eventoId,
          biglietto_id
        } = session.metadata ?? {};
    
        console.log('Metadata ricevuti:', session.metadata);
    
        // === CASO 1: RIPETIZIONE ===
        if (prenotazione_id && studente_id) {
          console.log('Pagamento ripetizione rilevato per prenotazione:', prenotazione_id);
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
    
            console.log('Pagamento ripetizione registrato con successo:', pagamento.id);
            break;
          } catch (err) {
            console.error('Errore pagamento ripetizione:', err);
            break;
          }
        }
    
        // === CASO 2: BIGLIETTO ===
        if (biglietto_id && utenteMeta) {
          console.log('Pagamento biglietto rilevato per biglietto:', biglietto_id);
        
          try {
            // Inserimento pagamento
            const { data: pagamento, error: payErr } = await supabase
              .from('pagamenti')
              .insert({
                utente_id: utenteMeta,
                importo: amount,
                metodo: 'carta',
                tipo_acquisto: 'biglietto',
                riferimento_id: biglietto_id,
                stato: 'pagato',
                timestamp: new Date().toISOString(),
                stripe_payment_intent_id: paymentIntentId,
                stripe_checkout_session_id: sessionId,
              })
              .select()
              .single();
        
            if (payErr) {
              console.error('Errore inserimento pagamento:', payErr);
              return;
            }
        
            // Aggiornamento stato biglietto
            const { error: ticketErr } = await supabase
              .from('biglietti')
              .update({ stato_pagamento: 'pagato', prezzo_pagato: amount })
              .eq('id', biglietto_id);
        
            if (ticketErr) {
              console.error('Errore aggiornamento biglietto:', ticketErr);
              return;
            }
        
            console.log('Pagamento biglietto registrato con successo:', pagamento.id);
        
          } catch (err) {
            console.error('Errore generico nel processo pagamento biglietto:', err);
          }
        }
        
    
        // === CASO 3: MERCH ===
        if (session.metadata?.tipo_acquisto === 'merch') {
          console.log('Pagamento merch rilevato');
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
            if (updErr) console.error('Errore aggiornamento pagamento merch:', updErr);
    
            if (pagamentoExist.tipo_acquisto === 'merch' && pagamentoExist.riferimento_id) {
              await supabase.from('ordini_merch').update({ stato: 'pagato' }).eq('id', pagamentoExist.riferimento_id);
              console.log('Ordine merch aggiornato a pagato:', pagamentoExist.riferimento_id);
            }
          } else {
            console.warn('Pagamento merch non trovato con sessionId:', sessionId);
          }
        }
    
        // === CASO 4: ABBONAMENTO ===
        if (subscriptionId && utenteMeta) {
          console.log('Pagamento abbonamento iniziale rilevato per utente:', utenteMeta);
          const { data: abbo, error: abErr } = await supabase
            .from('abbonamenti')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          const riferimentoUuid = abErr || !abbo ? null : abbo.id;
    
          const { error: payErr } = await supabase.from('pagamenti').insert({
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
          if (payErr) console.error('Errore pagamento abbonamento:', payErr);
        }
      }

      // === SUBSCRIPTION CREATED / UPDATED ===
case 'customer.subscription.created': {
  const subscription = event.data.object as Stripe.Subscription;

  console.log('📦 Subscription creata:', subscription.id);

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

  // Recupera priceId e nome abbonamento
  const priceId = subscription.items.data[0]?.price.id ?? null;
  let abbonamentoNome: string | null = null;
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.nickname) abbonamentoNome = price.nickname;
      else if (typeof price.product === 'string') {
        const product = await stripe.products.retrieve(price.product);
        abbonamentoNome = product.name;
      }
    } catch (err) {
      console.error('Errore recupero nome abbonamento da Stripe:', err);
    }
  }


if (!priceId) {
  console.error('Subscription senza priceId');
  break;
}

// Cerca il piano interno corrispondente
const { data: piano, error: errPiano } = await supabase
  .from('piani_abbonamento')
  .select('id')
  .eq('stripe_price_id', priceId)
  .single();

if (errPiano || !piano) {
  console.error('Piano non trovato per priceId:', priceId);
  break;
}
  // Inserimento abbonamento in Supabase
  const insertAbbo = {
    utente_id: utente.id,
    piano_id: piano.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stato: subscription.status, // deve essere uno tra 'attivo', 'scaduto', 'annullato'?
    data_inizio: subscription.start_date ? new Date(subscription.start_date * 1000).toISOString() : null,
    data_fine: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null,
    ambassador_code: ambassadorCode,
    // sconto_applicato: ??? (da ricavare eventualmente da metadata o altro)
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

  console.log('✅ Abbonamento creato:', subscription.id);

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
    break;
  }

  const item = subscription.items.data[0];
  const dataInizio = item?.current_period_start
    ? new Date(item.current_period_start * 1000).toISOString()
    : null;
  const dataFine = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const updateData = {
    utente_id: user.id,
    stripe_customer_id: subscription.customer,
    stripe_subscription_id: subscription.id,
    stato: subscription.status, // attenzione valori compatibili con check constraint
    data_inizio: dataInizio,
    data_fine: dataFine,
    // opzionale: sconto_applicato, ambassador_code se disponibile
  };

  const { error: upsertErr } = await supabase
    .from('abbonamenti')
    .upsert(updateData, { onConflict: 'stripe_subscription_id' });

  if (upsertErr) {
    console.error('Errore aggiornamento abbonamento:', upsertErr);
    break;
  }

  console.log(`✅ Abbonamento aggiornato: ${subscription.id}`);

  break;
}

case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;

  const updatePayload = {
    stato: 'annullato', // coerente con check constraint
    data_fine: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : new Date().toISOString(),
  };

  const { error: delErr } = await supabase
    .from('abbonamenti')
    .update(updatePayload)
    .eq('stripe_subscription_id', subscription.id);

  if (delErr) {
    console.error('Errore cancellazione abbonamento:', delErr);
    break;
  }

  console.log(`✅ Abbonamento cancellato: ${subscription.id}`);

  break;
}

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
  const subscriptionId =
    typeof invoice.parent?.subscription_details?.subscription === 'string'
      ? invoice.parent.subscription_details.subscription
      : invoice.parent?.subscription_details?.subscription?.id ?? null;

  const firstPayment = invoice.payments?.data?.[0];
if (!firstPayment || firstPayment.payment?.type !== 'payment_intent') {
  console.error('🔴 Nessun pagamento valido associato alla fattura:', { payments: invoice.payments });
  break;
}
  // Recupera paymentIntentId dal primo pagamento (se esiste)
  const paymentIntentId = firstPayment.payment.payment_intent;
if (!paymentIntentId) {
  console.error('🔴 ID del PaymentIntent mancante nel pagamento:', firstPayment);
  break;
}

  if (!paymentIntentId) {
    console.error('🔴 Nessun PaymentIntent associato alla fattura:', invoice.id);
    break;
  }

  // Recupera paymentIntent da Stripe per leggere eventuali metadata
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
  const ambassadorCode = paymentIntent.metadata?.ambassador_code ?? null;

  // Recupera abbonamento Supabase
  const { data: abbo, error: abbErr } = await supabase
    .from('abbonamenti')
    .select('id, utente_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (abbErr || !abbo) {
    console.error('❌ Abbonamento non trovato per subscriptionId:', subscriptionId);
    break;
  }

  // Recupera ambassadorId da codice se presente
  let ambassadorId: string | null = null;
  if (ambassadorCode) {
    const { data: amb, error: ambErr } = await supabase
      .from('utenti')
      .select('id')
      .eq('ambassador_code', ambassadorCode)
      .single();

    if (!ambErr && amb) ambassadorId = amb.id;
    else console.warn(`⚠️ Ambassador non trovato per codice "${ambassadorCode}"`);
  }

  // Calcolo importi
  const total = (invoice.amount_paid ?? 0) / 100;
  const ambassadorAmount = ambassadorId ? 1 : 0;
  const platformAmount = total - ambassadorAmount;

  // Inserisci pagamento piattaforma
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
    stripe_checkout_session_id: invoice.id,
  });

  // Inserisci pagamento ambassador se valido
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
      stripe_checkout_session_id: invoice.id,
    });
  }

  // Aggiorna stato e data_fine abbonamento
  await supabase
    .from('abbonamenti')
    .update({
      stato: 'attivo', // 'active' nel tuo codice? meglio coerente con check constraint: 'attivo'
      data_fine: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`✅ Pagamento abbonamento registrato per subscription ${subscriptionId}`);

  break;
}

case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;
        let subscriptionId: string | null = null;
        if (invoice.parent?.type === 'subscription_details') {
          const details = invoice.parent.subscription_details;
          if (details && typeof details.subscription === 'string') subscriptionId = details.subscription;
          else if (details?.subscription && typeof details.subscription === 'object' && 'id' in details.subscription)
            subscriptionId = details.subscription.id;
        }

  if (!subscriptionId) {
    console.warn('⚠️ Nessuna subscription collegata a invoice fallita:', invoice.id);
    break;
  }

  await supabase
    .from('abbonamenti')
    .update({ stato: 'scaduto' }) // o 'annullato' o 'scaduto'?
    .eq('stripe_subscription_id', subscriptionId);

  console.log(`⚠️ Pagamento fallito per subscription ${subscriptionId}, stato aggiornato a 'scaduto'`);

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
