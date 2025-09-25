// lib/revenuecat.ts
"use client";

import {
  Purchases,
  LOG_LEVEL,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

type Platform = "ios" | "android" | "web";

/* === DICHIARAZIONE GLOBALE PER CAPACITOR === */
declare global {
  interface Window {
    Capacitor?: { getPlatform?: () => Platform };
  }
}

/* === COSTANTI === */
const ENTITLEMENT_ID = "elite"; // deve coincidere con l'entitlement su RevenueCat
const OFFERING_ID = "default";  // nome dell'offering
const PACKAGE_MONTHLY = "$rc_monthly"; // id del package configurato in RevenueCat

/* === UTILS === */
function getPlatform(): Platform {
  try {
    const p = window?.Capacitor?.getPlatform?.();
    if (p === "ios" || p === "android") return p;
  } catch {}
  return "web";
}

function getRCKeyForPlatform(): string {
  const p = getPlatform();
  if (p === "ios")
    return (
      process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ??
      process.env.REVENUECAT_IOS_KEY ??
      ""
    );
  if (p === "android")
    return (
      process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ??
      process.env.REVENUECAT_ANDROID_KEY ??
      ""
    );
  return "";
}

function isEntitlementActive(info: CustomerInfo | null, id: string): boolean {
  if (!info) return false;
  return Boolean(info.entitlements.active[id]);
}

/* === API === */
export async function configureRevenueCat(userId?: string): Promise<void> {
  if (getPlatform() === "web") return;

  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey, appUserID: userId });
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return isEntitlementActive(customerInfo, ENTITLEMENT_ID);
  } catch {
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

    const priceString = pkg?.product.priceString;
    if (!priceString) return null;

    const match = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : null;
  } catch (e) {
    console.warn("getEliteLocalizedPrice error:", e);
    return null;
  }
}

export async function debugOfferings(): Promise<void> {
  try {
    const offerings = await Purchases.getOfferings();
    console.log("RevenueCat Offerings:", JSON.stringify(offerings, null, 2));
  } catch (e) {
    console.error("Error fetching offerings:", e);
  }
}

export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const offerings = await Purchases.getOfferings();
    const off = offerings.all?.[OFFERING_ID] ?? offerings.current ?? null;
    const pkg =
      off?.availablePackages.find((p) => p.identifier === PACKAGE_MONTHLY) ??
      off?.availablePackages[0];

    if (!pkg) throw new Error("Nessun package disponibile");

    // ⚠️ qui serve passare { aPackage: pkg }
    const purchase = await Purchases.purchasePackage({ aPackage: pkg });
    return isEntitlementActive(purchase.customerInfo, ENTITLEMENT_ID);
  } catch (e) {
    console.error("purchaseElite error:", e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return isEntitlementActive(customerInfo, ENTITLEMENT_ID);
  } catch {
    return false;
  }
}
