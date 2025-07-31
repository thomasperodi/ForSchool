import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});


export async function POST(req: NextRequest) {
  try {
    const { priceId, promoCode, userId } = await req.json();

    // Validazione base
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Recupera utente da Supabase
    const { data: utente, error: utenteErr } = await supabase
      .from("utenti")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (utenteErr || !utente) {
      console.error("Utente non trovato:", utenteErr);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log(utente.stripe_customer_id)
    let customerId = utente.stripe_customer_id;

    // Se utente non ha stripe_customer_id, lo crea e aggiorna il db
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { supabaseUserId: utente.id },
        email: "", // opzionale: se hai email, puoi passarla
      });

      console.log("customer creato se manca id", customer)

      customerId = customer.id;

      console.log("customer id di quello creato" ,customerId)

      // Aggiorna utente con stripe_customer_id
      const { error: updateErr } = await supabase
        .from("utenti")
        .update({ stripe_customer_id: customerId })
        .eq("id", utente.id);

      if (updateErr) {
        console.error("Errore aggiornamento stripe_customer_id:", updateErr);
        return NextResponse.json(
          { error: "Failed to update user with customer id" },
          { status: 500 }
        );
      }
    }

    // Crea la sessione di checkout con customer
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
      discounts: promoCode
        ? [
            {
              promotion_code: await getPromotionCodeId(promoCode),
            },
          ]
        : undefined,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}

// Funzione helper per recuperare l'ID di un promotion code
async function getPromotionCodeId(code: string) {
  const promoCodes = await stripe.promotionCodes.list({ code, active: true });
  if (!promoCodes.data.length) return undefined;
  return promoCodes.data[0].id;
}
