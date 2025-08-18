import { type NextRequest, NextResponse } from "next/server"
import { getDiscotecheUtente } from "@/lib/database-functions"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const utenteId = searchParams.get("utente_id")

    if (!utenteId) {
      return NextResponse.json({ error: "utente_id è richiesto" }, { status: 400 })
    }

    const discoteche = await getDiscotecheUtente(utenteId)
    return NextResponse.json(discoteche)
  } catch (error) {
    console.error("Errore API discoteche:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
