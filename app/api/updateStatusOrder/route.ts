import { NextRequest, NextResponse } from "next/server"
import { updateOrdersStatusAPI } from "@/lib/database-functions" // importa la tua funzione

type StatoOrdine = "in_attesa" | "spedito" | "ritirato"

export async function POST(req: NextRequest) {
  try {
    const { orderIds, newStatus } = await req.json()

    // Validazione
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds è obbligatorio e deve essere un array" }, { status: 400 })
    }

    // Controlla se newStatus è uno dei valori validi
    const validStatuses: StatoOrdine[] = ["in_attesa", "spedito", "ritirato"]
    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "newStatus non valido" }, { status: 400 })
    }

    // Ora puoi dire a TypeScript che newStatus è di tipo StatoOrdine
    const typedNewStatus = newStatus as StatoOrdine

    // Chiama la funzione con tipo corretto
    const updatedOrders = await updateOrdersStatusAPI(orderIds, typedNewStatus)

    if (!updatedOrders) {
      return NextResponse.json({ error: "Errore durante l'aggiornamento degli ordini" }, { status: 500 })
    }

    return NextResponse.json({ success: true, updatedOrders })
  } catch (error) {
    console.error("Errore API updateOrderStatus:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
