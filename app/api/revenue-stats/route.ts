import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Configura il client Supabase

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month query params are required' }, { status: 400 });
    }

    // Chiama la funzione SQL get_revenue_analysis
    // Se la funzione Supabase ritorna un tipo JSON (json/jsonb),
    // il client Supabase lo parsa automaticamente per te.
    const { data, error } = await supabase
      .rpc('get_monthly_revenue_analysis_json', {
        p_destinatario_id: '992d845f-06b0-448d-b81b-cb21546a5c01'
        , p_year: parseInt(year, 10)
        , p_month: parseInt(month, 10)
        
      });
    if (error) {
      console.error("Supabase RPC error:", error); // Log the actual Supabase error
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // At this point, 'data' should already be a JavaScript object if your
    // Supabase function returns JSON/JSONB type directly.
    // No need for JSON.parse() here.
    if (!data) {
        return NextResponse.json({ error: 'No data returned from database function' }, { status: 404 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Unexpected error in API route:", error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}