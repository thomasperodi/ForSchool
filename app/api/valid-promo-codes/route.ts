import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  // Qui puoi sostituire con dati dinamici o DB
  //collega a Supabase per recuperare i codici promozionali validi
  const { data: promoCodes, error } = await supabase
    .from("codici_ambassador")
    .select("codice")
    if (error) {
        return NextResponse.json({ error: "Errore nel recupero dei codici promozionali" }, { status: 500 });
        }
    if (!promoCodes || promoCodes.length === 0) {
        return NextResponse.json({ error: "Nessun codice promozionale trovato" }, { status: 404 });
    }
    // Filtra i codici promozionali validi
    
   
    


  return NextResponse.json({ codes: promoCodes.map(code => code.codice) }, { status: 200 });
}
