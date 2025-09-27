// app/api/promo/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
  try {
    const { code, userId, platform } = (await req.json()) as {
      code: string;
      userId: string;
      platform: "android" | "ios" | "web";
    };

    if (!code || !userId) {
      return NextResponse.json(
        { valid: false, message: "Parametri mancanti" },
        { status: 400 }
      );
    }


    // Adatta alle tue colonne: qui assumo 'codice' e 'attivo'
    const { data: row, error } = await supabase
      .from("codici_ambassador")
      .select("codice")
      .eq("codice", code)
      .single();
    if (error || !row) {
      return NextResponse.json({ valid: false, message: "Codice non valido" });
    }

    // Decidi quale package RC usare (configuralo in RevenueCat → Offering)
    // Se hai pacchetti diversi per iOS/Android, gestiscili qui
    let packageId = "$rc_monthly_promo";
    const offeringId = "default";

    if (platform === "ios") {
      // es. packageId = "$rc_monthly_promo_ios";
      packageId = "$rc_monthly_promo"; // se identico su iOS/Android
    }

    return NextResponse.json({
      valid: true,
      packageId,
      offeringId,
      message: "Codice valido",
    });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json(
      { valid: false, message: err.message ?? "Errore" },
      { status: 500 }
    );
  }
}
