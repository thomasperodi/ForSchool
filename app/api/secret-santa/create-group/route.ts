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

    const { data, error } = await supabase
      .from("secret_groups")
      .insert({
        nome,
        budget,
        creator_id: creatorId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ groupId: data.id });

  } catch (err) {
    return NextResponse.json(
      { error: "Errore interno" },
      { status: 500 }
    );
  }
}
