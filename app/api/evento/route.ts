import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const GET = async () => {
  try {
    const { data: eventi, error } = await supabase
  .from("eventi")
  .select(`
    id,
    nome,
    descrizione,
    data,
    prezzo,
    locandina_url,
    max_partecipanti,
    stripe_product_id,
    stripe_price_id,
    discoteca_id,
    biglietti(count),
    discoteche (
      nome,
      indirizzo
    )
  `)
  .eq("stato", "attivo")
  .order("data", { ascending: true });


    if (error) {
      throw error;
    }

    // Mappa i dati per calcolare i posti rimanenti in base ai biglietti venduti
    const eventiConPostiDisponibili = eventi.map((evento) => {
      // Supabase restituisce un array, anche se il conteggio è unico.
      const bigliettiVenduti = evento.biglietti[0]?.count || 0;
      
      // Calcola i posti rimanenti. Usa Math.max per evitare numeri negativi.
      const postiRimanenti = evento.max_partecipanti !== null
        ? Math.max(0, evento.max_partecipanti - bigliettiVenduti)
        : null;

      // Restituisce un nuovo oggetto pulito con i dati necessari per il frontend
      return {
        ...evento,
        biglietti: undefined, // Rimuovi il campo 'biglietti' per pulizia
        posti_rimanenti: postiRimanenti,
      };
    });

    return NextResponse.json(eventiConPostiDisponibili);
  } catch (err) {
    console.error("Errore fetch eventi:", err);
    return NextResponse.json({ error: "Impossibile recuperare gli eventi" }, { status: 500 });
  }
};
