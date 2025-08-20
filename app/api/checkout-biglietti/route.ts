import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Discoteca } from "@/types/database"; // Assuming this path is correct

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // Using a stable API version
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Retrieves or creates a Stripe customer for a given user.
 * @param userId The ID of the user.
 * @param email The email of the user.
 * @returns The Stripe customer ID.
 */
async function getOrCreateStripeCustomer(userId: string | null, email: string) {
  // If no userId is provided, return undefined as no customer can be linked
  if (!userId) return undefined;

  // Fetch the user from Supabase to check for an existing Stripe customer ID
  const { data: user, error } = await supabase
    .from("utenti")
    .select("id, stripe_customer_id")
    .eq("id", userId)
    .single();

  // If there's an error fetching the user, throw it
  if (error) throw new Error("Utente non trovato: " + error.message);

  // If a Stripe customer ID already exists, return it
  if (user.stripe_customer_id) return user.stripe_customer_id;

  // If no Stripe customer ID, create a new one in Stripe
  const customer = await stripe.customers.create({
    email,
    metadata: { userId }, // Link the customer to your internal userId
  });

  // Update the user's record in Supabase with the new Stripe customer ID
  const { error: updateError } = await supabase
    .from("utenti")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);

  // If there's an error updating the user, throw it
  if (updateError)
    throw new Error("Errore aggiornamento stripe_customer_id: " + updateError.message);

  // Return the newly created Stripe customer ID
  return customer.id;
}

/**
 * Handles POST requests for creating Stripe checkout sessions or payment intents.
 * @param req The NextRequest object containing purchase details.
 * @returns A NextResponse object with either a checkout URL or a client secret.
 */
export async function POST(req: NextRequest) {
  try {
    // Destructure request body to get purchase details and platform
    const { eventoId, quantity, userId, email, platform } = await req.json();

    // Retrieve event details from Supabase
    const { data: evento, error: eventoError } = await supabase
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

    // Cast discoteca data to the correct type
    const discoteca = evento?.discoteca as unknown as Discoteca | null;
    console.log("discoteca_stripe_account_id:", discoteca?.stripe_account_id);

    // Handle cases where the event is not found or data is missing
    if (eventoError || !evento) {
      return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
    }
    if (!evento.stripe_price_id || !discoteca?.stripe_account_id) {
      return NextResponse.json(
        { error: "Evento senza price_id o account Stripe connesso" },
        { status: 400 }
      );
    }

    const piattaformaFee = 100; // 1€ in cents for platform fee

    // Prepare tickets data for insertion into Supabase
    const bigliettiToInsert = Array.from({ length: quantity }).map(() => ({
      utente_id: userId || null, // Link to user or set as null for anonymous
      evento_id: eventoId,
      stato_pagamento: "in_attesa", // Initial payment status
      prezzo_pagato: evento.prezzo,
    }));

    // Insert tickets into the 'biglietti' table in Supabase
    const { data: biglietti, error: bigliettiError } = await supabase
      .from("biglietti")
      .insert(bigliettiToInsert)
      .select(); // Select the inserted data to get their IDs

    // Handle errors during ticket creation
    if (bigliettiError || !biglietti) {
      console.error("Errore creazione biglietti:", bigliettiError);
      return NextResponse.json({ error: "Errore creazione biglietti" }, { status: 500 });
    }

    // Extract IDs of the newly created tickets
    const bigliettiIds = biglietti.map((b) => b.id);

    // Get or create the Stripe customer ID
    const customerId = await getOrCreateStripeCustomer(userId, email);

    // Conditional logic based on platform (web vs. mobile)
    if (platform === "web") {
      // Create a Stripe Checkout Session for web platforms
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card", "paypal", "klarna", "amazon_pay", "revolut_pay"],
        line_items: [
          {
            price: evento.stripe_price_id, // Use the Stripe Price ID for the event ticket
            quantity,
          },
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: "Costi di gestione", // Label for the platform fee
              },
              unit_amount: piattaformaFee, // Platform fee in cents
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: piattaformaFee, // Amount for your platform
          transfer_data: {
            destination: discoteca.stripe_account_id, // Transfer to the connected account
          },
        },
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/evento/${eventoId}?canceled=true`,
        customer: customerId, // Attach customer to the session
        metadata: {
          userId: userId || "anonimo",
          evento_id: eventoId,
          biglietti_id: JSON.stringify(bigliettiIds),
          tipo_acquisto: "biglietti",
        },
      });
      // Return the URL for redirecting the user to Stripe Checkout
      return NextResponse.json({ url: session.url, biglietti });

    } else if (platform === "mobile") {
      // Create a Payment Intent for mobile platforms (Stripe SDK)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: evento.prezzo * quantity * 100 + piattaformaFee, // Total amount in cents
        currency: "eur",
        customer: customerId,
        payment_method_types: ["card"], // Only card for PaymentSheet
        metadata: {
          userId: userId || "anonimo",
          evento_id: eventoId,
          biglietti_id: JSON.stringify(bigliettiIds),
          tipo_acquisto: "biglietti",
        },
        application_fee_amount: piattaformaFee,
        transfer_data: {
          destination: discoteca.stripe_account_id,
        },
      });
      // Return the client secret to the mobile client
      return NextResponse.json({ clientSecret: paymentIntent.client_secret, biglietti });

    } else {
      // Handle cases where platform is not recognized
      return NextResponse.json({ error: "Piattaforma non supportata" }, { status: 400 });
    }

  } catch (err) {
    // Log and return internal server error
    console.error("Errore in checkout-biglietti:", err);
    const messaggio = err instanceof Error ? err.message : "Errore interno del server";
    return NextResponse.json({ error: messaggio }, { status: 500 });
  }
}