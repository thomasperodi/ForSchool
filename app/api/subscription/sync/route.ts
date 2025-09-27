import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** ---------- Tipi RC minimi (evitiamo any) ---------- */
type RCEntitlement = {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  latestPurchaseDate?: string | null;
  expirationDate?: string | null;
  store?: "PLAY_STORE" | "APP_STORE" | string | null;
  productIdentifier?: string | null;
  productPlanIdentifier?: string | null; // basePlan (Android)
  isSandbox?: boolean;
};

type RCAttributesKV =
  | string
  | { value?: string | null; [k: string]: unknown }
  | null;

type RCAttributes = Record<string, RCAttributesKV>;

type CustomerInfo = {
  entitlements: {
    all?: Record<string, RCEntitlement>;
    active?: Record<string, unknown>;
  };
  subscriptionsByProductIdentifier?: Record<
    string,
    { storeTransactionId?: string | null }
  >;
  managementURL?: string | null;
  // Gli attributi possono arrivare con questi nomi:
  subscriberAttributes?: RCAttributes;
  attributes?: RCAttributes;
};

type Body = {
  appUserId: string;                     // UUID utente (Supabase)
  customerInfo: CustomerInfo;            // payload RevenueCat
  environment?: "SANDBOX" | "PRODUCTION";
};

/** ---------- Helpers ---------- */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // usa la service role key
);

const DBG = (m: string, x?: unknown) =>
  x === undefined
    ? console.log("[RC Sync][DBG]", m)
    : console.log("[RC Sync][DBG]", m, JSON.stringify(x, null, 2));
const ERR = (m: string, x?: unknown) =>
  x === undefined
    ? console.error("[RC Sync][ERR]", m)
    : console.error("[RC Sync][ERR]", m, JSON.stringify(x, null, 2));

function toPlatform(store?: string | null): "play" | "appstore" | null {
  if (store === "PLAY_STORE") return "play";
  if (store === "APP_STORE") return "appstore";
  return null;
}
function toState(isActive: boolean): "active" | "expired" {
  return isActive ? "active" : "expired";
}
function toISO(s?: string | null) {
  return s ? new Date(s).toISOString() : null;
}
function pickAmbassadorCode(attrs?: RCAttributes): string | null {
  if (!attrs) return null;
  const raw = attrs["ambassador_code"];
  if (!raw) return null;
  if (typeof raw === "string") return raw.trim().toUpperCase() || null;
  if (typeof raw === "object" && raw !== null) {
    const v = (raw as { value?: string | null }).value;
    if (typeof v === "string") return v.trim().toUpperCase() || null;
  }
  return null;
}

/** ---------- Route ---------- */
export async function POST(req: NextRequest) {
  try {
    const { appUserId, customerInfo, environment } = (await req.json()) as Body;
    if (!appUserId || !customerInfo) {
      return NextResponse.json(
        { ok: false, error: "Missing appUserId or customerInfo" },
        { status: 400 }
      );
    }

    // Entitlement principale (adatta se cambi nome)
    const ent = customerInfo.entitlements?.all?.["elite"];
    if (!ent) {
      DBG("Nessun entitlement 'elite' attivo. Skip sync.");
      return NextResponse.json({ ok: true, skipped: "no-elite" });
    }

    const platform = toPlatform(ent.store ?? null);
    const store_product_id = ent.productIdentifier ?? null;
    const store_product_plan_id = ent.productPlanIdentifier ?? null;
    const store_transaction_id =
      (store_product_id &&
        customerInfo.subscriptionsByProductIdentifier?.[store_product_id]
          ?.storeTransactionId) ||
      null;

    const isActive = !!ent.isActive;
    const stato = toState(isActive);
    const latest_purchase_at = toISO(ent.latestPurchaseDate ?? null);
    const expires_at = toISO(ent.expirationDate ?? null);
    const will_renew = !!ent.willRenew && stato === "active";

    // ambassador_code: prendi da subscriberAttributes o attributes
    const ambassador_code =
      pickAmbassadorCode(customerInfo.subscriberAttributes) ||
      pickAmbassadorCode(customerInfo.attributes) ||
      null;

    DBG("Header", {
      appUserId,
      platform,
      store_product_id,
      store_product_plan_id,
      store_transaction_id,
      stato,
      will_renew,
      environment,
      ambassador_code,
    });

    if (!platform || !store_product_id) {
      return NextResponse.json(
        { ok: false, error: "Platform or store_product_id missing" },
        { status: 422 }
      );
    }

    // 1) Mappa store → piano_id
    let piano_id: string | null = null;

    if (store_product_plan_id) {
      const { data: m1, error: m1Err } = await supabase
        .from("piani_store_map")
        .select("piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .eq("store_product_plan_id", store_product_plan_id)
        .limit(1);
      if (m1Err) ERR("Map1 error", m1Err);
      if (m1 && m1.length) piano_id = m1[0].piano_id;
    }
    if (!piano_id) {
      const { data: m2, error: m2Err } = await supabase
        .from("piani_store_map")
        .select("piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .is("store_product_plan_id", null)
        .limit(1);
      if (m2Err) ERR("Map2 error", m2Err);
      if (m2 && m2.length) piano_id = m2[0].piano_id;
    }

    if (!piano_id) {
      // diagnostica
      const { data: dump } = await supabase
        .from("piani_store_map")
        .select("platform, store_product_id, store_product_plan_id, piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .limit(50);
      ERR("Missing mapping in piani_store_map", {
        platform,
        store_product_id,
        store_product_plan_id,
        existingRows: dump ?? [],
      });
      return NextResponse.json(
        {
          ok: false,
          error: "Missing mapping in piani_store_map",
          details: { platform, store_product_id, store_product_plan_id },
        },
        { status: 422 }
      );
    }

    // 2) Verifica utente esiste
    const { data: user, error: userErr } = await supabase
      .from("utenti")
      .select("id")
      .eq("id", appUserId)
      .maybeSingle();
    if (userErr || !user) {
      ERR("User not found", { appUserId, userErr });
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // 3) Prepara riga
    const baseRow = {
      utente_id: user.id,
      piano_id,
      stato,
      store_platform: platform,
      store_product_id,
      store_product_plan_id,
      entitlement_id: "elite",
      will_renew,
      store_environment: environment ?? (ent.isSandbox ? "SANDBOX" : "PRODUCTION"),
      management_url: customerInfo.managementURL ?? null,
      latest_purchase_at,
      expires_at,
      store_transaction_id,
      store_receipt_data: customerInfo as unknown as Record<string, unknown>, // Json-compat
      updated_at: new Date().toISOString(),
    };

    const row = ambassador_code ? { ...baseRow, ambassador_code } : baseRow;

    DBG("Row preview", row);

    // 4) Strategia anti-conflitto come nel webhook:
    // 4a) se ho transaction_id, prova update per transazione
    if (store_transaction_id) {
      const { data: byTx } = await supabase
        .from("abbonamenti")
        .select("id")
        .eq("store_transaction_id", store_transaction_id)
        .maybeSingle();
      if (byTx?.id) {
        DBG("Update by TX match", { id: byTx.id });
        const { error: updTx } = await supabase
          .from("abbonamenti")
          .update(row)
          .eq("id", byTx.id);
        if (updTx) {
          ERR("Update by TX failed", updTx);
          return NextResponse.json({ ok: false, error: updTx.message }, { status: 500 });
        }
        return NextResponse.json({ ok: true, path: "update_by_tx" });
      }
    }

    // 4b) se esiste ACTIVE per (utente, piattaforma), update (evito uq_abbonamenti_active_per_platform)
    const { data: activeExisting } = await supabase
      .from("abbonamenti")
      .select("id")
      .eq("utente_id", user.id)
      .eq("store_platform", platform)
      .eq("stato", "active")
      .maybeSingle();

    if (activeExisting?.id) {
      DBG("Update active existing", { id: activeExisting.id });
      const { error: updActive } = await supabase
        .from("abbonamenti")
        .update(row)
        .eq("id", activeExisting.id);
      if (updActive) {
        ERR("Update active failed", updActive);
        return NextResponse.json({ ok: false, error: updActive.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, path: "update_active_existing" });
    }

    // 4c) altrimenti insert
    const { error: insErr } = await supabase.from("abbonamenti").insert(row);
    if (insErr) {
      ERR("Insert failed", insErr);
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path: "insert" });
  } catch (e) {
    const err = e as Error;
    ERR("Unhandled error", { message: err.message });
    return NextResponse.json({ ok: false, error: err.message ?? "Unknown" }, { status: 500 });
  }
}
