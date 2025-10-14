import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {

      const cookieStore = await cookies();
  // 1) Prova con Authorization: Bearer <access_token>
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = data.user.id;

    // 2) Cancella dati applicativi
    const { error: dbError } = await supabaseAdmin.from("utenti").delete().eq("id", userId);
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // 3) Cancella l’utente da Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
  cookieStore.set({
    name: "sk-auth",
    value: "",
    maxAge: 0,
    path: "/",
  });
   cookieStore.set({
    name: "sb-access-token",
    value: "",
    maxAge: 0,
    path: "/",
  });
   cookieStore.set({
    name: "sb-refresh-token",
    value: "",
    maxAge: 0,
    path: "/",
  });


    // 4) Risposta OK → il client farà signOut() e redirect
    return NextResponse.json({ ok: true });
    
  }

  // 5) Fallback se non c'è header Authorization
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: dbError } = await supabaseAdmin.from("utenti").delete().eq("id", user.id);
  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
