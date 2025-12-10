import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { groupId } = await req.json();

  const { data: members } = await supabase
    .from("secret_group_members")
    .select("user_id");

  if (!members) {
    return NextResponse.json({ error: "No members found" }, { status: 400 });
  }

  const givers = [...members.map((m) => m.user_id)];
  const receivers = [...givers];

  // Shuffle
  for (let i = receivers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
  }

  // Avoid self match
  for (let i = 0; i < givers.length; i++) {
    if (givers[i] === receivers[i]) return POST(req);
  }

  const rows = givers.map((g, i) => ({
    group_id: groupId,
    giver: g,
    receiver: receivers[i],
  }));

  await supabase.from("secret_matches").insert(rows);

  return NextResponse.json({ success: true });
}
