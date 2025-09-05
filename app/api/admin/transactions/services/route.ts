import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1"); // default pagina 1
    const limit = parseInt(url.searchParams.get("limit") || "20"); // default 20 elementi per pagina
    const offset = (page - 1) * limit;

    // Recupera tutti i pagamenti di tipo ripetizione o abbonamento
    const { data, error, count } = await supabase
      .from("pagamenti")
      .select(
        `
          id,
          importo,
          stato,
          tipo_acquisto,
          timestamp,
          utente:utente_id (nome,email),
          abbonamento_id
        `,
        { count: "exact" } // <- per ottenere il totale
      )
      .in("tipo_acquisto", ["ripetizione", "abbonamento"])
      .order("timestamp", { ascending: false })
      .range(offset, offset + limit - 1); // paginazione

    if (error) throw error;

    type Pagamento = {
      id: string;
      tipo_acquisto: "ripetizione" | "abbonamento";
      importo: number | string;
      stato: string;
      timestamp: string;
      utente?: { nome?: string; email?: string } | null;
      abbonamento_id?: string | null;
    };

    const pagamenti = data as Pagamento[];

    // Recupera i dettagli degli abbonamenti
    const abbonamentoIds = pagamenti
      .filter((p) => p.tipo_acquisto === "abbonamento" && p.abbonamento_id)
      .map((p) => p.abbonamento_id!) as string[];

    let abbonamentiMap: Record<string, { piano_nome?: string; data_fine?: string; ambassador_code?: string }> = {};

    if (abbonamentoIds.length) {
      const { data: abbonamenti } = await supabase
        .from("abbonamenti")
        .select("id,data_fine,ambassador_code,piano:piano_id(nome)")
        .in("id", abbonamentoIds);

      if (abbonamenti) {
        abbonamentiMap = Object.fromEntries(
          abbonamenti.map((a) => [
            a.id,
            {
              piano_nome: a.piano?.[0]?.nome ?? null,
              data_fine: a.data_fine ?? null,
              ambassador_code: a.ambassador_code ?? null,
            },
          ])
        );
      }
    }

    // Costruisci l'array finale
    const transactions = pagamenti.map((p) => ({
      id: p.id,
      tipo: p.tipo_acquisto,
      utente: p.utente?.nome ?? "Sconosciuto",
      email: p.utente?.email ?? "-",
      importo: parseFloat(String(p.importo)),
      statoPagamento: p.stato,
      data: new Date(p.timestamp).toLocaleString(),
      pianoAbbonamento: p.abbonamento_id ? abbonamentiMap[p.abbonamento_id]?.piano_nome ?? null : null,
      codiceAmbassador: p.abbonamento_id ? abbonamentiMap[p.abbonamento_id]?.ambassador_code ?? null : null,
      abbonamentoScadenza: p.abbonamento_id ? abbonamentiMap[p.abbonamento_id]?.data_fine ?? null : null,
    }));

    return NextResponse.json({
      page,
      limit,
      totalCount: count || 0,
      transactions,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Impossibile recuperare le transazioni" }, { status: 500 });
  }
}
