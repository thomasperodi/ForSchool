import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  // Recupera il token dall'header Authorization (Bearer)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Token mancante" }, { status: 401 });
  }

  // Crea un client Supabase autenticato con il token
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );

  // Recupera l'utente dal token
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: "Utente non autenticato" }, { status: 401 });
  }

  const userEmail = user.email;
  const userId = user.id;

  // GRUPPI DOVE L'UTENTE È MEMBRO
  // Prima recupera i group_id dai membri
  const { data: membersData, error: membersError } = await supabase
    .from("secret_group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (membersError) {
    console.error("Errore query membri:", membersError);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const groupIds = membersData?.map((m) => m.group_id).filter(Boolean) || [];

  // Se non ci sono gruppi, restituisci array vuoto
  if (groupIds.length === 0) {
    return NextResponse.json({ groups: [], invites: [] });
  }

  // Recupera i gruppi
  const { data: groupsData, error: groupsError } = await supabase
    .from("secret_groups")
    .select("id, nome, budget, created_at")
    .in("id", groupIds);

  if (groupsError) {
    console.error("Errore query gruppi:", groupsError);
    return NextResponse.json({ error: groupsError.message }, { status: 500 });
  }

  // Aggiungi conteggi membri per ogni gruppo
  const groupsWithCounts = await Promise.all(
    (groupsData || []).map(async (group) => {
      const { count } = await supabase
        .from("secret_group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id);

      return {
        ...group,
        participantsCount: count || 0,
        acceptedCount: count || 0, // Tutti i membri sono accettati
      };
    })
  );

  // INVITI NON ANCORA ACCETTATI
  const { data: invitesRaw, error: invitesError } = await supabase
    .from("secret_group_invites")
    .select("id, token, created_at, group_id")
    .eq("email", userEmail)
    .eq("accepted", false);

  if (invitesError) {
    console.error("Errore query inviti:", invitesError);
    return NextResponse.json({ error: invitesError.message }, { status: 500 });
  }

  // Recupera i nomi dei gruppi per gli inviti
  const inviteGroupIds = invitesRaw?.map((i) => i.group_id).filter(Boolean) || [];
  let groupNamesMap: Record<string, string> = {};

  if (inviteGroupIds.length > 0) {
    const { data: inviteGroups } = await supabase
      .from("secret_groups")
      .select("id, nome")
      .in("id", inviteGroupIds);

    if (inviteGroups) {
      groupNamesMap = inviteGroups.reduce((acc, g) => {
        acc[g.id] = g.nome;
        return acc;
      }, {} as Record<string, string>);
    }
  }

  const invites = invitesRaw?.map((i) => ({
    id: i.id,
    token: i.token,
    group_name: groupNamesMap[i.group_id] || "",
    created_at: i.created_at,
  })) || [];

  return NextResponse.json({ groups: groupsWithCounts, invites });
}
