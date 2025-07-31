import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // versione valida e stabile
});
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Errore sconosciuto";
}
interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variantId?: string;
  merchantStripeAccountId?: string; // opzionale, usiamo fisso
}

export async function POST(req: NextRequest) {
  try {
    const { cartItems, userId }: { cartItems: CartItem[]; userId?: string } = await req.json();

    // Validazioni base
    if (!userId) {
      return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });
    }
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
    }

    // ID merchant Stripe fisso (modifica se variabile)
    const merchandisingStripeAccountId = "acct_1RqdfuQAUpTkHHzD";

    // Costruiamo i line_items per Stripe
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cartItems.map(item => ({
      price_data: {
        currency: "eur",
        product_data: {
          name: item.productName,
          images: [item.imageUrl],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // Calcolo commissione (min 1 euro, o 5%)
    const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const siteFee = Math.max(1, subtotal * 0.05);

    // Aggiungiamo la commissione come linea separata (opzionale)
    line_items.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Commissione piattaforma" },
        unit_amount: Math.round(siteFee * 100),
      },
      quantity: 1,
    });

    // Creiamo la sessione di checkout Stripe con split payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items,
      payment_intent_data: {
        application_fee_amount: Math.round(siteFee * 100),
        transfer_data: {
          destination: merchandisingStripeAccountId,
        },
      },
      metadata: {
        user_id: userId,
        tipo_acquisto: "merch",
      },
      success_url: `${req.nextUrl.origin}/success`,
      cancel_url: `${req.nextUrl.origin}/cart`,
    });

    // Salviamo gli ordini in Supabase
    const ordiniData = cartItems.map(item => ({
      utente_id: userId,
      prodotto_id: item.productId,
      quantita: item.quantity,
      stato: "in_attesa",
      variante_id: item.variantId || null,
    }));

    const { data: ordini, error: ordiniError } = await supabase
      .from("ordini_merch")
      .insert(ordiniData)
      .select();

    if (ordiniError) {
      console.error("Errore inserimento ordini:", ordiniError);
      return NextResponse.json({ error: "Errore inserimento ordini" }, { status: 500 });
    }

    // Troviamo l’utente merchant in Supabase tramite stripe_account_id
    const { data: destinatario, error: destErr } = await supabase
      .from("utenti")
      .select("id")
      .eq("stripe_account_id", merchandisingStripeAccountId)
      .single();

    if (destErr || !destinatario) {
      console.error("Utente merchant non trovato con stripe_account_id:", merchandisingStripeAccountId);
      return NextResponse.json({ error: "Utente merchant non trovato" }, { status: 500 });
    }

    // Salviamo i pagamenti pending in Supabase
    // Ripartiamo la commissione proporzionalmente per ogni prodotto
    const commissionePerItem = siteFee / cartItems.length;

    const pagamentiData = cartItems.map((item, idx) => ({
      utente_id: userId,
      destinatario_id: destinatario.id,
      stripe_dest_account: merchandisingStripeAccountId,
      importo: item.price * item.quantity,
      commissione: commissionePerItem,
      metodo: "carta",
      tipo_acquisto: "merch",
      riferimento_id: ordini[idx].id,
      stato: "pending",
      stripe_checkout_session_id: session.id,
      stripe_flusso: "checkout",
    }));

    const { error: pagamentoError } = await supabase
      .from("pagamenti")
      .insert(pagamentiData);

    if (pagamentoError) {
      console.error("Errore inserimento pagamenti:", pagamentoError);
      return NextResponse.json({ error: "Errore inserimento pagamenti" }, { status: 500 });
    }

    // Tutto ok, ritorniamo URL checkout
    return NextResponse.json({ url: session.url });

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Errore nel checkout:", message);
    return NextResponse.json(
      { error: "Errore nel checkout", details: message },
      { status: 500 }
    );
  }
}
