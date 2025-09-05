import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      console.error('Supabase setSession error:', error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    // ✅ Salva anche i cookie Supabase
    res.cookies.set('sb-access-token', access_token, { path: '/', httpOnly: true, sameSite: 'lax' });
    res.cookies.set('sb-refresh-token', refresh_token, { path: '/', httpOnly: true, sameSite: 'lax' });

    // ✅ Tuo cookie di autenticazione
    res.cookies.set('sk-auth', '1', { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60*60*24*30 });

    return res;
  } catch (err) {
    console.error('Errore set-session:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
