// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // 📦 Parametri query
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const search = url.searchParams.get("query")?.trim().toLowerCase() || "";
    const role = url.searchParams.get("role")?.trim().toLowerCase() || "";
    const offset = (page - 1) * limit;

    // 📦 Base query con paginazione e conteggio totale
    let query = supabase
      .from("utenti")
      .select("id,nome,email,ruolo,notifiche,scuola_id", { count: "exact" })
      .order("nome", { ascending: true })
      .range(offset, offset + limit - 1);

    // 🔍 Ricerca per nome o email
    if (search) {
      query = query.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 🎯 Filtro per ruolo
    if (role && role !== "all") {
      query = query.eq("ruolo", role);
    }

    const { data: utenti, count: totalCount, error } = await query;
    if (error) throw error;

    const utentiList = utenti || [];

    // 📚 Recupero scuole
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

    return NextResponse.json({
      page,
      limit,
      totalCount: totalCount || 0,
      utenti: mapped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore lettura utenti";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
