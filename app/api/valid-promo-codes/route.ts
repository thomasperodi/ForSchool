// app/api/valid-promo-codes/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {


    // Adatta i campi alla tua tabella: qui assumo colonne: codice (text), attivo (bool)
    const { data, error } = await supabase
      .from("codici_ambassador")
      .select("codice");

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
    const codes = data // se non hai la colonna 'attivo', rimuovi questo filtro
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
