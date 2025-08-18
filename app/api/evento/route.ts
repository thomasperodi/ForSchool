// app/api/eventi/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const GET = async () => {
  try {
    const { data: eventi, error } = await supabase
      .from("eventi")
      .select("*")
      .order("data", { ascending: true }); // ordina per data crescente

    if (error) throw error;

    return NextResponse.json(eventi);
  } catch (err) {
    console.error("Errore fetch eventi:", err);
    return NextResponse.json({ error: "Impossibile recuperare gli eventi" }, { status: 500 });
  }
};
