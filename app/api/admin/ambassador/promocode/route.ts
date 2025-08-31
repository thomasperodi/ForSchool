import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from "@/lib/supabaseClient"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
})

// supabase admin client


export async function POST(req: NextRequest) {
  try {
    const { email, codice, sconto_percentuale, sconto_importo, max_usi, scadenza } =
      await req.json()

    // trova l'utente
    const { data: user, error: userError } = await supabase
      .from("utenti")
      .select("id")
      .eq("email", email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 400 })
    }

    // crea coupon stripe


    // crea promo code stripe collegato al coupon
    const promoCode = await stripe.promotionCodes.create({
      code: codice,
      coupon: "oFaGrlAS",
      max_redemptions: max_usi || undefined,
      expires_at: scadenza ? Math.floor(new Date(scadenza).getTime() / 1000) : undefined,
    })

    // aggiorna utente a ambassador
    await supabase
      .from("utenti")
      .update({ is_ambassador: true})
      .eq("id", user.id)

    // salva in codici_ambassador
    await supabase.from("codici_ambassador").insert({
      codice,
      ambassador_id: user.id,
      sconto_percentuale: sconto_percentuale ? Number(sconto_percentuale) : null,
      sconto_importo: sconto_importo ? Number(sconto_importo) : null,
      max_usi: max_usi || null,
      scadenza: scadenza || null,
    })

    return NextResponse.json({ success: true, promoCode })
  } catch (err) {
    console.error(err)
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    } else {
      return NextResponse.json({ error: "Errore sconosciuto" }, { status: 500 })
    }
  }
}
