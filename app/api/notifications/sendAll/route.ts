import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

// 🔹 Inizializza Firebase Admin (una sola volta)
if (!admin.apps.length) {
  try {
    console.log("Inizializzazione Firebase Admin...");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
    console.log("✅ Firebase Admin inizializzato");
  } catch (err) {
    console.error("❌ Errore inizializzazione Firebase Admin:", err);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("✅ Endpoint POST chiamato");

    // 🔹 Check variabili ambiente
    console.log("ENV check", {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasFirebaseKey: !!process.env.FIREBASE_PRIVATE_KEY,
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });

    const { title, body, user_id, platform } = await req.json();
    console.log("Body ricevuto:", { title, body, user_id, platform });

    if (!title || !body) {
      return NextResponse.json(
        { error: "title e body sono obbligatori" },
        { status: 400 }
      );
    }

    // 🔹 Query dinamica su Supabase
    let query = supabase.from("push_tokens").select("fcm_token");

    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query;
    console.log("Supabase result:", { data, error });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tokens = data?.map((t) => t.fcm_token).filter(Boolean) ?? [];
    console.log("Token trovati:", tokens);

    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "Nessun token trovato per i criteri richiesti" },
        { status: 404 }
      );
    }

    // 🔹 Prepara messaggio per FCM
    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
      tokens,
    };

    console.log("Messaggio pronto:", message);

    // 🔹 Invio batch
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Risposta FCM:", JSON.stringify(response, null, 2));

    // 🔹 Trova token invalidi
    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        console.error("❌ Errore token:", {
          token: tokens[idx],
          code: res.error?.code,
          message: res.error?.message,
        });
        const errCode = res.error?.code ?? "";
        if (
          errCode.includes("messaging/invalid-argument") ||
          errCode.includes("messaging/registration-token-not-registered")
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
    });
  } catch (err: unknown) {
    console.error("❌ Errore generico:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
