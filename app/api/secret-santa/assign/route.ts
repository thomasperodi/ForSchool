import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json({ error: "groupId is required" }, { status: 400 });
    }

    // Verifica se ci sono già abbinamenti per questo gruppo
    const { data: existingMatches } = await supabase
      .from("secret_matches")
      .select("id")
      .eq("group_id", groupId)
      .limit(1);

    if (existingMatches && existingMatches.length > 0) {
      return NextResponse.json(
        { error: "Gli abbinamenti per questo gruppo sono già stati generati" },
        { status: 400 }
      );
    }

    // Fetch membri del gruppo
    const { data: members, error: membersError } = await supabase
      .from("secret_group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    if (!members || members.length < 2) {
      return NextResponse.json(
        { error: "Servono almeno 2 membri per generare gli abbinamenti" },
        { status: 400 }
      );
    }

    const givers = members.map((m) => m.user_id);
    const receivers = [...givers];

    // Shuffle fino a quando non ci sono auto-assegnazioni
    let attempts = 0;
    let valid = false;

    while (!valid && attempts < 100) {
      // Shuffle
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      // Verifica che non ci siano auto-assegnazioni
      valid = givers.every((giver, i) => giver !== receivers[i]);
      attempts++;
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Impossibile generare abbinamenti validi. Riprova." },
        { status: 500 }
      );
    }

    const rows = givers.map((g, i) => ({
      group_id: groupId,
      giver: g,
      receiver: receivers[i],
    }));

    const { error: insertError } = await supabase.from("secret_matches").insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Errore interno" }, { status: 500 });
  }
}
