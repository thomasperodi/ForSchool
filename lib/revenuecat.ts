"use client";

import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

type Platform = "ios" | "android" | "web";

declare global {
  interface Window {
    Capacitor?: { getPlatform?: () => Platform };
  }
}

const ENTITLEMENT_ID = "elite";
const OFFERING_ID = "default";
const PACKAGE_MONTHLY = "$rc_monthly";

let configured = false;
let listenerAttached = false;
let currentUserId: string | null = null;

function getPlatform(): Platform {
  try {
    const p = window?.Capacitor?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {}
  return "web";
}

function getRCKeyForPlatform(): string {
  const p = getPlatform();
  if (p === "ios") return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (p === "android") return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

function isEntitlementActive(info: CustomerInfo | null, id: string): boolean {
  return !!info?.entitlements?.active?.[id]?.isActive;
}

async function syncToBackend(userId: string, info: CustomerInfo) {
  try {
    const ent = info.entitlements?.all?.[ENTITLEMENT_ID];
    await fetch("/api/subscription/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appUserId: userId,
        environment: ent?.isSandbox ? "SANDBOX" : "PRODUCTION",
        customerInfo: info,
      }),
    });
  } catch (e) {
    console.warn("[RC] syncToBackend failed:", e);
  }
}

/** Inizializza RC con userId stabile e attiva sync DB. */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (getPlatform() === "web") return;
  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  currentUserId = userId;
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

  if (!configured) {
    await Purchases.configure({ apiKey, appUserID: userId }); // niente anonimo
    configured = true;
  } else {
    // se eri anonimo fai merge
    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      await syncToBackend(userId, customerInfo);
    } catch (err) {
      console.error("[RC] Errore in logIn:", err);
    }
  }

  if (!listenerAttached) {
    Purchases.addCustomerInfoUpdateListener(async (customerInfo: CustomerInfo) => {
      if (currentUserId) await syncToBackend(currentUserId, customerInfo);
    });
    listenerAttached = true;
  }

  // sync iniziale
  try {
    const infoResp = await Purchases.getCustomerInfo();
    const info = infoResp.customerInfo; // <-- destructuring esplicito
    await syncToBackend(userId, info);
  } catch (e) {
    console.warn("[RC] getCustomerInfo init error:", e);
  }
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const infoResp = await Purchases.getCustomerInfo();
    const info = infoResp.customerInfo; // <-- qui
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] isEliteActive error:", e);
    return false;
  }
}

export async function getEliteLocalizedPrice(): Promise<number | null> {
  if (getPlatform() === "web") return null;
  try {
    const offerings: PurchasesOfferings = await Purchases.getOfferings();
    const off: PurchasesOffering | null =
      offerings.all?.[OFFERING_ID] ?? offerings.current ?? null;

    const pkg: PurchasesPackage | undefined =
      off?.availablePackages.find((p) => p.identifier === PACKAGE_MONTHLY) ??
      off?.availablePackages[0];
    if (!pkg) return null;

    const priceString = pkg.product.priceString; // es. "7,99 €"
    const match = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  } catch {
    return null;
  }
}

type PurchaseResult = {
  productIdentifier: string;
  customerInfo: CustomerInfo;
  transaction?: {
    transactionIdentifier?: string;
    productIdentifier?: string;
    purchaseDateMillis?: number;
    purchaseDate?: string;
  };
};

export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const offerings = await Purchases.getOfferings();
    const off = offerings.all?.[OFFERING_ID] ?? offerings.current ?? null;
    const pkg =
      off?.availablePackages.find((p) => p.identifier === PACKAGE_MONTHLY) ??
      off?.availablePackages[0];
    if (!pkg) throw new Error("Nessun package disponibile");

    const res = (await Purchases.purchasePackage({ aPackage: pkg })) as PurchaseResult; // <-- tipizzato
    const info = res.customerInfo;
    if (currentUserId) await syncToBackend(currentUserId, info);
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] purchaseElite error:", e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const restoreResp = await Purchases.restorePurchases();
    const info = restoreResp.customerInfo; // <-- qui
    if (currentUserId) await syncToBackend(currentUserId, info);
    return isEntitlementActive(info, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] restorePurchases error:", e);
    return false;
  }
}

/** Logout app: scollega l’utente RC. */
export async function onSignOut(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[RC] logOut error:", e);
  } finally {
    currentUserId = null;
  }
}
