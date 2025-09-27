// app/api/revenuecat-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type RCEvent = {
  type:
    | "INITIAL_PURCHASE"
    | "RENEWAL"
    | "CANCELLATION"
    | "UNCANCELLATION"
    | "BILLING_ISSUE"
    | "BILLING_ISSUE_RESOLVED"
    | "EXPIRATION"
    | string;
  app_user_id: string;
  product_id: string; // es. "it.skoolly.app.elite.monthly:monthly-base-2"
  transaction_id: string | null;
  store: "PLAY_STORE" | "APP_STORE" | string | null;
  environment?: "SANDBOX" | "PRODUCTION";
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
};

type RCPayload = { event: RCEvent; api_version?: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DBG = (msg: string, extra?: unknown) => {
  const prefix = "[RC Webhook][DBG]";
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console.log(prefix, msg, JSON.stringify(extra, null, 2));
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, msg);
  }
};

const ERR = (msg: string, extra?: unknown) => {
  const prefix = "[RC Webhook][ERR]";
  if (extra !== undefined) {
    // eslint-disable-next-line no-console
    console.error(prefix, msg, JSON.stringify(extra, null, 2));
  } else {
    // eslint-disable-next-line no-console
    console.error(prefix, msg);
  }
};

function toPlatform(store?: string | null): "play" | "appstore" | null {
  if (store === "PLAY_STORE") return "play";
  if (store === "APP_STORE") return "appstore";
  return null;
}

function toState(t: RCEvent["type"]): "active" | "expired" | "cancelled" | "paused" {
  switch (t) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "BILLING_ISSUE_RESOLVED":
      return "active";
    case "CANCELLATION":
      return "cancelled";
    case "EXPIRATION":
      return "expired";
    default:
      return "active";
  }
}

function splitGoogleProduct(productId: string): { store_product_id: string; store_product_plan_id: string | null } {
  const [pid, base] = productId.split(":");
  return { store_product_id: pid, store_product_plan_id: base ?? null };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as RCPayload;
    console.log("[RC Webhook] Payload ricevuto:", JSON.stringify(payload, null, 2));

    const event = payload?.event;
    if (!event) return NextResponse.json({ error: "Invalid payload: missing event" }, { status: 400 });

    const {
      type,
      app_user_id,
      product_id,
      transaction_id,
      store,
      environment,
      purchased_at_ms,
      expiration_at_ms,
      entitlement_ids,
    } = event;

    DBG("Header sintetico", {
      type,
      app_user_id,
      product_id,
      store,
      environment,
      transaction_id,
    });

    const platform = toPlatform(store);
    if (!platform) {
      ERR("Store non supportato", { store });
      return NextResponse.json({ error: `Unsupported store: ${store}` }, { status: 400 });
    }

    // Se Google: productId:basePlan; se Apple: solo productId
    const { store_product_id, store_product_plan_id } = splitGoogleProduct(product_id);
    DBG("Product parsing", { platform, store_product_id, store_product_plan_id });

    // Mappa -> piano_id (debug per capire perché manca)
    let piano_id: string | null = null;

    DBG("Query mappa con base plan (map1) START");
    const { data: map1, error: map1Err } = await supabase
      .from("piani_store_map")
      .select("piano_id, platform, store_product_id, store_product_plan_id, entitlement_id")
      .eq("platform", platform)
      .eq("store_product_id", store_product_id)
      .eq("store_product_plan_id", store_product_plan_id ?? "")
      .limit(10);
    DBG("Query mappa con base plan (map1) RESULT", { count: map1?.length ?? 0, error: map1Err?.message });

    if (map1 && map1.length > 0) {
      piano_id = map1[0].piano_id;
      DBG("Match trovato in map1", map1[0]);
    } else {
      DBG("Query mappa SENZA base plan (map2) START");
      const { data: map2, error: map2Err } = await supabase
        .from("piani_store_map")
        .select("piano_id, platform, store_product_id, store_product_plan_id, entitlement_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .is("store_product_plan_id", null)
        .limit(10);
      DBG("Query mappa SENZA base plan (map2) RESULT", { count: map2?.length ?? 0, error: map2Err?.message });

      if (map2 && map2.length > 0) {
        piano_id = map2[0].piano_id;
        DBG("Match trovato in map2", map2[0]);
      }
    }

    if (!piano_id) {
      // Dump diagnostico su tutte le righe della mappa per quella piattaforma/prodotto
      const { data: dump } = await supabase
        .from("piani_store_map")
        .select("piano_id, platform, store_product_id, store_product_plan_id, entitlement_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .limit(50);
      ERR("Missing mapping in piani_store_map", {
        platform,
        store_product_id,
        store_product_plan_id,
        existingRows: dump ?? [],
        hint:
          "Inserisci una riga in piani_store_map. Esempio: INSERT INTO piani_store_map(platform,store_product_id,store_product_plan_id,entitlement_id,piano_id) VALUES ('play','it.skoolly.app.elite.monthly','monthly-base-2','elite','<UUID_PIANO>');",
      });

      return NextResponse.json(
        {
          error: "Missing mapping in piani_store_map",
          details: { platform, store_product_id, store_product_plan_id, existingRows: dump ?? [] },
        },
        { status: 422 }
      );
    }

    // Verifica utente
    const { data: user, error: userErr } = await supabase
      .from("utenti")
      .select("id")
      .eq("id", app_user_id)
      .single();

    DBG("Check utente", { found: !!user, error: userErr?.message });
    if (userErr || !user) {
      ERR("User not found", { app_user_id });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stato = toState(type);
    const latest_purchase_at = purchased_at_ms ? new Date(purchased_at_ms).toISOString() : null;
    const expires_at = expiration_at_ms ? new Date(expiration_at_ms).toISOString() : null;

    const row = {
      utente_id: user.id,
      piano_id,
      stato,
      store_platform: platform,
      store_product_id,
      store_product_plan_id,
      entitlement_id: entitlement_ids?.[0] ?? "elite",
      will_renew: stato === "active",
      store_environment: environment ?? "PRODUCTION",
      management_url: null as string | null,
      latest_purchase_at,
      expires_at,
      store_transaction_id: transaction_id ?? null,
      store_receipt_data: JSON.parse(JSON.stringify(payload)) as Json,
      updated_at: new Date().toISOString(),
    };

    DBG("UPsert row preview", row);

    // Upsert sulla UNIQUE(store_transaction_id)
    const { error: upsertErr } = await supabase
      .from("abbonamenti")
      .upsert(row, { onConflict: "store_transaction_id" });

    if (upsertErr) {
      ERR("DB upsert error", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    DBG("Upsert OK", { utente_id: user.id, piano_id, stato, transaction_id });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error;
    ERR("Unhandled error", { message: err.message });
    return NextResponse.json({ error: err.message ?? "Unknown" }, { status: 500 });
  }
}
