import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);



export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token o password mancanti" }, { status: 400 });
    }

    // Aggiorna password tramite Supabase auth (deve essere in chiaro)
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || "Errore durante aggiornamento password" }, { status: 400 });
    }

    // Decodifica token per estrarre user_id
    const decoded = jwtDecode(token);
    const userId = decoded.sub;
    console.log("Decoded user ID:", userId);

    if (!userId) {
      return NextResponse.json({ error: "User ID non trovato nel token" }, { status: 400 });
    }

    // Hash della password con bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Aggiorna la tabella utenti custom con password hashata
    const { error: updateError } = await supabaseAdmin
      .from("utenti")
      .update({ password: hashedPassword})
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: "Password aggiornata ma errore aggiornando tabella utenti" }, { status: 500 });
    }

    return NextResponse.json({ message: "Password aggiornata con successo" });
  } catch (error) {
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
