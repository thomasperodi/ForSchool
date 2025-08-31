import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

// Inizializza Stripe con la versione API più recente
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, promoCode, userId } = await req.json();

    // Validazione input
    if (!priceId) {
      console.error("Errore: priceId mancante nella richiesta.");
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }
    if (!userId) {
      console.error("Errore: userId mancante nella richiesta.");
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    console.log(`✅ Inizializzazione checkout per utente: ${userId}, piano: ${priceId}`);

    // 1. Verifica l'esistenza del piano in Supabase
    const { data: piano, error: errPiano } = await supabase
      .from("piani_abbonamento")
      .select("id, nome, stripe_price_id")
      .eq("stripe_price_id", priceId)
      .single();

    if (errPiano || !piano) {
      console.error(`🚫 Errore: Piano non valido o non trovato per priceId ${priceId}. Errore Supabase:`, errPiano);
      return NextResponse.json({ error: "Piano non valido" }, { status: 400 });
    }

    // 2. Recupera l'utente da Supabase
    const { data: utente, error: errUtente } = await supabase
      .from("utenti")
      .select("id, email, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (errUtente || !utente) {
      console.error(`🚫 Errore: Utente non trovato per userId ${userId}. Errore Supabase:`, errUtente);
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    let customerId = utente.stripe_customer_id;

    // 3. Se l'utente non ha un customerId Stripe, crealo e aggiorna Supabase
    if (!customerId) {
      console.log(`➡️ Nessun Stripe Customer ID trovato. Creazione nuovo cliente per utente ${userId}.`);
      const customer = await stripe.customers.create({
        metadata: { supabaseUserId: utente.id },
        email: utente.email || undefined,
      });

      customerId = customer.id;

      const { error: updateErr } = await supabase
        .from("utenti")
        .update({ stripe_customer_id: customerId })
        .eq("id", utente.id);

      if (updateErr) {
        console.error("🚫 Errore aggiornamento utente con Stripe Customer ID:", updateErr);
        return NextResponse.json({ error: "Errore aggiornamento utente" }, { status: 500 });
      }
    }

    // 4. Validazione e recupero del codice promozionale Stripe
    let promotionCodeStripeId: string | undefined = undefined;

    if (promoCode) {
      console.log(`➡️ Verifica codice promozionale: ${promoCode}`);
      // Controlla validità del codice ambassador nel DB locale
      const { data: codiceAmb, error: errCodice } = await supabase
        .from("codici_ambassador")
        .select("codice, max_usi, usi_correnti, scadenza")
        .eq("codice", promoCode)
        .single();

      if (
        errCodice ||
        !codiceAmb ||
        (codiceAmb.scadenza && new Date(codiceAmb.scadenza) < new Date()) ||
        (codiceAmb.max_usi !== null && codiceAmb.usi_correnti >= codiceAmb.max_usi)
      ) {
        console.warn(`⚠️ Codice ambassador ${promoCode} non valido, scaduto o esaurito.`);
        return NextResponse.json({ error: "Codice ambassador non valido o scaduto" }, { status: 400 });
      }

      // Recupera il promotion_code da Stripe
      const stripePromo = await stripe.promotionCodes.list({ code: promoCode, active: true });
      if (stripePromo.data.length > 0) {
        promotionCodeStripeId = stripePromo.data[0].id;
        console.log(`✅ Codice promozionale Stripe trovato: ${promotionCodeStripeId}`);
      } else {
        console.warn(`⚠️ Codice promozionale Stripe non trovato per il codice locale ${promoCode}.`);
      }
    }

    // 5. Crea la sessione di checkout Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "paypal", "klarna", "amazon_pay", "revolut_pay"],
      customer: customerId,
      
      line_items: [
        {
          price: priceId,
          quantity: 1,
          
        },
      ],
      // Passa l'ID utente nei metadata della subscription creata dalla Checkout Session
      subscription_data: {
        metadata: {
          userId: utente.id,
          promoCode : promoCode
        },
      },
      discounts: promotionCodeStripeId ? [{ promotion_code: promotionCodeStripeId }] : undefined,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/canceled`,
    });

    console.log(`🎉 Sessione di checkout creata con successo. URL: ${session.url}`);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("❌ Errore interno durante la creazione della sessione di checkout:", error);
    // Prova a recuperare il messaggio di errore in modo sicuro
    const messaggioErrore = error instanceof Error ? error.message : "Errore sconosciuto";
    return NextResponse.json({ error: "Errore interno server", message: messaggioErrore }, { status: 500 });
  }
}