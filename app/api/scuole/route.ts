import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function findOrCreateScuola(domain: string) {
  const { data: scuola } = await supabase
    .from("scuole")
    .select("*")
    .eq("dominio", domain)
    .single();

  if (scuola) return scuola;

  

  const { data: nuovaScuola } = await supabase
    .from("scuole")
    .insert([{ id: crypto.randomUUID(), dominio: domain, nome: "" }])
    .select()
    .single();

  return nuovaScuola;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  if (!domain) {
    return new Response(JSON.stringify({ error: "domain param required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  // Cerca la scuola nel DB
  const { data: scuola, error } = await supabase
    .from("scuole")
    .select("*")
    .eq("dominio", domain)
    .single();
  if (scuola) {
    return new Response(JSON.stringify({ scuola }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  // Se non esiste, chiama getDomainOwner e inserisci
  
  const { data: nuovaScuola } = await supabase.from("scuole").insert([
    { id: crypto.randomUUID(), nome: domain, }
  ]).select().single();
  return new Response(JSON.stringify({ scuola: nuovaScuola }), {
    headers: { "Content-Type": "application/json" },
  });
} 