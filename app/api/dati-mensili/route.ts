import { type NextRequest, NextResponse } from "next/server"
import { getDatiMensili } from "@/lib/database-functions"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const discotecaId = searchParams.get("discoteca_id")

    if (!discotecaId) {
      return NextResponse.json({ error: "discoteca_id è richiesto" }, { status: 400 })
    }

    const datiMensili = await getDatiMensili(discotecaId)
    return NextResponse.json(datiMensili)
  } catch (error) {
    console.error("Errore API dati mensili:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
