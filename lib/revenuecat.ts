// lib/revenuecat.ts
"use client";

import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

type RevenueCatError = { userCancelled?: boolean; code?: string | number; message?: string };

const ENTITLEMENT_ID = "elite"; // deve coincidere con l'entitlement su RevenueCat

// IMPORTANT: su Next.js lato client le chiavi devono essere NEXT_PUBLIC_*
const RC_IOS_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ??
  process.env.REVENUECAT_IOS_KEY ?? // fallback se buildi native senza Next
  "";

const RC_ANDROID_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ??
  process.env.REVENUECAT_ANDROID_KEY ??
  "";

// evita doppi configure
let configured = false;

function getPlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android" || p === "web") return p;
  } catch {}
  return "web";
}

function getApiKey(): string {
  const p = getPlatform();
  if (p === "ios") return RC_IOS_KEY;
  if (p === "android") return RC_ANDROID_KEY;
  return "";
}

/** Configura RevenueCat SOLO su iOS/Android (Capacitor). Idempotente. */
export async function configureRevenueCat(appUserID?: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    // web -> niente RC
    return;
  }
  if (configured) return;

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey, appUserID });
  Purchases.addCustomerInfoUpdateListener(() => {
    // se vuoi, qui puoi emettere un event/bus o aggiornare stato globale
  });
  configured = true;
}

/** Seleziona il package con fallback robusto */
function pickPackage(
  current: NonNullable<PurchasesOfferings["current"]>,
  usePromo: boolean
): PurchasesPackage | undefined {
  const byId = (id: string) => current.availablePackages.find(p => p.identifier === id);

  const desiredPromo: PurchasesPackage | undefined = usePromo
    ? (byId("monthly_promo") ?? byId("promo"))
    : undefined;

  return desiredPromo ?? byId("monthly") ?? current.availablePackages[0];
}

/** Acquisto piano Elite: ritorna true se l’entitlement `elite` risulta attivo */
export async function purchaseElite(usePromo = false): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("purchaseElite chiamato su web o senza API key.");
  await configureRevenueCat(); // safe in caso non fosse ancora configurato

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current || !current.availablePackages?.length) {
      throw new Error("Nessun offering corrente disponibile in RevenueCat.");
    }
    const target = pickPackage(current, usePromo);
    if (!target) throw new Error("Nessun package valido trovato nell’offering.");

    const { customerInfo }: { customerInfo: CustomerInfo } =
      await Purchases.purchasePackage({ aPackage: target });

    return Boolean(customerInfo.entitlements.active?.[ENTITLEMENT_ID]);
  } catch (e: unknown) {
    const err = e as RevenueCatError;
    if (err?.userCancelled) {
      console.log("[RevenueCat] acquisto annullato dall’utente");
    } else {
      console.error("[RevenueCat] purchase error:", err?.message ?? e);
    }
    return false;
  }
}

/** True se l’entitlement `elite` è attivo (app-only) */
export async function isEliteActive(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  await configureRevenueCat();

  try {
    const { customerInfo }: { customerInfo: CustomerInfo } = await Purchases.getCustomerInfo();
    return Boolean(customerInfo.entitlements.active?.[ENTITLEMENT_ID]);
  } catch (e) {
    console.warn("[RevenueCat] getCustomerInfo error:", e);
    return false;
  }
}

/** Ripristina acquisti (iOS sandbox e reinstall) */
export async function restorePurchases(): Promise<boolean> {
  const apiKey = getApiKey();
  if (!apiKey) return false;
  await configureRevenueCat();

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return Boolean(customerInfo.entitlements.active?.[ENTITLEMENT_ID]);
  } catch (e) {
    console.warn("[RevenueCat] restorePurchases error:", e);
    return false;
  }
}

/** (Opzionale) Prezzi localizzati dall’offering corrente per UI */
export async function getDisplayPrices() {
  const apiKey = getApiKey();
  if (!apiKey) return {};
  await configureRevenueCat();

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return {};
    const out: Record<string, { price: number; currency: string; localized: string }> = {};
    for (const p of current.availablePackages) {
      const sk = p.product;
      out[p.identifier] = {
        price: Number(sk.price),
        currency: sk.currencyCode ?? "",
        localized: sk.priceString ?? "",
      };
    }
    return out;
  } catch (e) {
    console.warn("[RevenueCat] getDisplayPrices error:", e);
    return {};
  }
}
