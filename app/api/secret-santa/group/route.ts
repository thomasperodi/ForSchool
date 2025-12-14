import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const groupId = new URL(req.url).searchParams.get("groupId");

  if (!groupId)
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });

  // Fetch gruppo
  const { data: group, error: gErr } = await supabase
    .from("secret_groups")
    .select("id, nome, budget, creator_id, created_at")
    .eq("id", groupId)
    .single();

  if (gErr)
    return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Fetch membri con informazioni utente
  const { data: membersRaw, error: mErr } = await supabase
    .from("secret_group_members")
    .select(`
      id,
      user_id,
      joined_at,
      utenti!inner(id, nome, email)
    `)
    .eq("group_id", groupId);

  if (mErr)
    return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Fetch inviti per questo gruppo
  const { data: invitesRaw } = await supabase
    .from("secret_group_invites")
    .select("id, email, accepted, created_at")
    .eq("group_id", groupId);

  // Fetch abbinamenti per questo gruppo
  const { data: matchesRaw } = await supabase
    .from("secret_matches")
    .select(`
      id,
      giver,
      receiver,
      created_at,
      utenti_giver:utenti!secret_matches_giver_fkey(id, nome, email),
      utenti_receiver:utenti!secret_matches_receiver_fkey(id, nome, email)
    `)
    .eq("group_id", groupId);

  // Formatta i membri
  const members = (membersRaw || []).map((m: {
    id: string;
    user_id: string;
    joined_at?: string;
    utenti?: { nome?: string; email?: string } | { nome?: string; email?: string }[] | null;
  }) => {
    const utente = Array.isArray(m.utenti) ? m.utenti[0] : m.utenti;
    return {
      id: m.id,
      user_id: m.user_id,
      nome: utente?.nome || "Utente",
      email: utente?.email || "",
      joined_at: m.joined_at,
      is_creator: group.creator_id === m.user_id,
    };
  });

  // Formatta gli abbinamenti
  const matches = (matchesRaw || []).map((m: {
    id: string;
    giver: string;
    receiver: string;
    created_at?: string;
    utenti_giver?: { nome?: string; email?: string } | { nome?: string; email?: string }[] | null;
    utenti_receiver?: { nome?: string; email?: string } | { nome?: string; email?: string }[] | null;
  }) => {
    const giver = Array.isArray(m.utenti_giver) ? m.utenti_giver[0] : m.utenti_giver;
    const receiver = Array.isArray(m.utenti_receiver) ? m.utenti_receiver[0] : m.utenti_receiver;
    return {
      id: m.id,
      giver_id: m.giver,
      giver_name: giver?.nome || "Utente sconosciuto",
      giver_email: giver?.email || "",
      receiver_id: m.receiver,
      receiver_name: receiver?.nome || "Utente sconosciuto",
      receiver_email: receiver?.email || "",
      created_at: m.created_at,
    };
  });

  // Conta inviti
  const invites = invitesRaw || [];
  const stats = {
    total: members.length,
    accepted: members.length, // Tutti i membri sono accettati
    invited: invites.filter((i) => !i.accepted).length,
    declined: 0, // Non c'è campo declined, solo accepted=false
  };

  return NextResponse.json({
    group,
    members,
    stats,
    matches,
    hasMatches: matches.length > 0,
  });
}
