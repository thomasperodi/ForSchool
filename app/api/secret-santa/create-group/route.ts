import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { nome, budget, creatorId } = await req.json();

    if (!nome || !budget || !creatorId) {
      return NextResponse.json(
        { error: "nome, budget e creatorId sono obbligatori" },
        { status: 400 }
      );
    }

    // Inserisci il gruppo
    const { data: groupData, error: groupError } = await supabase
      .from("secret_groups")
      .insert({
        nome,
        budget,
        creator_id: creatorId,
      })
      .select()
      .single();

    if (groupError) {
      return NextResponse.json(
        { error: groupError.message },
        { status: 500 }
      );
    }

    // Aggiungi il creatore come membro
    const { error: memberError } = await supabase
      .from("secret_group_members")
      .insert({
        group_id: groupData.id,
        user_id: creatorId,
      });

    if (memberError) {
      // Se fallisce l'inserimento del membro, elimina il gruppo
      await supabase.from("secret_groups").delete().eq("id", groupData.id);
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ groupId: groupData.id });

  } catch (err) {
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500 }
    );
  }
}
