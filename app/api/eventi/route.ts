import { type NextRequest, NextResponse } from "next/server"
import { getEventiConStatistiche } from "@/lib/database-functions"
import Stripe from "stripe"
import { supabase } from "@/lib/supabaseClient"
import { Evento } from "@/types/database"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil", // usa sempre l’ultima stabile
})
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const discotecaId = searchParams.get("discoteca_id")

    if (!discotecaId) {
      return NextResponse.json({ error: "discoteca_id è richiesto" }, { status: 400 })
    }

    const eventi = await getEventiConStatistiche(discotecaId)
    return NextResponse.json(eventi)
  } catch (error) {
    console.error("Errore API eventi:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}


 async function creaEvento(evento: Omit<Evento, "id" | "product_id" | "price_id">) {
  // 1. Creazione prodotto su Stripe
  const product = await stripe.products.create({
    name: evento.nome, // suppongo tu abbia "nome" nell’oggetto evento
    description: evento.descrizione ?? undefined,
    metadata: {
      tipo: "evento",
    },
  })

  // 2. Creazione prezzo associato
  const price = await stripe.prices.create({
    unit_amount: Math.round(evento.prezzo * 100), // prezzo in centesimi
    currency: "eur",
    product: product.id,
  })

  // 3. Inserimento nel DB con product_id e price_id
  const { data, error } = await supabase
    .from("eventi")
    .insert([
      {
        ...evento,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Errore nella creazione evento:", error)
    throw error
  }

  return data
}
export async function POST(request: NextRequest) {
  try {
    const evento = await request.json()
    console.log("evento api", evento)

    const nuovoEvento = await creaEvento(evento)

    return NextResponse.json(nuovoEvento, { status: 201 })
  } catch (error) {
    console.error("Errore creazione evento:", error)
    return NextResponse.json({ error: "Errore nella creazione dell'evento" }, { status: 500 })
  }
}
