import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // deve essere la service role key, non l'anon
);

interface SaveTokenBody {
  apns_token?: string;  // solo iOS
  fcm_token: string;    // usato per Firebase Cloud Messaging
  user_id?: string;
  platform: "ios" | "android";
}

export async function POST(req: Request) {
  try {
    const body: SaveTokenBody = await req.json();
    const { apns_token, fcm_token, user_id, platform } = body;

    if (!fcm_token || !platform) {
      return NextResponse.json(
        { error: "FCM token e platform sono obbligatori" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          apns_token: apns_token || null,
          fcm_token,
          user_id: user_id || null,
          platform,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "fcm_token", // oppure "user_id, platform" se vuoi 1 token per utente/piattaforma
        }
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
