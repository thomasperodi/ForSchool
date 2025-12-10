import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("secret_matches")
    .select("receiver, utenti(nome)")
    .eq("giver", user.user.id)
    .single();

  if (!data) {
    return NextResponse.json({ error: "No match found" }, { status: 404 });
  }

  return NextResponse.json({ receiver: data.utenti[0].nome });
}
