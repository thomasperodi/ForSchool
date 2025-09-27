// app/api/valid-promo-codes/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE! // chiave server (NON esporla lato client)
    );

    // Adatta i campi alla tua tabella: qui assumo colonne: codice (text), attivo (bool)
    const { data, error } = await supabase
      .from("codici_ambassador")
      .select("codice, attivo");

    if (error) {
      return NextResponse.json(
        { error: "Errore nel recupero dei codici promozionali" },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Nessun codice promozionale trovato" },
        { status: 404 }
      );
    }

    // Filtra solo i codici attivi e normalizza in UPPERCASE per il confronto lato client
    const codes = data
      .filter((r) => r.attivo !== false) // se non hai la colonna 'attivo', rimuovi questo filtro
      .map((r) => (r.codice || "").toUpperCase())
      .filter(Boolean);

    return NextResponse.json({ codes }, { status: 200 });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { error: err.message ?? "Errore sconosciuto" },
      { status: 500 }
    );
  }
}
