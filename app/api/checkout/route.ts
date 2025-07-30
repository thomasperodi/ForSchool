
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

// Definiamo un'interfaccia per gli item del carrello
interface CartItem {
  productId: string;
  productName: string;
  imageUrl: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variantId?: string; // aggiunto per collegare alla tabella varianti
  merchantStripeAccountId: string; 
}

export async function POST(req: NextRequest) {
  try {
    const { cartItems, userId }: { cartItems: CartItem[]; userId: string } =
      await req.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Carrello vuoto" }, { status: 400 });
    }

    const merchandisingStripeAccountId = "acct_1RqdfuQAUpTkHHzD"; // ID fisso del merchant Stripe Connect

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
const siteFee = Math.max(1, subtotal * 0.05); // 5% di commissione, minimo 1€ DA RIVEDERE 

line_items.push({
  price_data: {
    currency: "eur",
    product_data: { name: "Commissione piattaforma" },
    unit_amount: Math.round(siteFee * 100),
  },
  quantity: 1,
});

const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",
  line_items,
  payment_intent_data: {
    application_fee_amount: Math.round(siteFee * 100),  // commissione piattaforma in centesimi
    transfer_data: {
      destination: merchandisingStripeAccountId,           // merchant Stripe Connect ID
    },
  },
  success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
  cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cart`,
});



    // 4️⃣ Salva ordini nel DB
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

    // 5️⃣ Salva il pagamento come pending
    const { error: pagamentoError } = await supabase.from("pagamenti").insert({
      utente_id: userId,
      importo: subtotal + siteFee,
      metodo: "carta",
      tipo_acquisto: "merch",
      riferimento_id: ordini[0].id, // puoi usare il primo ordine come riferimento principale
      stato: "pagato", // oppure 'pending' e aggiornarlo con webhook
      commissione: siteFee,
      stripe_checkout_session_id: session.id,
      stripe_flusso: "checkout",
    });

    if (pagamentoError) {
      console.error("Errore inserimento pagamento:", pagamentoError);
      return NextResponse.json({ error: "Errore pagamento" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Errore Stripe:", err);
    return NextResponse.json({ error: "Errore nel checkout" }, { status: 500 });
  }
}