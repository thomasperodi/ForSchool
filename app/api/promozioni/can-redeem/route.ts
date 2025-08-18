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
    // Recupera l'abbonamento attivo dell'utente
    const { data: abbonamenti, error: abbonamentoError } = await supabase
      .from("abbonamenti")
      .select(`
        piani_abbonamento (
          nome
        )
      `)
      .eq("utente_id", utente_id)
      .eq("stato", "active");

    if (abbonamentoError) throw abbonamentoError;

    let piano = "free"; // default

    if (abbonamenti && abbonamenti.length > 0) {
      piano = abbonamenti[0].piani_abbonamento.nome.toLowerCase();
    }

    console.log("Piano utente:", piano);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Recupera i riscatti del mese corrente
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

    // Logica per piani con limiti
    if (piano === "free") {
      // Controlla limite settimanale
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
          return NextResponse.json({
            canRedeem: false,
            reason: "Puoi riscattare una promozione ogni 7 giorni con il piano Free.",
            nextRedeemInSeconds,
            riscattiQuestoMese: riscatti.length
          });
        }
      }

      // Controlla limite mensile
      if (riscatti.length >= 4) {
        return NextResponse.json({
          piano: "free",
          canRedeem: false,
          reason: "Hai raggiunto il limite di 4 riscatti per questo mese.",
          nextRedeemInSeconds: 0,
          riscattiQuestoMese: riscatti.length
        });
      }

      return NextResponse.json({
        piano: "free",
        canRedeem: true,
        nextRedeemInSeconds: 0,
        riscattiQuestoMese: riscatti.length
      });
    }

    if (piano === "plus") {
      if (riscatti.length >= 15) {
        return NextResponse.json({
          piano: "plus",
          canRedeem: false,
          reason: "Hai raggiunto il limite di 15 riscatti per questo mese con il piano Plus.",
          nextRedeemInSeconds: 0,
          riscattiQuestoMese: riscatti.length
        });
      }
      return NextResponse.json({
        piano: "plus",
        canRedeem: true,
        nextRedeemInSeconds: 0,
        riscattiQuestoMese: riscatti.length
      });
    }

    if (piano === "elitè") {
      return NextResponse.json({
        piano: "elitè",
        canRedeem: true,
        nextRedeemInSeconds: 0,
        riscattiQuestoMese: riscatti.length
      });
    }

    // fallback
    return NextResponse.json({
      canRedeem: false,
      reason: "Piano non riconosciuto",
      nextRedeemInSeconds: 0,
      riscattiQuestoMese: riscatti.length
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { canRedeem: false, reason: "Errore interno" },
      { status: 500 }
    );
  }
}
