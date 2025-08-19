import { type NextRequest, NextResponse } from "next/server"
import { aggiornaEvento, eliminaEvento } from "@/lib/database-functions"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const aggiornamenti = await request.json()
    console.log(aggiornamenti)
    // Se params è una promise, fai await
    const { id } = await params;

    const eventoAggiornato = await aggiornaEvento(id, aggiornamenti)
    return NextResponse.json(eventoAggiornato)
  } catch (error) {
    console.error("Errore aggiornamento evento:", error)
    return NextResponse.error()
  }
}


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await eliminaEvento(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Errore eliminazione evento:", error)
    return NextResponse.json({ error: "Errore nell'eliminazione dell'evento" }, { status: 500 })
  }
}
