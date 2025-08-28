// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Ottieni il cookie store
    const cookieStore = cookies(); // ✅ non serve await qui, cookies() è sync

    // Crea client Supabase lato server
    const supabase = createClient();

    // Revoca la sessione su Supabase
    (await supabase).auth.signOut();

    // Prepara la response
    const res = NextResponse.json({ ok: true });

    // Rimuovi cookie personalizzati e di Supabase
    const cookieNames = [
      'sk-auth',
      'sb-pjeptyhgwaevnlgpovzb-auth-token',
      'sb-access-token',
      'sb-refresh-token',
    ];

    cookieNames.forEach((name) => {
      res.cookies.delete({ name, path: '/' }); // ✅ uso corretto di delete
    });

    return res;
  } catch (err) {
    console.error('Errore logout:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
