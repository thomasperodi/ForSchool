import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const utente_id = url.searchParams.get("utente_id");

  if (!utente_id) {
    return NextResponse.json(
      { canRedeem: false, reason: "utente_id mancante" },
      { status: 400 }
    );
  }

  try {
    // Prova a recuperare abbonamento attivo
    const { data: abbonamento, error: abbonamentoError } = await supabase
      .from("abbonamenti")
      .select("piani_abbonamento(nome)")
      .eq("utente_id", utente_id)
      .eq("stato", "active")
      .limit(1)
      .single();

    let piano = "free"; // default piano free se non trovato

    if (!abbonamentoError && abbonamento) {
      piano = abbonamento.piani_abbonamento[0].nome.toLowerCase();
    }

    if (piano === "elite" || piano === "plus") {
      return NextResponse.json({ canRedeem: true, riscattiQuestoMese: 0, nextRedeemInSeconds: 0 });
    }

    // Logica per piano free (anche se non c'è abbonamento attivo)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: riscatti, error: riscattiError } = await supabase
      .from("attivazioni_promozioni")
      .select("data_attivazione")
      .eq("utente_id", utente_id)
      .gte("data_attivazione", startOfMonth.toISOString());

    if (riscattiError) {
      return NextResponse.json(
        { canRedeem: false, reason: "Errore nel recupero riscatti" },
        { status: 500 }
      );
    }

    // Controlla se ha riscattato negli ultimi 7 giorni
    const ultimoRiscatto = riscatti
      .map(r => new Date(r.data_attivazione))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (ultimoRiscatto) {
      const nextPossibleRedeemDate = new Date(ultimoRiscatto);
      nextPossibleRedeemDate.setDate(nextPossibleRedeemDate.getDate() + 7);

      if (now < nextPossibleRedeemDate) {
        const nextRedeemInSeconds = Math.floor(
          (nextPossibleRedeemDate.getTime() - now.getTime()) / 1000
        );
        return NextResponse.json(
          {
            canRedeem: false,
            reason: "Puoi riscattare una promozione ogni 7 giorni con il piano Free.",
            nextRedeemInSeconds,
            riscattiQuestoMese: riscatti.length
          },
          { status: 200 }
        );
      }
    }

    if (riscatti.length >= 4) {
      return NextResponse.json(
        {
          canRedeem: false,
          reason: "Hai raggiunto il limite di 4 riscatti per questo mese.",
          nextRedeemInSeconds: 0,
          riscattiQuestoMese: riscatti.length
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ canRedeem: true, nextRedeemInSeconds: 0, riscattiQuestoMese: riscatti.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { canRedeem: false, reason: "Errore interno" },
      { status: 500 }
    );
  }
}
