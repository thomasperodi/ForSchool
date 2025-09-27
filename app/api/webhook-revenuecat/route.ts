// app/api/revenuecat-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

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
  product_id: string; // es. "bundle.prod:base-plan"
  transaction_id: string | null;
  store: "PLAY_STORE" | "APP_STORE" | string | null;
  environment?: "SANDBOX" | "PRODUCTION";
  purchased_at_ms?: number | null;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[] | null;
  period_type?: "NORMAL" | "TRIAL" | "INTRO" | "PREPAID" | string;

  // Alcune versioni di webhook includono gli attributi in questi campi:
  subscriber_attributes?: unknown;
  user_attributes?: unknown;
};

type RCPayload = { event: RCEvent; api_version?: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DBG = (m: string, x?: unknown) =>
  x === undefined
    ? console.log("[RC Webhook][DBG]", m)
    : console.log("[RC Webhook][DBG]", m, JSON.stringify(x, null, 2));
const ERR = (m: string, x?: unknown) =>
  x === undefined
    ? console.error("[RC Webhook][ERR]", m)
    : console.error("[RC Webhook][ERR]", m, JSON.stringify(x, null, 2));

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
function willRenew(period_type?: RCEvent["period_type"], stato?: string): boolean {
  return period_type === "PREPAID" ? false : stato === "active";
}
function splitGoogleProduct(productId: string) {
  const [pid, base] = productId.split(":");
  return { store_product_id: pid, store_product_plan_id: base ?? null };
}
const toISO = (ms?: number | null) => (ms ? new Date(ms).toISOString() : null);

/** Estrae ambassador_code dagli attributi del payload RC in modo difensivo. */
function extractAmbassadorCode(e: RCEvent): string | null {
  const tryRead = (obj: unknown): string | null => {
    if (!obj || typeof obj !== "object") return null;
    const anyObj = obj as Record<string, unknown>;
    const raw = anyObj["ambassador_code"];
    if (!raw) return null;

    // Può essere una stringa o un oggetto { value: "CODE", updated_at_ms: ... }
    if (typeof raw === "string") return raw.trim().toUpperCase() || null;
    if (typeof raw === "object" && raw !== null) {
      const val = (raw as Record<string, unknown>)["value"];
      if (typeof val === "string") return val.trim().toUpperCase() || null;
    }
    return null;
  };

  return (
    tryRead(e.subscriber_attributes) ||
    tryRead(e.user_attributes) ||
    null
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as RCPayload;
    console.log("[RC Webhook] Payload ricevuto:", JSON.stringify(payload, null, 2));

    const e = payload?.event;
    if (!e) return NextResponse.json({ error: "Invalid payload: missing event" }, { status: 400 });

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
      period_type,
    } = e;

    DBG("Header sintetico", {
      type,
      app_user_id,
      product_id,
      store,
      environment,
      transaction_id,
      period_type,
    });

    const platform = toPlatform(store);
    if (!platform) {
      return NextResponse.json({ error: `Unsupported store: ${store}` }, { status: 400 });
    }

    // Google: productId:basePlan — Apple: solo productId
    const { store_product_id, store_product_plan_id } = splitGoogleProduct(product_id);
    DBG("Product parsing", { platform, store_product_id, store_product_plan_id });

    // ======= MAPPING piani_store_map -> piano_id =======
    let piano_id: string | null = null;

    if (store_product_plan_id) {
      const { data: map1, error: map1Err } = await supabase
        .from("piani_store_map")
        .select("piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .eq("store_product_plan_id", store_product_plan_id)
        .limit(1);
      DBG("Query mappa con base plan (map1) RESULT", { count: map1?.length ?? 0, error: map1Err?.message });
      if (map1 && map1.length) piano_id = map1[0].piano_id;
    }
    if (!piano_id) {
      const { data: map2, error: map2Err } = await supabase
        .from("piani_store_map")
        .select("piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .is("store_product_plan_id", null)
        .limit(1);
      DBG("Query mappa SENZA base plan (map2) RESULT", { count: map2?.length ?? 0, error: map2Err?.message });
      if (map2 && map2.length) piano_id = map2[0].piano_id;
    }
    if (!piano_id) {
      return NextResponse.json(
        {
          error: "Missing mapping in piani_store_map",
          details: { platform, store_product_id, store_product_plan_id },
        },
        { status: 422 }
      );
    }

    // ======= Verifica utente =======
    const { data: user, error: userErr } = await supabase
      .from("utenti")
      .select("id")
      .eq("id", app_user_id)
      .maybeSingle();
    DBG("Check utente", { found: !!user, error: userErr?.message });
    if (userErr || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ======= Dati calcolati =======
    const stato = toState(type);
    const ambassador_code = extractAmbassadorCode(e); // <-- nuovo

    const baseRow = {
      utente_id: user.id,
      piano_id,
      stato,
      store_platform: platform,
      store_product_id,
      store_product_plan_id,
      entitlement_id: entitlement_ids?.[0] ?? "elite",
      will_renew: willRenew(period_type, stato),
      store_environment: environment ?? "PRODUCTION",
      management_url: null as string | null,
      latest_purchase_at: toISO(purchased_at_ms),
      expires_at: toISO(expiration_at_ms),
      store_transaction_id: transaction_id ?? null,
      store_receipt_data: JSON.parse(JSON.stringify(payload)) as Json,
      updated_at: new Date().toISOString(),
    };

    // Se ho il promo code, includilo; se non c'è NON sovrascrivo la colonna
    const row = ambassador_code ? { ...baseRow, ambassador_code } : baseRow;

    DBG("Row (preview)", row);

    // ======= STRATEGIA ANTI-CONFLITTO =======
    // 1) stessa transazione -> UPDATE
    if (transaction_id) {
      const { data: byTx } = await supabase
        .from("abbonamenti")
        .select("id")
        .eq("store_transaction_id", transaction_id)
        .maybeSingle();

      if (byTx?.id) {
        DBG("Update by TX match", { id: byTx.id });
        const { error: upd1 } = await supabase.from("abbonamenti").update(row).eq("id", byTx.id);
        if (upd1) {
          ERR("Update by TX failed", upd1);
          return NextResponse.json({ error: upd1.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, path: "update_by_tx" });
      }
    }

    // 2) riga ACTIVE esistente per (utente, piattaforma) -> UPDATE
    const { data: activeExisting } = await supabase
      .from("abbonamenti")
      .select("id")
      .eq("utente_id", user.id)
      .eq("store_platform", platform)
      .eq("stato", "active")
      .maybeSingle();

    if (activeExisting?.id) {
      DBG("Update active-existing per (utente,piattaforma)", { id: activeExisting.id });
      const { error: upd2 } = await supabase.from("abbonamenti").update(row).eq("id", activeExisting.id);
      if (upd2) {
        ERR("Update active-existing failed", upd2);
        return NextResponse.json({ error: upd2.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, path: "update_active_existing" });
    }

    // 3) altrimenti INSERT
    const { error: insErr } = await supabase.from("abbonamenti").insert(row);
    if (insErr) {
      ERR("Insert failed", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path: "insert" });
  } catch (e) {
    const err = e as Error;
    ERR("Unhandled error", { message: err.message });
    return NextResponse.json({ error: err.message ?? "Unknown" }, { status: 500 });
  }
}
