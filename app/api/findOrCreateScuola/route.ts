import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  const { domain } = await req.json();

  const { data: scuola } = await supabase
    .from("scuole")
    .select("*")
    .eq("dominio", domain)
    .single();

  if (scuola) return NextResponse.json(scuola);

  // crea nuova scuola se non esiste
  const { data, error } = await supabase
    .from("scuole")
    .insert([{ nome: domain.split(".")[0], dominio_email: domain }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
