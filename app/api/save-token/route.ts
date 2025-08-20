import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SaveTokenBody {
  token: string;
  user_id?: string;
  platform: 'ios' | 'android';
}

export async function POST(req: Request) {
  try {
    const body: SaveTokenBody = await req.json();

    const { token, user_id, platform } = body;

    if (!token || !platform) {
      return NextResponse.json(
        { error: 'Token e platform sono obbligatori' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('push_tokens')
      .upsert(
        { token, user_id: user_id || null, platform },
        { onConflict: 'token' } // correzione qui
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
