import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userEmail = user.email;
  const userId = user.id;

  // GRUPPI DOVE L'UTENTE È MEMBRO
  const { data: groupsRaw } = await supabase
    .from("secret_group_members")
    .select("secret_groups(id, nome, budget)")
    .eq("user_id", userId);

  const groups = groupsRaw?.map((g) => g.secret_groups) || [];

  // INVITI NON ANCORA ACCETTATI
  const { data: invitesRaw } = await supabase
    .from("secret_group_invites")
    .select("id, token, secret_groups(nome)")
    .eq("email", userEmail)
    .eq("accepted", false);

  const invites = invitesRaw?.map((i) => ({
    id: i.id,
    token: i.token,
    group_name: Array.isArray(i.secret_groups) ? i.secret_groups[0]?.nome : i.secret_groups?.nome,
  })) || [];

  return NextResponse.json({ groups, invites });
}
