import { type NextRequest, NextResponse } from "next/server"
import { getStatisticheDiscoteca } from "@/lib/database-functions"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const discotecaId = searchParams.get("p_discoteca_id")

    if (!discotecaId) {
      return NextResponse.json({ error: "discoteca_id è richiesto" }, { status: 400 })
    }

    const statistiche = await getStatisticheDiscoteca(discotecaId)
    return NextResponse.json(statistiche)
  } catch (error) {
    console.error("Errore API statistiche:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
