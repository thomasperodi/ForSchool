import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

// ⚠️ Usa la chiave live in produzione
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" });

// Disabilita ISR per le API
export const revalidate = 0;

/* =============================================================================
   Utils tip-safe (Basil)
============================================================================= */

// Stripe può restituire T oppure { data: T }
type StripeReturn<T> = T | { data: T };
const unwrapStripe = <T,>(resp: StripeReturn<T>): T =>
  (typeof (resp as { data?: T }).data !== "undefined")
    ? (resp as { data: T }).data
    : (resp as T);

// Supporto per parent.* su Invoice (Basil)
type ParentSubscriptionDetails = {
  type?: "subscription_details" | string;
  subscription_details?: { subscription?: string | null };
};
function hasParentField(obj: unknown): obj is { parent?: ParentSubscriptionDetails } {
  return typeof obj === "object" && obj !== null && "parent" in (obj as Record<string, unknown>);
}
function getSubscriptionIdFromInvoice(inv: Stripe.Invoice): string | undefined {
  if (!hasParentField(inv)) return undefined;
  const p = inv.parent;
  if (!p || p.type !== "subscription_details") return undefined;
  const subId = p.subscription_details?.subscription ?? undefined;
  return subId ? String(subId) : undefined;
}

// In Basil non esiste più inv.paid boolean
function isInvoicePaid(inv: Stripe.Invoice): boolean {
  return inv.status === "paid";
}

// Lock anti-duplicato tra invoice.payment_succeeded/invoice.paid/invoice_payment.paid
async function markReceiptSent(invoiceId: string): Promise<boolean> {
  const invResp = await stripe.invoices.retrieve(invoiceId) as StripeReturn<Stripe.Invoice>;
  const inv = unwrapStripe(invResp);
  if (inv.metadata?.receipt_email_sent === "1") return false;
  await stripe.invoices.update(invoiceId, {
    metadata: { ...(inv.metadata ?? {}), receipt_email_sent: "1" },
  });
  return true;
}

// Ricava il PaymentIntent associato ad una Invoice (Basil: multiple/partial payments)
async function getPaymentIntentIdForInvoice(invoiceId: string): Promise<string | undefined> {
  // 1) prova dalla Invoice espandendo payments.data.payment
  const invResp = await stripe.invoices.retrieve(invoiceId, {
    expand: ["payments.data.payment"],
  }) as StripeReturn<Stripe.Invoice>;
  const invoice = unwrapStripe(invResp);

  const payments = (invoice as unknown as { payments?: { data?: Array<{ payment?: unknown }> } }).payments?.data ?? [];
  for (const p of payments) {
    const pay = p.payment;
    const objType = (pay as { object?: string } | undefined)?.object;

    // Caso A: direttamente PaymentIntent
    if (objType === "payment_intent") {
      const piId = (pay as Stripe.PaymentIntent).id;
      if (piId) return piId;
    }

    // Caso B: Charge → risalgo al payment_intent
    if (objType === "charge") {
      const ch = pay as Stripe.Charge;
      const piId = typeof ch.payment_intent === "string"
        ? ch.payment_intent
        : (ch.payment_intent && "id" in (ch.payment_intent as object)
            ? (ch.payment_intent as Stripe.PaymentIntent).id
            : undefined);
      if (piId) return piId;
    }
  }

  // 2) fallback: nuovi InvoicePayments filtrando per invoice
  const list = await stripe.invoicePayments.list({ invoice: invoiceId });
  for (const item of list.data ?? []) {
    const p = (item as { payment?: { type?: string; payment_intent?: string; charge?: string } }).payment;
    if (!p) continue;

    if (p.type === "payment_intent" && p.payment_intent) return p.payment_intent;
    if (p.type === "charge" && p.charge) {
      const charge = await stripe.charges.retrieve(p.charge);
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent && "id" in (charge.payment_intent as object)
            ? (charge.payment_intent as Stripe.PaymentIntent).id
            : undefined);
      if (piId) return piId;
    }
  }

  return undefined;
}

// Imposta receipt_email su PI → Stripe invia la ricevuta ufficiale
async function sendStripeReceiptForPaymentIntent(piId: string, providedEmail?: string) {
  let email = providedEmail;

  // Se non ho l’email, provo a recuperarla dal customer del PI
  if (!email) {
    const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["customer"] });
    if (typeof pi.customer !== "string" && pi.customer && !("deleted" in pi.customer)) {
      email = pi.customer.email ?? undefined;
    }
  }

  if (!email) {
    console.warn(` - ⚠️ Nessuna email trovata: non posso inviare la ricevuta Stripe per PI ${piId}.`);
    return;
  }

  await stripe.paymentIntents.update(piId, { receipt_email: email });
  console.log(` - ✅ Richiesta invio ricevuta Stripe per PI ${piId} → ${email}`);
}

// Dato un invoiceId, invia la ricevuta Stripe del pagamento collegato (se possibile)
async function sendStripeReceiptForInvoice(invoiceId: string) {
  const invResp = await stripe.invoices.retrieve(invoiceId, { expand: ["customer"] }) as StripeReturn<Stripe.Invoice>;
  const invoice = unwrapStripe(invResp);

  // Email del cliente: usa quella della invoice o del customer espanso
  let email: string | undefined = invoice.customer_email ?? undefined;
  if (!email && invoice.customer && typeof invoice.customer !== "string" && !("deleted" in invoice.customer)) {
    email = invoice.customer.email ?? undefined;
  }

  const piId = await getPaymentIntentIdForInvoice(String(invoice.id));
  if (!piId) {
    console.warn(` - ⚠️ Nessun PaymentIntent associato alla invoice ${invoice.id}. Non posso inviare ricevuta Stripe.`);
    return;
  }

  await sendStripeReceiptForPaymentIntent(piId, email);
}

/* =============================================================================
   Business helpers
============================================================================= */

// Mappa metodo pagamento per i pagamenti one-off via Checkout/PI
function mapPaymentMethod(
  src: Stripe.Checkout.Session | Stripe.PaymentIntent | null
): "carta" | "paypal" | "altro" {
  if (!src) return "altro";
  if ("payment_method_types" in src) {
    const types = src.payment_method_types;
    const primary = Array.isArray(types) && types.length > 0 ? types[0] : undefined;
    if (primary === "card") return "carta";
    if (primary === "paypal") return "paypal";
  }
  return "altro";
}

// Gestione post-pagamento per pagamenti one-off (biglietti/merch) + invio ricevuta Stripe
async function handleSuccessfulPayment(
  paymentIntent: Stripe.PaymentIntent | null,
  session: Stripe.Checkout.Session | null,
) {
  const source = session || paymentIntent;
  if (!source) {
    console.error("Dati di pagamento mancanti. Impossibile procedere.");
    return;
  }

  console.log(`[handleSuccessfulPayment] Inizio gestione pagamento per oggetto tipo: ${source.object}`);

  // importo pagato
  let paymentAmount = 0;
  if (source.object === "checkout.session" && (source as Stripe.Checkout.Session).amount_total !== null) {
    paymentAmount = (source as Stripe.Checkout.Session).amount_total! / 100;
  } else if (source.object === "payment_intent" && (source as Stripe.PaymentIntent).amount !== null) {
    paymentAmount = (source as Stripe.PaymentIntent).amount / 100;
  }

  const metadata = source.metadata || {};
  const { userId, tipo_acquisto, items, biglietti_id, evento_id } = metadata;
  const paymentMethod: "carta" | "paypal" | "altro" = mapPaymentMethod(source);

  if (!userId || !tipo_acquisto) {
    console.warn(` - Metadati mancanti o incompleti. Skippo la gestione del pagamento.`);
    return;
  }

  let applicationFeeAmount: number | null = null;
  if (paymentIntent && paymentIntent.application_fee_amount) {
    applicationFeeAmount = paymentIntent.application_fee_amount / 100;
  } else if (session && session.payment_intent) {
    const retrievedPaymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string);
    if (retrievedPaymentIntent.application_fee_amount) {
      applicationFeeAmount = retrievedPaymentIntent.application_fee_amount / 100;
    }
  }

  switch (tipo_acquisto) {
    case "biglietti": {
      if (!biglietti_id) {
        console.warn(` - Dati metadata (biglietti_id) mancanti. Skippo.`);
        break;
      }

      const parsedBigliettiIds: string[] = JSON.parse(biglietti_id);
      const prezzoPagato = paymentAmount - (applicationFeeAmount || 0);
      const prezzoPerBiglietto = parsedBigliettiIds.length ? (prezzoPagato / parsedBigliettiIds.length) : 0;

      for (const bigliettoId of parsedBigliettiIds) {
        const { error: errUpdate } = await supabase
          .from("biglietti")
          .update({ stato_pagamento: "pagato", prezzo_pagato: prezzoPerBiglietto })
          .eq("id", bigliettoId);
        if (errUpdate) console.error(` - 🚫 Errore aggiornamento biglietto ID ${bigliettoId}:`, errUpdate);
      }
      break;
    }

    case "merch": {
      if (!items) {
        console.warn(` - Dati metadata (items) mancanti. Skippo.`);
        break;
      }

      const parsedItems: Array<{ priceId: string; quantity: number; varianteId?: number | null }> = JSON.parse(items);
      const ordiniInseriti: number[] = [];
      for (const item of parsedItems) {
        const { data: prodottoData } = await supabase
          .from("prodotti_merch")
          .select("id")
          .eq("stripe_price_id", item.priceId)
          .single();
        if (!prodottoData) continue;

        const { data: ordineData, error: errOrdine } = await supabase
          .from("ordini_merch")
          .insert({
            utente_id: userId,
            prodotto_id: prodottoData.id,
            quantita: item.quantity,
            variante_id: item.varianteId || null
          })
          .select("id")
          .single();
        if (!errOrdine && ordineData) ordiniInseriti.push(ordineData.id);
      }

      await supabase.from("pagamenti").insert({
        utente_id: userId,
        importo: paymentAmount,
        metodo: paymentMethod,
        tipo_acquisto: "merch",
        riferimento_id: ordiniInseriti[0] || null,
        stripe_payment_intent_id: paymentIntent?.id,
        stato: "pagato"
      });

      break;
    }

    default:
      console.warn(` - Modalità sconosciuta: ${tipo_acquisto}. Skippo.`);
      return;
  }

  // Inserimento pagamento generico (biglietti)
  if (tipo_acquisto !== "merch") {
    const { error: errPaymentInsert } = await supabase
      .from("pagamenti")
      .insert({
        utente_id: userId,
        importo: paymentAmount,
        metodo: paymentMethod,
        tipo_acquisto: tipo_acquisto === "biglietti" ? "biglietto" : "merch",
        riferimento_id: tipo_acquisto === "biglietti" ? evento_id : null,
        stato: "pagato",
        stripe_payment_intent_id: paymentIntent?.id,
        stripe_checkout_session_id: session?.id,
        stripe_application_fee_amount: applicationFeeAmount,
      });
    if (errPaymentInsert) {
      console.error(` - 🚫 Errore nell'inserimento del pagamento:`, errPaymentInsert);
    }
  }

  // INVIO RICEVUTA STRIPE (no email manuali, no PDF)
  try {
    const piId =
      (session && typeof session.payment_intent === "string") ? session.payment_intent
      : (paymentIntent ? paymentIntent.id : undefined);

    const emailFromSession = session?.customer_details?.email;
    if (piId) {
      await sendStripeReceiptForPaymentIntent(piId, String(emailFromSession));
    } else {
      console.log(" - ℹ️ Nessun PaymentIntent ID disponibile per invio ricevuta.");
    }
  } catch (e) {
    console.error(" - 🚫 Errore durante l’invio della ricevuta Stripe:", e);
  }
}

/* =============================================================================
   Webhook handler
============================================================================= */

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  console.log(`[POST] Ricevuta nuova webhook. Inizio processo di verifica.`);

  // 1) Verifica firma
  try {
    const buf = await req.arrayBuffer();
    const sig = req.headers.get("stripe-signature")!;
    if (!sig) {
      console.error("Manca la firma Stripe.");
      return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
    }
    const bufNode = Buffer.from(buf);
    event = stripe.webhooks.constructEvent(bufNode, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    console.log(`✅ Firma webhook verificata con successo.`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Errore nella verifica della firma webhook: ${errorMsg}`);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  console.log(`✅ Evento Stripe ricevuto: ${event.type}`);

  try {
    switch (event.type) {
      /* ========================== CHECKOUT ========================== */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`➡️ checkout.session.completed id=${session.id} mode=${session.mode}`);

        if (session.mode === "payment") {
          await handleSuccessfulPayment(null, session);
        } else if (session.mode === "subscription") {
          // L'inserimento sub in DB viene gestito dagli eventi invoice/subscription
          console.log(` - ℹ️ Modalità subscription: delego ad eventi successivi.`);
        }
        break;
      }

      /* ========================== ONE-OFF PI ========================== */
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`➡️ payment_intent.succeeded id=${paymentIntent.id}`);

        const { tipo_acquisto } = paymentIntent.metadata || {};
        if (tipo_acquisto === "biglietti" || tipo_acquisto === "merch") {
          await handleSuccessfulPayment(paymentIntent, null);
        } else {
          console.log(` - ℹ️ Tipo acquisto non gestito (${tipo_acquisto}).`);
        }

        // invia sempre ricevuta Stripe
        try {
          await sendStripeReceiptForPaymentIntent(paymentIntent.id, paymentIntent.receipt_email ?? undefined);
        } catch (e) {
          console.error(" - 🚫 Errore invio ricevuta Stripe (PI):", e);
        }
        break;
      }

      /* ====================== SUBSCRIPTION CREATED ====================== */
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`➡️ customer.subscription.created id=${subscription.id}`);

        const userId = subscription.metadata?.userId;
        if (!userId) {
          console.warn(` - ⚠️ userId mancante nei metadata subscription ${subscription.id}.`);
          break;
        }

        const subscriptionItem = subscription.items.data[0];
        const priceId = subscriptionItem?.price.id;

        const { data: piano } = await supabase
          .from("piani_abbonamento")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        const pianoId = piano?.id || null;
        const dataInizio = subscriptionItem?.current_period_start
          ? new Date(subscriptionItem.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const dataFine = subscriptionItem?.current_period_end
          ? new Date(subscriptionItem.current_period_end * 1000).toISOString()
          : null;

        const ambassadorCode = subscription.metadata?.promoCode ?? null;

        const { error: errAbbonamento } = await supabase
          .from("abbonamenti")
          .upsert(
            {
              utente_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              piano_id: pianoId,
              stato: "active",
              data_inizio: dataInizio,
              data_fine: dataFine,
              ambassador_code: ambassadorCode,
            },
            { onConflict: "stripe_subscription_id" }
          );

        if (errAbbonamento) {
          console.error(` - 🚫 Errore upsert abbonamento per utente ${userId}:`, errAbbonamento);
          break;
        }

        // invio ricevuta Stripe per la prima invoice se già paid
        try {
          const latest = subscription.latest_invoice;
          const latestInvoiceId =
            typeof latest === "string"
              ? latest
              : (latest && typeof latest === "object" && "id" in latest ? (latest as Stripe.Invoice).id : undefined);

          if (latestInvoiceId) {
            const invResp = await stripe.invoices.retrieve(latestInvoiceId) as StripeReturn<Stripe.Invoice>;
            const inv = unwrapStripe(invResp);

            if (isInvoicePaid(inv) && await markReceiptSent(latestInvoiceId)) {
              await sendStripeReceiptForInvoice(latestInvoiceId);
            } else {
              console.log(` - ℹ️ Prima invoice ${latestInvoiceId} non paid (status: ${inv.status}). Attendo webhook.`);
            }
          }
        } catch (err) {
          console.error(" - 🚫 Errore invio ricevuta iniziale (customer.subscription.created):", err);
        }

        break;
      }

      /* ==================== INVOICE/INVOICE PAYMENT ===================== */
      // Nuovo oggetto InvoicePayment (Basil) → contiene invoice
      case "invoice_payment.paid": {
        const obj = event.data.object as unknown as { invoice?: string; status?: string };
        const invoiceId = obj?.invoice;
        console.log(`➡️ invoice_payment.paid invoice=${invoiceId} status=${obj?.status}`);

        if (invoiceId && await markReceiptSent(invoiceId)) {
          await sendStripeReceiptForInvoice(invoiceId);
        }
        // eventuale persistenza aggiuntiva la puoi fare dopo
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`➡️ invoice.paid id=${invoice.id}`);

        if (await markReceiptSent(String(invoice.id))) {
          await sendStripeReceiptForInvoice(String(invoice.id));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`➡️ invoice.payment_succeeded id=${invoice.id} status=${invoice.status}`);

        if (await markReceiptSent(String(invoice.id))) {
          await sendStripeReceiptForInvoice(String(invoice.id));
        }

        // Esempio di persistenza pagamento (se vuoi mantenerla):
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : undefined;

        if (subscriptionId && stripeCustomerId) {
          const { data: utente } = await supabase
            .from("utenti")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .single();

          const userId = utente?.id ?? null;

          // Recupero ID abbonamento nel DB (retry leggero)
          let abbonamentoId: number | null = null;
          for (let i = 0; i < 5; i++) {
            const { data: abbon } = await supabase
              .from("abbonamenti")
              .select("id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();
            if (abbon) { abbonamentoId = abbon.id; break; }
            await new Promise(r => setTimeout(r, 600));
          }

          const amountPaid = (invoice.amount_paid ?? 0) / 100;

          if (userId) {
            const { error } = await supabase.from("pagamenti").insert({
              utente_id: userId,
              importo: amountPaid,
              metodo: "altro", // opzionale: estrai brand da invoice.payments.data.payment se ti serve
              tipo_acquisto: "abbonamento",
              riferimento_id: abbonamentoId,
              stripe_subscription_id: subscriptionId,
              stato: "pagato",
            });
            if (error) console.error(" - 🚫 Errore insert pagamenti:", error);
          }
        }

        break;
      }

      /* =========================== OTHERS ============================ */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`➡️ customer.subscription.deleted id=${subscription.id}`);
        const { error: errUpdate } = await supabase
          .from("abbonamenti_utente")
          .update({ stato: "cancellato" })
          .eq("stripe_subscription_id", subscription.id);
        if (errUpdate) console.error(" - 🚫 Errore update abbonamento:", errUpdate);
        break;
      }

      default:
        console.log(`➡️ Evento non gestito: ${event.type}.`);
        break;
    }
  } catch (err) {
    console.error(`❌ Errore interno durante la gestione dell'evento ${event.type}:`, err);
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
