import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  const { groupId, email, invitedBy } = await req.json();

  if (!groupId || !email || !invitedBy)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const token = randomBytes(16).toString("hex");

  const { error } = await supabase.from("secret_group_invites").insert({
    group_id: groupId,
    email,
    invited_by: invitedBy,
    token,
  });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    token,
  });
}
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  const { data, error } = await supabase
    .from("secret_group_invites")
    .select("*, secret_groups(nome)")
    .eq("token", token)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    invite_id: data.id,
    group_id: data.group_id,
    group_name: data.secret_groups.nome,
    email: data.email,
    invited_by: data.invited_by,
  });
}
