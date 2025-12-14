import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { token, userId } = await req.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: "token e userId sono obbligatori" },
        { status: 400 }
      );
    }

    // Recupera invito
    const { data: invite, error: inviteError } = await supabase
      .from("secret_group_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invito non valido" }, { status: 400 });
    }

    if (invite.accepted) {
      return NextResponse.json({ success: true, already: true, groupId: invite.group_id });
    }

    // Verifica se l'utente è già membro
    const { data: existingMember } = await supabase
      .from("secret_group_members")
      .select("id")
      .eq("group_id", invite.group_id)
      .eq("user_id", userId)
      .single();

    if (existingMember) {
      // Se è già membro, segna solo l'invito come accettato
      await supabase
        .from("secret_group_invites")
        .update({ accepted: true, accepted_at: new Date().toISOString() })
        .eq("token", token);

      return NextResponse.json({ success: true, already: true, groupId: invite.group_id });
    }

    // Inserisci membro
    const { error: memberError } = await supabase
      .from("secret_group_members")
      .insert({
        group_id: invite.group_id,
        user_id: userId,
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Segna accettato
    const { error: updateError } = await supabase
      .from("secret_group_invites")
      .update({ accepted: true, accepted_at: new Date().toISOString() })
      .eq("token", token);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, groupId: invite.group_id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Errore interno" }, { status: 500 });
  }
}
