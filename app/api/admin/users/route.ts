// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // 🔍 Parametri di ricerca facoltativi
    const search = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const role = url.searchParams.get("role")?.trim().toLowerCase() || "";

    // 📦 Base query (senza limiti o paginazione)
    let query = supabase
      .from("utenti")
      .select("id,nome,email,ruolo,notifiche,scuola_id", { count: "exact" })
      .order("nome", { ascending: true });

    // 🔍 Ricerca per nome o email
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 🎯 Filtro per ruolo (se fornito)
    if (role && role !== "all") {
      query = query.eq("ruolo", role);
    }

    const { data: utenti, error } = await query;
    if (error) throw error;

    const utentiList = utenti || [];

    // 📚 Recupero scuole collegate
    const scuolaIds = Array.from(
      new Set(utentiList.map((u) => u.scuola_id).filter(Boolean) as string[])
    );

    const scuoleMap: Record<string, { id: string; nome: string | null }> = {};

    if (scuolaIds.length > 0) {
      const { data: scuole, error: errScuole } = await supabase
        .from("scuole")
        .select("id,nome")
        .in("id", scuolaIds);

      if (errScuole) throw errScuole;
      for (const s of scuole || []) scuoleMap[s.id] = { id: s.id, nome: s.nome };
    }

    // 🧩 Mapping finale utenti + scuola
    const mapped = utentiList.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      ruolo: u.ruolo,
      isActive: u.notifiche ?? true,
      scuola: u.scuola_id
        ? scuoleMap[u.scuola_id] || { id: u.scuola_id, nome: null }
        : null,
    }));

    // ✅ Restituisco tutti gli utenti (senza paginazione)
    return NextResponse.json({
      totalCount: mapped.length,
      utenti: mapped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore lettura utenti";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
