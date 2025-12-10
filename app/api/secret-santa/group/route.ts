import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const groupId = new URL(req.url).searchParams.get("groupId");

  if (!groupId)
    return NextResponse.json({ error: "Missing groupId" }, { status: 400 });

  // Fetch gruppo
  const { data: group, error: gErr } = await supabase
    .from("secret_groups")
    .select("id, nome, budget")
    .eq("id", groupId)
    .single();

  if (gErr)
    return NextResponse.json({ error: gErr.message }, { status: 500 });

  // Fetch membri
  const { data: members, error: mErr } = await supabase
    .from("secret_group_members")
    .select("id, nome, email");

  return NextResponse.json({
    group,
    members: members ?? [],
  });
}
