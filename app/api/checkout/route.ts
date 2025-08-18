import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});




export async function POST(req: NextRequest) {
  try {
    const { items, userId } = await req.json();
    console.log("Items received for checkout:", items);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: items.map((item: { priceId: string; quantity: number }) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      metadata: {
        userId, // chi ha fatto l’ordine
        tipo_acquisto: "merch", // tipo di acquisto
        // passiamo tutti i prezzi e le quantità serializzati
        items: JSON.stringify(
          items.map((item: { priceId: string; quantity: number }) => ({ priceId: item.priceId, quantity: item.quantity }))
        ),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Errore Stripe Checkout:", err);
    return NextResponse.json({ error: "Errore durante la creazione della sessione" }, { status: 500 });
  }
}
