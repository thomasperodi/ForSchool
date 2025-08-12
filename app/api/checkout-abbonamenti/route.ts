import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { priceId, promoCode, userId } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // 1. Verifica che il piano esista
   console.log("DEBUG: priceId ricevuto:", priceId);

const { data: piano, error: errPiano } = await supabase
  .from("piani_abbonamento")
  .select("id, nome, stripe_price_id")
  .eq("stripe_price_id", priceId)
  .single();

console.log("DEBUG: piano trovato:", piano, "errore:", errPiano);

    if (errPiano || !piano) {
      return NextResponse.json({ error: "Piano non valido" }, { status: 400 });
    }

    // 2. Recupera utente
    const { data: utente, error: errUtente } = await supabase
      .from("utenti")
      .select("id, email, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (errUtente || !utente) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    let customerId = utente.stripe_customer_id;

    // 3. Se manca stripe_customer_id, crealo e aggiorna db
    if (!customerId) {
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
        return NextResponse.json({ error: "Errore aggiornamento utente" }, { status: 500 });
      }
    }

    // 4. Validazione codice ambassador se presente
    let promotionCodeStripeId: string | undefined = undefined;

    if (promoCode) {
      // Controlla validità codice ambassador
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
        return NextResponse.json({ error: "Codice ambassador non valido o scaduto" }, { status: 400 });
      }

      // Recupera promotion_code da Stripe
      const stripePromo = await stripe.promotionCodes.list({ code: promoCode, active: true });
      if (stripePromo.data.length > 0) {
        promotionCodeStripeId = stripePromo.data[0].id;
      }
    }

    // 5. Crea sessione di checkout Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: promotionCodeStripeId ? [{ promotion_code: promotionCodeStripeId }] : undefined,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Errore API checkout:", error);
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 });
  }
}
