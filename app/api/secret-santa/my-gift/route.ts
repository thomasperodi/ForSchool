import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groupId = new URL(req.url).searchParams.get("groupId");

  let query = supabase
    .from("secret_matches")
    .select(`
      id,
      group_id,
      receiver,
      created_at,
      secret_groups!inner(id, nome, budget),
      utenti!secret_matches_receiver_fkey(id, nome, email)
    `)
    .eq("giver", user.user.id);

  if (groupId) {
    query = query.eq("group_id", groupId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Nessun abbinamento trovato" }, { status: 404 });
  }

  // Se c'è un groupId specifico, restituisci solo quello, altrimenti restituisci tutti
  const matches = data.map((match: any) => ({
    id: match.id,
    group_id: match.group_id,
    group_name: match.secret_groups?.nome,
    group_budget: match.secret_groups?.budget,
    receiver_id: match.receiver,
    receiver_name: match.utenti?.nome || "Utente sconosciuto",
    receiver_email: match.utenti?.email || "",
    created_at: match.created_at,
  }));

  return NextResponse.json({
    matches: groupId ? matches[0] : matches,
  });
}
