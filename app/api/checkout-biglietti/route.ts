import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getOrCreateStripeCustomer(userId: string | null, email: string) {
  if (!userId) return undefined; // utente anonimo, Stripe creerà un customer temporaneo

  const { data: user, error } = await supabase
    .from("utenti")
    .select("id, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error) throw new Error("Utente non trovato: " + error.message);

  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  const { error: updateError } = await supabase
    .from("utenti")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  if (updateError) throw new Error("Errore aggiornamento stripe_customer_id: " + updateError.message);

  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    const { eventoId, quantity, userId, email } = await req.json();

    // Recupera dati evento
    const { data: evento, error } = await supabase
      .from("eventi")
      .select("*")
      .eq("id", eventoId)
      .single();

    if (error || !evento) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });

    // CREA BIGLIETTI IN SUPABASE
    const bigliettiToInsert = Array.from({ length: quantity }).map(() => ({
      utente_id: userId || null,
      evento_id: eventoId,
      stato_pagamento: "in_attesa",
      prezzo_pagato: evento.prezzo,
    }));

    const { data: biglietti, error: bigliettiError } = await supabase
      .from("biglietti")
      .insert(bigliettiToInsert)
      .select();

    if (bigliettiError || !biglietti) {
      console.error("Errore creazione biglietti:", bigliettiError);
      return NextResponse.json({ error: "Errore creazione biglietti" }, { status: 500 });
    }

    const bigliettiIds = biglietti.map((b) => b.id);

    // Recupera o crea customer_id
    const customerId = await getOrCreateStripeCustomer(userId, email);

    // Crea la sessione di checkout Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${evento.nome} - Biglietto Discoteca`,
            },
            unit_amount: evento.prezzo * 100,
          },
          quantity,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?canceled=true`,
      customer: customerId,
      metadata: {
        utente_id: userId || "anonimo",
        evento_id: eventoId,
        biglietti_id: JSON.stringify(bigliettiIds), // <- così puoi recuperarli nel webhook
      },
    });

    return NextResponse.json({ url: session.url, biglietti });
  } catch (err) {
    console.error("Errore in checkout-biglietti:", err);
    const messaggio = err instanceof Error ? err.message : "Errore interno del server";
    return NextResponse.json({ error: messaggio }, { status: 500 });
  }
}
