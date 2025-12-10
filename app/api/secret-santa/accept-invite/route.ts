import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { token, userId } = await req.json();

  // Recupera invito
  const { data: invite, error } = await supabase
    .from("secret_group_invites")
    .select("*")
    .eq("token", token)
    .single();

  if (!invite)
    return NextResponse.json({ error: "Invito non valido" }, { status: 400 });

  if (invite.accepted)
    return NextResponse.json({ success: true, already: true });

  // Inserisci membro
  await supabase.from("secret_group_members").insert({
    group_id: invite.group_id,
    user_id: userId,
  });

  // Segna accettato
  await supabase
    .from("secret_group_invites")
    .update({ accepted: true, accepted_at: new Date() })
    .eq("token", token);

  return NextResponse.json({ success: true, groupId: invite.group_id });
}
