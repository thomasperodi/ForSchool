import { type NextRequest, NextResponse } from "next/server"
import { getEventiConStatistiche, creaEvento } from "@/lib/database-functions"

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
