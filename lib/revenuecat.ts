// lib/revenuecat.ts
"use client";

import {
  Purchases,
  LOG_LEVEL,
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import { Capacitor } from "@capacitor/core";

/* =====================
   Costanti di progetto
   ===================== */
type Platform = "ios" | "android" | "web";

const ENTITLEMENT_ID = "elite";
const DEFAULT_OFFERING_ID = "default";
const PKG_MONTHLY = "$rc_monthly"; // package standard (consigliato tenere questo)

// Stato interno RC
let configured = false;
let listenerAttached = false;
let currentUserId: string | null = null;

/* ============================================================
   SHIM COMPATIBILI REVENUECAT (senza any)
   ============================================================ */
type PurchasesConfigureArg = string | { apiKey: string; appUserID?: string | null };
type PurchasesLogInArg = string | { appUserID: string };
type PurchasesSetLogLevelArg = LOG_LEVEL | { level: LOG_LEVEL };
type PurchasesCustomerInfoWrapped = { customerInfo: CustomerInfo };

type PurchasesLike = {
  configure(arg: PurchasesConfigureArg): Promise<void>;
  logIn(arg: PurchasesLogInArg): Promise<CustomerInfo | PurchasesCustomerInfoWrapped>;
  logOut(): Promise<void>;
  getCustomerInfo(): Promise<CustomerInfo | PurchasesCustomerInfoWrapped>;
  getAppUserID(): Promise<string>;
  setLogLevel(arg: PurchasesSetLogLevelArg): Promise<void>;
  setAttributes(attrs: Record<string, string | null>): Promise<void>;
  addCustomerInfoUpdateListener(cb: (ci: CustomerInfo | PurchasesCustomerInfoWrapped) => void): void;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(arg: { aPackage: PurchasesPackage }): Promise<
    { productIdentifier: string; customerInfo: CustomerInfo } |
    { productIdentifier: string; customerInfo: CustomerInfo }
  >;
  restorePurchases(): Promise<
    CustomerInfo | PurchasesCustomerInfoWrapped | { productIdentifier?: string; customerInfo: CustomerInfo }
  >;

  // iOS 14+: sheet di riscatto codice offerta (se esposta dal plugin)
  presentCodeRedemptionSheet?: () => Promise<void>;
};

const P = Purchases as unknown as PurchasesLike;

/* =========
   Type guards
   ========= */
function isCustomerInfo(x: unknown): x is CustomerInfo {
  return typeof x === "object" && x !== null && "entitlements" in x;
}
function isWrappedCustomerInfo(x: unknown): x is PurchasesCustomerInfoWrapped {
  return typeof x === "object" && x !== null && "customerInfo" in x;
}

/** setLogLevel: prova enum diretto, poi oggetto { level } */
async function setLogLevelSafe(level: LOG_LEVEL) {
  try {
    await P.setLogLevel(level);
  } catch {
    await P.setLogLevel({ level });
  }
}

/** configure: prova oggetto { apiKey, appUserID? }, fallback a stringa */
async function rcSafeConfigure(apiKey: string, appUserID?: string | null) {
  try {
    await P.configure({ apiKey, appUserID: appUserID ?? undefined });
  } catch {
    await P.configure(apiKey);
  }
}

/** logIn: prova oggetto { appUserID }, fallback a stringa */
async function rcSafeLogIn(appUserId: string) {
  try {
    await P.logIn({ appUserID: appUserId });
  } catch {
    await P.logIn(appUserId);
  }
}

/** getCustomerInfo: normalizza a CustomerInfo “puro” */
async function rcSafeGetCustomerInfo(): Promise<CustomerInfo> {
  const raw = await P.getCustomerInfo();
  if (isCustomerInfo(raw)) return raw;
  if (isWrappedCustomerInfo(raw)) return raw.customerInfo;
  throw new Error("Unexpected shape from Purchases.getCustomerInfo()");
}

/* =========
   Helpers
   ========= */
function getPlatform(): Platform {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {
    /* ignore */
  }
  return "web";
}
const isIOS = () => getPlatform() === "ios";
const isAndroid = () => getPlatform() === "android";

function getRCKeyForPlatform(): string {
  if (isIOS()) return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (isAndroid()) return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

/** alcune definizioni RC tipizzano entitlements.active come Record<string, unknown>. */
type RCActiveEntry = { isActive?: boolean };

function entitlementActive(info: CustomerInfo | null, id: string): boolean {
  const active = info?.entitlements?.active as Record<string, RCActiveEntry> | undefined;
  return Boolean(active?.[id]?.isActive);
}

function parsePriceFromString(priceString: string): number | null {
  // gestisce "7,99 €", "€7.99", "US$7.99"
  const m = priceString.replace(",", ".").match(/([0-9]+(\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
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
  } catch (e: unknown) {
    console.warn("[RC] syncToBackend failed:", e);
  }
}

/* =================================================
   Offerings con retry (utile per code 23)
   ================================================= */
async function safeGetOfferings(maxRetries = 3): Promise<PurchasesOfferings> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const offerings = await P.getOfferings();
      return offerings;
    } catch (e: unknown) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw (lastErr ?? new Error("getOfferings failed"));
}

/* =============================================
   Selezione package dall’offering con fallback
   ============================================= */
function pickPackage(
  off: PurchasesOffering | null | undefined,
  preferredIds: string[] = []
): PurchasesPackage | null {
  if (!off) return null;

  for (const id of preferredIds) {
    const hit = off.availablePackages.find((p) => p.identifier === id);
    if (hit) return hit;
  }
  return off.availablePackages[0] ?? null;
}

/* ==========================
   API pubbliche del modulo
   ========================== */

/** Ritorna l'App User ID corrente (o null su web) */
export async function rcGetAppUserId(): Promise<string | null> {
  if (getPlatform() === "web") return null;
  try {
    const id = await P.getAppUserID();
    return id ?? null;
  } catch {
    return null;
  }
}

/** Ritorna il CustomerInfo corrente (o null su web) */
export async function rcGetCustomerInfo(): Promise<CustomerInfo | null> {
  if (getPlatform() === "web") return null;
  try {
    return await rcSafeGetCustomerInfo();
  } catch {
    return null;
  }
}

/** Esegue logOut → diventi utente anonimo “vergine”.
 *  Ritorna il nuovo App User ID anonimo.
 */
export async function rcLogoutNewAnon(): Promise<string | null> {
  if (getPlatform() === "web") return null;
  try {
    await P.logOut(); // RC ora usa un nuovo anonymous user ID
  } catch {
    // ignora eventuali errori se già anonimo
  }
  currentUserId = null;
  try {
    const id = await P.getAppUserID();
    return id ?? null;
  } catch {
    return null;
  }
}

/** Forza login con un App User ID specifico (utile per “versionare” i tester) */
export async function rcLoginWithId(appUserId: string): Promise<string> {
  if (getPlatform() === "web") return appUserId;
  const trimmed = appUserId.trim();
  if (!trimmed) throw new Error("appUserId non valido");

  await rcSafeLogIn(trimmed);
  currentUserId = trimmed;

  try {
    const ci = await rcSafeGetCustomerInfo();
    await syncToBackend(trimmed, ci);
  } catch {
    /* ignore */
  }

  return trimmed;
}

/** Set di attributi utente (es. ambassador_code come semplice metadato, NON promo) */
export async function rcSetAttributes(attrs: Record<string, string | null>) {
  if (getPlatform() === "web") return;
  await P.setAttributes(attrs);
}

/** Inizializza RC (userId stabile) e listener sync */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (getPlatform() === "web") return;

  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  currentUserId = userId;

  await setLogLevelSafe(LOG_LEVEL.DEBUG);

  if (!configured) {
    await rcSafeConfigure(apiKey, userId);
    configured = true;
  } else {
    try {
      await rcSafeLogIn(userId);
      const ci = await rcSafeGetCustomerInfo();
      await syncToBackend(userId, ci);
    } catch (err: unknown) {
      console.error("[RC] logIn error:", err);
    }
  }

  if (!listenerAttached) {
    P.addCustomerInfoUpdateListener(async (customerInfoLike) => {
      try {
        const ci = isCustomerInfo(customerInfoLike)
          ? customerInfoLike
          : isWrappedCustomerInfo(customerInfoLike)
          ? customerInfoLike.customerInfo
          : null;
        if (ci && currentUserId) await syncToBackend(currentUserId, ci);
      } catch (e: unknown) {
        console.warn("[RC] listener normalize error:", e);
      }
    });
    listenerAttached = true;
  }

  // sync iniziale
  try {
    const ci = await rcSafeGetCustomerInfo();
    await syncToBackend(userId, ci);
  } catch (e: unknown) {
    console.warn("[RC] getCustomerInfo init error:", e);
  }
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const ci = await rcSafeGetCustomerInfo();
    return entitlementActive(ci, ENTITLEMENT_ID);
  } catch (e: unknown) {
    console.error("[RC] isEliteActive error:", e);
    return false;
  }
}

/** Prezzo localizzato del pacchetto mensile (per UI) */
export async function getEliteLocalizedPrice(): Promise<number | null> {
  if (getPlatform() === "web") return null;
  try {
    const offerings = await safeGetOfferings();
    const off =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;

    const pkg = pickPackage(off, [PKG_MONTHLY]);
    if (!pkg) return null;

    return parsePriceFromString(pkg.product.priceString);
  } catch {
    return null;
  }
}

/** Alias comodo per la UI (compat con Abbonamenti.tsx proposto) */
export async function getDisplayedPrice(): Promise<number | null> {
  return getEliteLocalizedPrice();
}

/** Acquisto del pacchetto mensile standard.
 *  Eventuali sconti Apple (Intro/Promotional/Offer Codes) vengono applicati
 *  automaticamente da StoreKit: qui non serve nessuna “promo” custom.
 */
export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;

  try {
    const offerings = await safeGetOfferings();
    const off =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;

    const pkg = pickPackage(off, [PKG_MONTHLY]);
    if (!pkg) throw new Error("Nessun package disponibile");

    const raw = await P.purchasePackage({ aPackage: pkg });
    const res = isCustomerInfo(raw)
      ? { productIdentifier: "", customerInfo: raw }
      : isWrappedCustomerInfo(raw)
      ? { productIdentifier: "", customerInfo: raw.customerInfo }
      : (raw as { productIdentifier: string; customerInfo: CustomerInfo });

    if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
    return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
  } catch (e: unknown) {
    const msg =
      typeof e === "object" && e !== null
        ? (e as { errorMessage?: string; message?: string }).errorMessage ||
          (e as { message?: string }).message ||
          String(e)
        : String(e);
    console.error("[RC] purchaseElite error:", msg);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const raw = await P.restorePurchases();
    const ci = isCustomerInfo(raw)
      ? raw
      : isWrappedCustomerInfo(raw)
      ? raw.customerInfo
      : (raw as { productIdentifier?: string; customerInfo: CustomerInfo })
          .customerInfo;

    if (currentUserId) await syncToBackend(currentUserId, ci);
    return entitlementActive(ci, ENTITLEMENT_ID);
  } catch (e: unknown) {
    console.error("[RC] restorePurchases error:", e);
    return false;
  }
}

/** Logout RC */
export async function onSignOut(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    await P.logOut();
  } catch (e: unknown) {
    console.warn("[RC] logOut error:", e);
  } finally {
    currentUserId = null;
  }
}

/* ============================================
   iOS: redemption ufficiale dei codici offerta
   ============================================ */
export async function presentOfferCodeRedemption(): Promise<void> {
  if (!isIOS()) return;
  if (typeof P.presentCodeRedemptionSheet === "function") {
    // Plugin RevenueCat espone direttamente la sheet
    await P.presentCodeRedemptionSheet();
    return;
  }
  // In caso il plugin non esponga il metodo:
  // - crea un mini plugin Capacitor iOS che richiama:
  //   if #available(iOS 14.0, *) { SKPaymentQueue.default().presentCodeRedemptionSheet() }
  // e invocalo qui. (Questo placeholder evita crash.)
  console.warn("[RC] presentCodeRedemptionSheet non disponibile nel plugin corrente.");
}
