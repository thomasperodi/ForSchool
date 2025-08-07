import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale_id = searchParams.get('locale_id');

    if (!locale_id) {
      return NextResponse.json({ error: 'Missing locale_id query parameter' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('get_dashboard_data', { p_locale_id: locale_id });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
