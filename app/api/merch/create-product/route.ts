import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createProdotto } from "@/lib/crea-prodotto";
import { NewProdottoMerch, VarianteProdottoMerch } from "@/types/database";
// Non avrai più bisogno di supabaseAdmin qui per l'upload diretto
// import { supabaseAdmin } from "@/lib/supabaseClientAdmin"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const prodotto: NewProdottoMerch = JSON.parse(formData.get("prodotto") as string);
    const varianti: VarianteProdottoMerch[] = JSON.parse(formData.get("varianti") as string);
    const taglieProdotto: number[] = JSON.parse(formData.get("taglieProdotto") as string);

    // 1. Recupero i file immagini dal FormData
    const immaginiFiles: File[] = [];
    formData.forEach((value, key) => {
      if (key.startsWith("immagini") && value instanceof File) {
        immaginiFiles.push(value);
      }
    });

    // DEBUG: Aggiungi questo log per confermare che le immagini vengono passate correttamente
    console.log("DEBUG: Immagini Files passate a createProdotto:", immaginiFiles.map(f => f.name));

    // Non carichiamo più le immagini qui, lo farà createProdotto dopo aver creato il prodotto nel DB.
    // Il blocco "2. Carica immagini su Supabase Storage" è stato rimosso.

    // 2. Creazione prodotto su Stripe (Questa logica rimane qui, non dipende dall'ID del DB)
    const stripeProduct = await stripe.products.create({
      name: prodotto.nome,
      description: prodotto.descrizione ?? undefined,
      metadata: { scuola_id: prodotto.scuola_id?.toString() ?? "" },
    });

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(prodotto.prezzo * 100),
      currency: "eur",
      product: stripeProduct.id,
    });

    // 3. Mappa le varianti
    const variantiForm = varianti.map((v) => ({
      ...v,
      stock: v.stock?.toString() ?? "0",
      prezzo_override:
        v.prezzo_override !== null && v.prezzo_override !== undefined
          ? v.prezzo_override.toString()
          : "",
      immagine: [], // puoi associare immagini alle varianti se serve
      taglie: v.taglia ? JSON.parse(v.taglia) : [],
    }));

    // 4. Salva nel DB tramite createProdotto, che ora gestirà anche l'upload delle immagini.
    const success = await createProdotto(
      {
        ...prodotto,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
      },
      immaginiFiles, // Passiamo i File originali alla funzione
      variantiForm,
      taglieProdotto
    );

    if (!success) {
      return NextResponse.json(
        { success: false, message: "Errore creazione prodotto" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      prodottoStripeId: stripeProduct.id,
      prezzoStripeId: stripePrice.id,
    });
  } catch (error: unknown) {
    console.error("Errore API create prodotto:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          typeof error === "object" && error !== null && "message" in error
            ? (error as { message: string }).message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
