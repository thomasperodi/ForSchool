import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { token } = await req.json();

  await supabase
    .from("secret_group_invites")
    .update({ declined: true, accepted: false })
    .eq("token", token);

  return NextResponse.json({ success: true });
}
