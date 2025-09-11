// app/api/notifications/sendSingle/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

// 🔹 Inizializza Firebase Admin una sola volta
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, body, user_id } = await req.json();

    if (!title || !body || !user_id) {
      return NextResponse.json(
        { error: "title, body e user_id sono obbligatori" },
        { status: 400 }
      );
    }

    // 🔹 Recupera token FCM del singolo utente
    const { data, error } = await supabase
      .from("push_tokens")
      .select("fcm_token")
      .eq("user_id", user_id)
      .single();

    if (error || !data?.fcm_token) {
      return NextResponse.json(
        { error: "Token FCM non trovato per l'utente" },
        { status: 404 }
      );
    }

    const token = data.fcm_token;

    // 🔹 Prepara messaggio FCM
    const message: admin.messaging.Message = {
      token,
      notification: { title, body },
      android: { priority: "high" },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default" } },
      },
    };

    // 🔹 Invia notifica
    const response = await admin.messaging().send(message);
    console.log("✅ Notifica inviata con successo:", response);

    return NextResponse.json({ success: true, messageId: response });
  } catch (err: unknown) {
    console.error("❌ Errore invio notifica:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
