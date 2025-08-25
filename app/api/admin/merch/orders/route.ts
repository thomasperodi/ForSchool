import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from("ordini_merch")
      .select(`
        id,
        quantita,
        stato,
        timestamp,
        utente:utente_id (nome,email),
        prodotto:prodotto_id (nome, prezzo)
      `)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    interface OrdineMerch {
      id: string;
      quantita: number;
      stato: string;
      timestamp: string;
      utente?: {
        nome?: string;
        email?: string;
      } | null;
      prodotto?: {
        nome?: string;
        prezzo?: number;
      } | null;
    }

    const orders = (data as OrdineMerch[]).map((o) => ({
      id: o.id,
      cliente: o.utente?.nome ?? "Sconosciuto",
      email: o.utente?.email ?? "-",
      prodotti: `${o.quantita} x ${o.prodotto?.nome ?? "Prodotto"}`,
      totale: o.quantita * (o.prodotto?.prezzo ?? 0),
      statoSpedizione: o.stato,
      dataOrdine: new Date(o.timestamp).toLocaleString(),
    }));

    return NextResponse.json(orders);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Impossibile recuperare gli ordini" }, { status: 500 });
  }
}
