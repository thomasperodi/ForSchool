import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // Revoca la sessione su Supabase
  await supabase.auth.signOut();

  // Crea la response
  const res = NextResponse.json({ ok: true });

  // Elimina il cookie custom che hai impostato
  res.cookies.set("sk-auth", "", {
    path: "/",
    expires: new Date(0), // subito scaduto
  });

   // Elimina cookie Supabase
  res.cookies.set("sb-pjeptyhgwaevnlgpovzb-auth-token", "", {
    path: "/",
    expires: new Date(0),
  });

  // Elimina anche i cookie di Supabase (se presenti)
  res.cookies.set("sb-access-token", "", { path: "/", expires: new Date(0) });
  res.cookies.set("sb-refresh-token", "", { path: "/", expires: new Date(0) });

  return res;
}
