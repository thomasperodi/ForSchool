import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { items, userId, email, platform } = await req.json();
    console.log("=== DEBUG: Request received ===");
    console.log("Items:", items);
    console.log("UserId:", userId, "Email:", email, "Platform:", platform);

    if (platform === "web") {
      // Web: Checkout Session
      console.log("=== DEBUG: Creating Checkout Session (web) ===");
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
          userId,
          tipo_acquisto: "merch",
          items: JSON.stringify(items),
        },
      });
      console.log("=== DEBUG: Checkout Session created ===", session.id);
      return NextResponse.json({ url: session.url });
    } else if (platform === "mobile") {
      console.log("=== DEBUG: Creating Payment Intent (mobile) ===");
      let totalAmount = 0;

      for (const item of items) {
        console.log("Retrieving price for item:", item.priceId);
        const price = await stripe.prices.retrieve(item.priceId);
        console.log("Retrieved price:", price);

        if (!price.unit_amount) {
          console.error("Price unit_amount missing for item:", item.priceId);
          throw new Error("Price non trovato o unit_amount mancante");
        }
        totalAmount += price.unit_amount * item.quantity;
      }

      console.log("Total amount (cents):", totalAmount);

      const customer = email
        ? await stripe.customers.create({ email, metadata: { userId: userId || "anonimo" } })
        : undefined;
      if (customer) console.log("Customer created:", customer.id);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalAmount,
        currency: "eur",
        customer: customer?.id,
        payment_method_types: ["card", "paypal"],
        metadata: {
          userId: userId || "anonimo",
          tipo_acquisto: "merch",
          items: JSON.stringify(items),
        },
      });

      console.log("Payment Intent created:", paymentIntent.id);
      return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } else {
      console.error("Unsupported platform:", platform);
      return NextResponse.json({ error: "Piattaforma non supportata" }, { status: 400 });
    }
  } catch (err) {
    console.error("=== ERROR Stripe Checkout ===", err);
    const message = err instanceof Error ? err.message : "Errore interno del server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
