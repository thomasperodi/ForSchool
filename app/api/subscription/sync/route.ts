// app/api/subscription/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type RCEentitlement = {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  latestPurchaseDate?: string | null;
  expirationDate?: string | null;
  store?: "PLAY_STORE" | "APP_STORE" | string | null;
  productIdentifier?: string | null;
  productPlanIdentifier?: string | null;
  isSandbox?: boolean;
  verification?: string | null;
};

type RCSubscriptionsByProduct = Record<string, { storeTransactionId?: string | null }>;

type CustomerInfo = {
  entitlements: {
    all?: Record<string, RCEentitlement>;
    active?: Record<string, unknown>;
    verification?: string;
  };
  subscriptionsByProductIdentifier?: RCSubscriptionsByProduct;
  managementURL?: string | null;
};

function toPlatform(store?: string | null): "play" | "appstore" | null {
  if (store === "PLAY_STORE") return "play";
  if (store === "APP_STORE") return "appstore";
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { appUserId, customerInfo, environment } = (await req.json()) as {
      appUserId: string;
      customerInfo: CustomerInfo;
      environment?: "SANDBOX" | "PRODUCTION";
    };

    if (!appUserId || !customerInfo) {
      return NextResponse.json({ ok: false, error: "Missing appUserId or customerInfo" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE!
    );

    const ent = customerInfo.entitlements?.all?.["elite"];
    if (!ent) return NextResponse.json({ ok: true, skipped: "no-elite" });

    const platform = toPlatform(ent.store);
    const store_product_id = ent.productIdentifier ?? null;
    const store_product_plan_id = ent.productPlanIdentifier ?? null;

    const store_transaction_id =
      (store_product_id &&
        customerInfo.subscriptionsByProductIdentifier?.[store_product_id]?.storeTransactionId) ||
      null;

    const isActive = Boolean(ent.isActive);
    const stato: "active" | "expired" | "cancelled" | "paused" = isActive ? "active" : "expired";

    const latest_purchase_at = ent.latestPurchaseDate ?? null;
    const expires_at = ent.expirationDate ?? null;

    // mappa -> piano_id
    let piano_id: string | null = null;
    if (platform && store_product_id) {
      const { data: map1 } = await supabase
        .from("piani_store_map")
        .select("piano_id")
        .eq("platform", platform)
        .eq("store_product_id", store_product_id)
        .eq("store_product_plan_id", store_product_plan_id ?? "")
        .limit(1);

      if (map1 && map1.length > 0) {
        piano_id = map1[0].piano_id;
      } else {
        const { data: map2 } = await supabase
          .from("piani_store_map")
          .select("piano_id")
          .eq("platform", platform)
          .eq("store_product_id", store_product_id)
          .is("store_product_plan_id", null)
          .limit(1);
        if (map2 && map2.length > 0) piano_id = map2[0].piano_id;
      }
    }

    if (!piano_id) {
      return NextResponse.json(
        { ok: false, error: "Missing mapping in piani_store_map", details: { platform, store_product_id, store_product_plan_id } },
        { status: 422 }
      );
    }

    const safeReceipt: Json = JSON.parse(JSON.stringify(customerInfo));

    const row = {
      utente_id: appUserId,
      piano_id,
      stato,
      store_platform: platform,
      store_product_id,
      store_product_plan_id,
      entitlement_id: "elite",
      will_renew: Boolean(ent.willRenew),
      store_environment: environment ?? (ent.isSandbox ? "SANDBOX" : "PRODUCTION"),
      management_url: customerInfo.managementURL ?? null,
      latest_purchase_at,
      expires_at,
      store_transaction_id,
      store_receipt_data: safeReceipt,
      updated_at: new Date().toISOString(),
    };

    // upsert per (utente, piattaforma)
    const { data: existing } = await supabase
      .from("abbonamenti")
      .select("id")
      .eq("utente_id", appUserId)
      .eq("store_platform", platform)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await supabase
        .from("abbonamenti")
        .update(row)
        .eq("id", existing.id);
      if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    } else {
      const { error: insErr } = await supabase
        .from("abbonamenti")
        .insert(row);
      if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as Error;
    // eslint-disable-next-line no-console
    console.error("[SYNC] route error:", err.message);
    return NextResponse.json({ ok: false, error: err.message ?? "Unknown" }, { status: 500 });
  }
}
