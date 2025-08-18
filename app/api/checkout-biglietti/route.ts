import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Discoteca } from "@/types/database";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getOrCreateStripeCustomer(userId: string | null, email: string) {
  if (!userId) return undefined;

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

  if (updateError)
    throw new Error("Errore aggiornamento stripe_customer_id: " + updateError.message);

  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    const { eventoId, quantity , userId, email } = await req.json();

    // Recupera dati evento
   const { data: evento, error } = await supabase
  .from('eventi')
  .select(`
    id,
    nome,
    descrizione,
    data,
    prezzo,
    locandina_url,
    discoteca_id,
    max_partecipanti,
    stato,
    stripe_product_id,
    stripe_price_id,
    discoteca:discoteca_id (
      id,
      nome,
      indirizzo,
      stripe_account_id
    )
  `)
  .eq('id', eventoId)
  .single();

  
 const discoteca = evento?.discoteca as unknown as Discoteca | null;
console.log("discoteca_stripe_account_id:", discoteca?.stripe_account_id);





    if (error || !evento) {
      return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
    }
    if (!evento.stripe_price_id || !discoteca?.stripe_account_id) {
      return NextResponse.json(
        { error: "Evento senza price_id o account Stripe" },
        { status: 400 }
      );
    }
    const piattaformaFee = 100; // 1€ in centesimi

    // CREA BIGLIETTI IN SUPABASE



// CREA BIGLIETTI IN SUPABASE
const bigliettiToInsert = Array.from({ length: quantity }).map(() => ({
  utente_id: userId || null,
  evento_id: eventoId,
  stato_pagamento: "in_attesa",
  prezzo_pagato: evento.prezzo , // riconvertiamo in euro
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

    // Imposta la fee della piattaforma (in centesimi)

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      price: evento.stripe_price_id,
      quantity,
    },
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: "Costi di gestione",
        },
        unit_amount: piattaformaFee,
      },
      quantity: 1,
    },
  ],
  payment_intent_data: {
    application_fee_amount: piattaformaFee,
    transfer_data: {
      destination: discoteca?.stripe_account_id || "",
    },
  },
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?canceled=true`,
  customer: customerId,
  metadata: {
    userId: userId || "anonimo",
    evento_id: eventoId,
    biglietti_id: JSON.stringify(bigliettiIds),
    tipo_acquisto: "biglietti",
  },
});

    return NextResponse.json({ url: session.url, biglietti });
  } catch (err) {
    console.error("Errore in checkout-biglietti:", err);
    const messaggio = err instanceof Error ? err.message : "Errore interno del server";
    return NextResponse.json({ error: messaggio }, { status: 500 });
  }
}
