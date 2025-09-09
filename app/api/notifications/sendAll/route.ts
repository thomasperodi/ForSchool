import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import admin from "firebase-admin";

// Inizializza Firebase Admin (solo una volta)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, body, user_id, platform } = await req.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: "title e body sono obbligatori" },
        { status: 400 }
      );
    }

    // Query dinamica in base a user_id e/o platform
    let query = supabase.from("push_tokens").select("fcm_token");

    if (user_id) {
      query = query.eq("user_id", user_id);
    }
    if (platform) {
      query = query.eq("platform", platform);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tokens = data?.map((t) => t.fcm_token).filter(Boolean) ?? [];
    if (tokens.length === 0) {
      return NextResponse.json(
        { error: "Nessun token trovato per i criteri richiesti" },
        { status: 404 }
      );
    }

    // Prepara il messaggio per FCM
    const message: admin.messaging.MulticastMessage = {
      notification: { title, body },
      android: { priority: "high" },
      apns: { headers: { "apns-priority": "10" } },
      tokens,
    };

    // Invia in batch
    const response = await admin.messaging().sendEachForMulticast(message);

    // Rimuovo i token invalidi dalla tabella
    const invalidTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const errCode = res.error?.code ?? "";
        if (
          errCode.includes("messaging/invalid-argument") ||
          errCode.includes("messaging/registration-token-not-registered")
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    // if (invalidTokens.length > 0) {
    //   await supabase.from("push_tokens").delete().in("fcm_token", invalidTokens);
    // }

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
