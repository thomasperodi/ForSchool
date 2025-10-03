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
const PKG_MONTHLY = "$rc_monthly";            // standard
const PKG_MONTHLY_PROMO = "$rc_monthly_promo"; // eventuale promo

let configured = false;
let listenerAttached = false;
let currentUserId: string | null = null;

/** Stato promo (solo in sessione) */
let promo = {
  code: null as string | null,
  packageId: null as string | null,    // es. "$rc_monthly_promo"
  offeringId: DEFAULT_OFFERING_ID as string,
};

/* =========
   Helpers
   ========= */
function getPlatform(): Platform {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
  } catch {}
  return "web";
}
const isIOS = () => getPlatform() === "ios";
const isAndroid = () => getPlatform() === "android";

function getRCKeyForPlatform(): string {
  if (isIOS()) return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";
  if (isAndroid()) return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
  return "";
}

function entitlementActive(info: CustomerInfo | null, id: string): boolean {
  return !!info?.entitlements?.active?.[id]?.isActive;
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
  } catch (e) {
    console.warn("[RC] syncToBackend failed:", e);
  }
}

/* =================================================
   Offerings (corretto) + retry per code 23
   ================================================= */
async function safeGetOfferings(maxRetries = 3): Promise<PurchasesOfferings> {
  let lastErr: unknown = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // IMPORTANTISSIMO: Purchases.getOfferings() ritorna PurchasesOfferings
      const offerings = await Purchases.getOfferings();
      return offerings;
    } catch (e: unknown) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr ?? new Error("getOfferings failed");
}

/* =============================================
   Selezione package da un offering (con fallback)
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

/* ===================================
   Ricerca package per identifier globale
   =================================== */
async function findPackageByIdentifier(opts: {
  offeringId?: string;
  packageIdentifier: string; // es. "$rc_monthly_promo"
}): Promise<PurchasesPackage | null> {
  const offerings = await safeGetOfferings();

  // 1) offering richiesto o corrente
  const primary: PurchasesOffering | null =
    (opts.offeringId ? offerings.all?.[opts.offeringId] : null) ??
    offerings.current ??
    null;

  if (primary) {
    const hit = primary.availablePackages.find(
      (p) => p.identifier === opts.packageIdentifier
    );
    if (hit) return hit;
  }

  // 2) cerca ovunque
  for (const off of Object.values(offerings.all ?? {})) {
    const hit = off?.availablePackages.find(
      (p) => p.identifier === opts.packageIdentifier
    );
    if (hit) return hit ?? null;
  }

  // 3) dump di debug
  const dump = {
    currentOfferingId: offerings.current?.identifier ?? null,
    currentPackages: offerings.current?.availablePackages.map((p) => p.identifier) ?? [],
    allOfferings: Object.fromEntries(
      Object.entries(offerings.all ?? {}).map(([k, v]) => [
        k,
        v?.availablePackages.map((p) => p.identifier) ?? [],
      ])
    ),
  };
  console.warn("[RC] Package non trovato:", opts.packageIdentifier, dump);
  return null;
}

/* ==========================
   API pubbliche del modulo
   ========================== */

/** Inizializza RC (userId stabile) e listener sync */
export async function configureRevenueCat(userId: string): Promise<void> {
  if (getPlatform() === "web") return;

  const apiKey = getRCKeyForPlatform();
  if (!apiKey) throw new Error("RevenueCat API key mancante");

  currentUserId = userId;
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

  if (!configured) {
    await Purchases.configure({ apiKey, appUserID: userId });
    configured = true;
  } else {
    try {
      const { customerInfo } = await Purchases.logIn({ appUserID: userId });
      await syncToBackend(userId, customerInfo);
    } catch (err) {
      console.error("[RC] logIn error:", err);
    }
  }

  if (!listenerAttached) {
    Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
      if (currentUserId) await syncToBackend(currentUserId, customerInfo);
    });
    listenerAttached = true;
  }

  // sync iniziale
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    await syncToBackend(userId, customerInfo);
  } catch (e) {
    console.warn("[RC] getCustomerInfo init error:", e);
  }
}

export async function isEliteActive(): Promise<boolean> {
  if (getPlatform() === "web") return false;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return entitlementActive(customerInfo, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] isEliteActive error:", e);
    return false;
  }
}

/** Prezzo del pacchetto mensile standard */
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

/** Helper per ottenere il prezzo di un package specifico (es. promo) */
export async function getPriceForPackage(
  offeringId: string,
  packageIdentifier: string
): Promise<number | null> {
  if (getPlatform() === "web") return null;
  const pkg = await findPackageByIdentifier({ offeringId, packageIdentifier });
  return pkg ? parsePriceFromString(pkg.product.priceString) : null;
}

/** Imposta/valida un codice promo sul backend e salva il package da usare */
export async function setPromoCode(
  code: string | null
): Promise<{ valid: boolean; message?: string }> {
  if (getPlatform() === "web") {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Promo non gestita sul web via RC" };
  }
  if (!code || !currentUserId) {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Codice mancante o utente non loggato" };
  }

  try {
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        userId: currentUserId,
        platform: getPlatform(), // 'ios' | 'android'
      }),
    });
    const data = (await res.json()) as {
      valid: boolean;
      message?: string;
      packageId?: string;
      offeringId?: string;
    };

    if (!res.ok || !data.valid || !data.packageId) {
      promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
      return { valid: false, message: data?.message ?? "Codice non valido" };
    }

    promo = {
      code: code.trim(),
      packageId: data.packageId,
      offeringId: data.offeringId ?? DEFAULT_OFFERING_ID,
    };
    return { valid: true, message: data.message ?? "Codice valido" };
  } catch {
    promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
    return { valid: false, message: "Errore di validazione" };
  }
}

export function clearPromoCode() {
  promo = { code: null, packageId: null, offeringId: DEFAULT_OFFERING_ID };
}

/** Acquisto esplicito di un package per identifier (usato dalla UI quando c'è promo) */
export async function purchasePackageByIdentifier(params: {
  packageIdentifier: string; // es. "$rc_monthly_promo"
  offeringId?: string;       // default "default"
}): Promise<boolean> {
  if (getPlatform() === "web") return false;

  const pkg = await findPackageByIdentifier({
    packageIdentifier: params.packageIdentifier,
    offeringId: params.offeringId ?? DEFAULT_OFFERING_ID,
  });
  if (!pkg) throw new Error("Package non trovato");

  const res = (await Purchases.purchasePackage({ aPackage: pkg })) as {
    productIdentifier: string;
    customerInfo: CustomerInfo;
  };

  if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
  return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
}

/** Acquisto Elite. Se promo valida → compra package promo, altrimenti standard. */
export async function purchaseElite(): Promise<boolean> {
  if (getPlatform() === "web") return false;

  try {
    const offerings = await safeGetOfferings();

    // 1) Se ho promo attiva, provo quel package
    if (promo.packageId) {
      const pkgPromo = await findPackageByIdentifier({
        packageIdentifier: promo.packageId,
        offeringId: promo.offeringId,
      });

      if (pkgPromo) {
        const res = (await Purchases.purchasePackage({ aPackage: pkgPromo })) as {
          productIdentifier: string;
          customerInfo: CustomerInfo;
        };
        if (currentUserId) await syncToBackend(currentUserId, res.customerInfo);
        return entitlementActive(res.customerInfo, ENTITLEMENT_ID);
      }

      console.warn("[RC] Promo package non presente, fallback a standard");
    }

    // 2) Fallback standard: default → $rc_monthly
    const off =
      offerings.all?.[DEFAULT_OFFERING_ID] ?? offerings.current ?? null;
    const pkg = pickPackage(off, [PKG_MONTHLY, PKG_MONTHLY_PROMO]);

    if (!pkg) throw new Error("Nessun package disponibile");

    const res = (await Purchases.purchasePackage({ aPackage: pkg })) as {
      productIdentifier: string;
      customerInfo: CustomerInfo;
    };
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
    const { customerInfo } = await Purchases.restorePurchases();
    if (currentUserId) await syncToBackend(currentUserId, customerInfo);
    return entitlementActive(customerInfo, ENTITLEMENT_ID);
  } catch (e) {
    console.error("[RC] restorePurchases error:", e);
    return false;
  }
}

/** Logout: scollega RC e resetta promo */
export async function onSignOut(): Promise<void> {
  if (getPlatform() === "web") return;
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn("[RC] logOut error:", e);
  } finally {
    currentUserId = null;
    clearPromoCode();
  }
}

/* =====
   Utils
   ===== */
export async function getActivePromoPriceForUI(): Promise<number | null> {
  if (!promo.packageId || getPlatform() === "web") return null;
  const pkg = await findPackageByIdentifier({
    packageIdentifier: promo.packageId,
    offeringId: promo.offeringId,
  });
  return pkg ? parsePriceFromString(pkg.product.priceString) : null;
}

export function getPromoState() {
  return { ...promo };
}
