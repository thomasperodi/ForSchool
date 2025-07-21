import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  // Recupera il token dall'header Authorization (Bearer)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 401 });
  }

  // Recupera l'utente dal token
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });
  }

  // Recupera i dati dalla tabella utenti
  const { data, error } = await supabase
    .from("utenti")
    .select("id, nome, email, classe, ruolo, scuola_id, notifiche, tema")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
} 