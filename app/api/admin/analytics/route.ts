// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
interface Pagamento {
    id: string;
    importo: number;
    tipo_acquisto: string;
    timestamp: string;
    utente?: { email: string }[] | null;
  }
  
export async function GET(req: NextRequest) {
  try {
    // Fetch pagamenti da Supabase
    const { data, error } = await supabase
      .from("pagamenti")
      .select(`
        id,
        importo,
        tipo_acquisto,
        timestamp,
        utente:utente_id (email)
      `)
      .order("timestamp", { ascending: false });

    if (error) throw error;

    // Inizializza array
    const merchTransactions: { id: string; amount: number; date: string }[] = [];
    const subscriptionPayments: { id: string; amount: number; userEmail: string; date: string }[] = [];
    const PLATFORM_FEE_PERCENT = 0.1; // 10%
    let merchRevenue = 0;
    let subscriptionsRevenue = 0;

    (data ?? []).forEach((p) => {
        const importo = Number(p.importo ?? 0);
        const date = new Date(p.timestamp).toLocaleString();
        if (p.tipo_acquisto === "merch") {
          const commissione = importo * PLATFORM_FEE_PERCENT;
          merchTransactions.push({ id: p.id, amount: commissione, date }); // solo la tua parte
          merchRevenue += commissione;
        } else if (p.tipo_acquisto === "abbonamento") {
          subscriptionPayments.push({
            id: p.id,
            amount: importo,
            userEmail: Array.isArray(p.utente) && p.utente.length > 0 ? p.utente[0].email : "-",
            date,
          });
          subscriptionsRevenue += importo;
        }
      });

    const totalRevenue = merchRevenue + subscriptionsRevenue;

    return NextResponse.json({
      merchRevenue,
      subscriptionsRevenue,
      totalRevenue,
      merchTransactions,
      subscriptionPayments,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossibile recuperare i dati finanziari" },
      { status: 500 }
    );
  }
}
