import { deleteOrdineMerch } from '@/lib/database-functions';
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variantId?: string;
  merchantStripeAccountId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { cartItems, userId }: { cartItems: CartItem[]; userId: string } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
    }

    const merchandisingStripeAccountId = "acct_1RqdfuQAUpTkHHzD"; // ID fisso merchant Stripe Connect
    const MerchantId= "992d845f-06b0-448d-b81b-cb21546a5c01"

    // 1️⃣ Line items per Stripe Checkout
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

    const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const siteFee = Math.max(1, subtotal * 0.05); // Commissione minima: 1€

    // Aggiungi voce per la commissione nel carrello (opzionale)
    line_items.push({
      price_data: {
        currency: "eur",
        product_data: { name: "Commissione piattaforma" },
        unit_amount: Math.round(siteFee * 100),
      },
      quantity: 1,
    });

    // 2️⃣ Crea sessione Stripe con metadati
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
    });

    // 3️⃣ Salva ordini nel DB
    const ordiniData = cartItems.map((item) => ({
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
      return NextResponse.json({ error: "Errore ordini" }, { status: 500 });
    }

    const { data: destinatario, error: destErr } = await supabase
  .from('utenti')
  .select('id')
  .eq('stripe_account_id', merchandisingStripeAccountId)
  .single();

if (destErr || !destinatario) {
  console.error("❌ Nessun utente trovato con questo Stripe Account ID:", merchandisingStripeAccountId);
  return NextResponse.json({ error: "Utente merchant non trovato" }, { status: 500 });
}
    // 4️⃣ Salva pagamenti pending
    const pagamentiData = cartItems.map((item, idx) => ({
      utente_id: userId,
      destinatario_id: destinatario.id,
      stripe_dest_account: merchandisingStripeAccountId,
      importo: item.price * item.quantity,
      commissione: siteFee / cartItems.length,
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
      console.error("Errore salvataggio pagamento:", pagamentoError);
      return NextResponse.json({ error: "Errore pagamento" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Errore nel checkout:", err);
    return NextResponse.json({ error: "Errore nel checkout" }, { status: 500 });
  }
}
